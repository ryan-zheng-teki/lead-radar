# Testing

How Lead Radar is tested. Read it before validating a change.

## Setup

- Node ≥ 22, no `npm install` (zero dependencies). Run commands from the repository root.
- Keys: `cp .env.example .env` and fill `NEBIUS_API_KEY` and `TAVILY_API_KEY`, or point `LEAD_RADAR_ENV_FILE=/path/to/.env` at an existing file. Never print, log or commit key values.
- Start: `npm start` (or `PORT=3001 npm start` when 3000 is taken by someone else's server; do not stop a server you did not start).

## Test Layers

| Layer | What it proves | Command |
| --- | --- | --- |
| Syntax | every JS file parses | `for f in server.js src/*.js src/steps/*.js public/app.js scripts/*.js; do node --check "$f"; done` |
| Live API run (gated: needs both keys, costs about $0.01–0.04 per run) | the whole pipeline against real Tavily + Nebius | `curl -sN -X POST localhost:3000/api/run -H 'Content-Type: application/json' -d '{"url":"https://example.com"}'` (NDJSON events: `stage`, `profile`, `candidates`, `leads`, `drafts`, `reference`, `comparison`, `done` or `error`) |
| Comparison table | README numbers from saved runs | `npm run compare` (reads `runs/*.json`) |
| Browser journey (gated: keys) | the page: stages, profile, leads, drafts with Approve / Edit / Reject / Copy, comparison | open `http://localhost:3000`, enter a company URL, Find leads |
| Error paths (no cost) | readable errors | invalid or empty URL on the page; a server started with `env -u NEBIUS_API_KEY -u TAVILY_API_KEY LEAD_RADAR_ENV_FILE=/nonexistent PORT=3002 node server.js` |

There is no automated suite. Model and search output is non-deterministic, so assert structure and counts (≥ 8 leads, verified-quote flags, drafts for leads scoring ≥ 5, comparison fields), not wording.

## Fresh-Start Build

There is no CI or release workflow. A fresh start is: `git clone`, `cp .env.example .env`, fill the keys, then `npm start`. Rerun it when any of these change: `package.json`, `server.js`, `src/config.js`, `.env.example`, `.gitignore`, the README "Try it" section.

## Choosing The Layer

- A change to `src/steps/*`, `src/pipeline.js` or `src/nebius.js` needs one live API or browser run on a company that is not in the README.
- A change to `public/*` needs the browser journey. Copy needs a browser with clipboard permission (localhost or https). Check a narrow width (390 px) when you touch the layout.
- A change to key handling (`src/config.js`, `server.js`) needs the secret checks below.
- Replaying a saved NDJSON stream into the page proves only the UI, not the pipeline.

## Environments, Credentials And Data

- Keys come only from `.env` or `LEAD_RADAR_ENV_FILE`. To check for leaks, load the values into shell variables and count matches (`grep -c -F -- "$KEY" file`) in `/api/config`, a captured run stream, server logs, `runs/*.json` and `git grep --untracked`. Never echo them.
- `runs/` holds disposable run files and is gitignored. Copy a run you want as evidence into the ticket's evidence folder.

## Rules

- Stop only the servers you started; leave other ports alone.
- Delete a temporary clone after the run, because it holds a `.env` with real keys.
- Kimi (reference scorer B) can be slow; it is capped at 75 s and does not block leads or drafts. A `scorerError` about the cap is expected behavior, not a failure.

## Evidence

Ticket evidence goes in `tickets/<ticket>/evidence/`. Never commit `.env`, key values, or browser profiles.
