import { useEffect, useState } from "react";
import { getDataUrl } from "../lib/settings";

function EpisodeCard({ episode }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bug-card">
      <div className="bug-card-header" onClick={() => setExpanded((v) => !v)}>
        <div>
          <h3>{episode.bug_label || episode.episode_id}</h3>
          <p className="bug-desc">{episode.summary || "No summary published."}</p>
        </div>
        {episode.pr_url && (
          <a
            className="trigger-btn pr-link"
            href={episode.pr_url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            View PR {episode.pr_number ? `#${episode.pr_number}` : ""}
          </a>
        )}
      </div>
      {expanded && (
        <div className="bug-card-body">
          <div className="explanation-meta">
            {episode.status && <span className="tag">{episode.status}</span>}
            {episode.published_at && (
              <span className="tag muted">
                published {new Date(episode.published_at).toLocaleString()}
              </span>
            )}
          </div>
          <pre className="explanation-text">
            {episode.explanation || "No detailed explanation published for this episode."}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function PrExplanations() {
  const [state, setState] = useState({ status: "idle", episodes: [], error: null });
  const dataUrl = getDataUrl();

  useEffect(() => {
    if (!dataUrl) {
      setState({ status: "no-url", episodes: [], error: null });
      return;
    }
    setState({ status: "loading", episodes: [], error: null });
    fetch(`${dataUrl.replace(/\/$/, "")}/episodes.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((episodes) => setState({ status: "loaded", episodes, error: null }))
      .catch((err) => setState({ status: "error", episodes: [], error: err.message }));
  }, [dataUrl]);

  return (
    <div className="page">
      <h2>PR Explanations</h2>
      <p className="page-intro">
        Reviewer-facing explanations the pipeline publishes when it opens a repair PR —
        fetched from <code>episodes.json</code> at the Dashboard data URL set in Settings.
      </p>

      {state.status === "no-url" && (
        <div className="empty-state">
          Set the Dashboard data URL in Settings (this app's own S3 static-website bucket)
          to load published explanations.
        </div>
      )}
      {state.status === "loading" && <div className="empty-state">Loading…</div>}
      {state.status === "error" && (
        <div className="empty-state error">
          Couldn't load episodes.json ({state.error}). Either nothing has been published yet,
          or the data URL in Settings is wrong.
        </div>
      )}
      {state.status === "loaded" && state.episodes.length === 0 && (
        <div className="empty-state">No episodes published yet.</div>
      )}
      {state.status === "loaded" && state.episodes.length > 0 && (
        <div className="bug-list">
          {state.episodes.map((ep) => (
            <EpisodeCard key={ep.episode_id} episode={ep} />
          ))}
        </div>
      )}
    </div>
  );
}
