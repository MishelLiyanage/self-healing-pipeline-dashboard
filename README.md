# Self-Healing Pipeline Dashboard

React app (Vite) for the self-healing agentic pipeline FYP. Deployed as an S3 static
website — see `infra/deploy.ps1`. Two views:

- **Trigger Exceptions** (`/`) — the 5 bugs seeded into `target-app` (see the
  `bug-seed/*` branches and `RUNBOOK.md` in the `self-healing-pipeline` repo), each with
  its curl command(s) and a button that fires the real request straight at target-app
  from the browser. Triggering one produces a genuine uncaught exception that the
  self-healing pipeline picks up on its own (detection → diagnosis → repair → PR).
- **PR Explanations** (`/explanations`) — reviewer-facing explanations the pipeline
  publishes when it opens a repair PR. A PR body links straight to its own episode via
  `/explanations?episode=<episode_id>`, which auto-expands and scrolls to that card.

Both target-app's URL (its EKS LoadBalancer hostname, which changes every time the
cluster is recreated) and this dashboard's own published-data URL are set at runtime
from the **Settings** panel (top right) and kept in `localStorage` — nothing is baked
into the build.

## Development

```
npm install
npm run dev
```

## Build

```
npm run build   # outputs to dist/
```

## `episodes.json` contract

The PR Explanations page fetches `<dataUrl>/episodes.json` — a JSON array, one entry per
pipeline episode:

```json
[
  {
    "episode_id": "ep_bug1",
    "bug_label": "Bug 1 — NullPointerException normalizing a null SKU",
    "pr_url": "https://github.com/MishelLiyanage/self-healing-pipeline/pull/12",
    "pr_number": 12,
    "status": "opened",
    "published_at": "2026-08-01T12:00:00Z",
    "summary": "One-line summary of what broke and how it was fixed.",
    "explanation": "Full diagnosis + repair explanation text for reviewers."
  }
]
```

This file lives in this app's own S3 bucket, published by `self-healing-pipeline`'s
`agents/agent_service/trust_experiment.py` (`publish_episode()`) whenever `pr_agent.py`
opens a repair PR — it upserts by `episode_id`, so re-running an episode replaces its
old entry rather than duplicating it. Needs `DASHBOARD_S3_BUCKET`/`DASHBOARD_REGION` set
in `self-healing-pipeline`'s `agents/.env` (this repo's `infra/deploy.ps1` prints the
values to use once run).

## Related repo

`target-app`'s `CorsFilter.java` (in `self-healing-pipeline`) needs this app's real S3
website origin added to its allow-list once deployed — see the TODO there.
