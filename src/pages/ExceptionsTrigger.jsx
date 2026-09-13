import { useState } from "react";
import { BUGS, toCurl } from "../lib/bugs";
import { getTargetAppUrl } from "../lib/settings";

function BugCard({ bug }) {
  const [expanded, setExpanded] = useState(false);
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);

  const targetAppUrl = getTargetAppUrl();

  async function trigger() {
    if (!targetAppUrl) {
      setLog([{ label: "error", text: "Set target-app base URL in Settings first." }]);
      setExpanded(true);
      return;
    }
    setRunning(true);
    const entries = [];
    for (const req of bug.requests) {
      try {
        const res = await fetch(`${targetAppUrl.replace(/\/$/, "")}${req.path}`, {
          method: req.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req.body),
        });
        const text = await res.text();
        entries.push({
          label: `${req.label} → ${res.status}`,
          text: text || "(empty response)",
          ok: res.ok || res.status >= 400, // a 4xx/5xx from the trigger step is expected/success here
        });
      } catch (err) {
        entries.push({
          label: `${req.label} → network error`,
          text: `${err.message} — check the URL in Settings, and that target-app's CORS allow-list includes this page's origin.`,
          ok: false,
        });
        break;
      }
    }
    setLog(entries);
    setExpanded(true);
    setRunning(false);
  }

  return (
    <div className="bug-card">
      <div className="bug-card-header" onClick={() => setExpanded((v) => !v)}>
        <div>
          <h3>{bug.title}</h3>
          <p className="bug-desc">{bug.description}</p>
        </div>
        <button
          className="trigger-btn"
          disabled={running}
          onClick={(e) => {
            e.stopPropagation();
            trigger();
          }}
        >
          {running ? "Triggering…" : "Trigger"}
        </button>
      </div>

      {expanded && (
        <div className="bug-card-body">
          <div className="curl-block">
            {bug.requests.map((req, i) => (
              <div key={i} className="curl-line">
                <span className="curl-label">{req.label}</span>
                <pre>{toCurl(targetAppUrl || "$TARGET", req)}</pre>
              </div>
            ))}
          </div>
          {log.length > 0 && (
            <div className="run-log">
              {log.map((entry, i) => (
                <div key={i} className={`run-log-entry ${entry.ok ? "ok" : "fail"}`}>
                  <div className="run-log-label">{entry.label}</div>
                  <pre>{entry.text}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExceptionsTrigger() {
  return (
    <div className="page">
      <h2>Trigger Exceptions</h2>
      <p className="page-intro">
        Each of the 5 seeded bugs below can be fired directly at target-app from here.
        Triggering one produces a genuine uncaught exception, which the self-healing
        pipeline picks up on its own (detection → classification → diagnosis → repair →
        validation → PR) — nothing else to do after clicking Trigger. This takes a few
        minutes end to end (the pipeline runs real LLM calls and Gradle builds, not
        instant), and needs the live-consumer process running — see RUNBOOK.md's
        "Live pipeline" section if nothing shows up. Check the PR Explanations tab after a
        few minutes for the result.
      </p>
      <div className="bug-list">
        {BUGS.map((bug) => (
          <BugCard key={bug.id} bug={bug} />
        ))}
      </div>
    </div>
  );
}
