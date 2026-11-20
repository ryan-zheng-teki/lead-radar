# Lead Radar — Design

## Architecture

- Node ≥ 22, no npm dependencies: global `fetch`, `node:http`. `server.js` is the composition root and HTTP boundary.
- `src/pipeline.js` owns the run sequence (profile → lead search → scoring A ∥ B → drafts → comparison) and emits progress events; steps live in `src/steps/` and never call each other.
- `src/nebius.js` is the only owner of Nebius Token Factory calls (OpenAI-compatible, `https://api.tokenfactory.nebius.com/v1`), including per-model thinking controls and live prices. `src/tavily.js` is the only owner of Tavily calls.
- `public/` is one static page with vanilla JS; human decisions (approve/edit/reject) never trigger sending anything.

## Conventions

- Secrets come only from `.env` (or `LEAD_RADAR_ENV_FILE`); never logged, returned to the browser or committed.
- Every model call sets the model family's thinking control and a generous `max_tokens`; reasoning tokens count toward cost.
- Model output is parsed as the first JSON block, with one retry on failure.
- Every lead shown carries its source URL; quotes are checked verbatim against the source text and marked unverified otherwise.
- Files stay small (< 300 lines), one concern each.

## Design Cases

None yet.
