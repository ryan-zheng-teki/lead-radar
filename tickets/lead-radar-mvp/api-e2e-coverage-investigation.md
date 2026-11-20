# API/E2E Coverage Investigation — lead-radar-mvp

The plan. Results are in `api-e2e-execution-coverage-report.md`.

## Upstream Package Read

- Requirements: `tickets/lead-radar-mvp/requirements-doc.md` (SR-001; AC-001..AC-010, S-001..S-003)
- Design: `tickets/lead-radar-mvp/design-spec.md`, project `DESIGN.md`
- Implementation: `implementation-handoff.md` (IR-001; code 6d763ea, evidence 8242b9d), `implementation-revision-record.md`
- Classification: `Medium` + `Low`, direct route (confirmed by implementation). No code review.
- Legacy / Compatibility check: clean (greenfield). Persisted data: `Discard or Rebuild` (`runs/` gitignored, disposable).

## Project Instructions Found

- Testing guideline: **none existed**. This round writes `/home/autobyteus/workspace/aibuilders-hackday-berlin-2026-11-20/lead-radar-mvp/TESTING.md`.
- README "Run it" section: `git clone …; cp .env.example .env; npm start`; `PORT`, `LEAD_RADAR_ENV_FILE`. `package.json` scripts `start`, `compare`. Zero dependencies, Node ≥ 22, no test runner, no CI or release workflow (no Fresh-Start Build proof needed beyond AC-008).
- Constraint: another session's server is on port 3000 (implementation engineer's); not touched. This run uses port 3001.

## Changed Surfaces

HTTP/API (`server.js`: `/api/config`, `/api/run` NDJSON stream), external integration (Nebius Token Factory, Tavily, live), browser page (`public/*`), configuration/secret handling (`src/config.js`, `.env`), startup (`npm start`).

## Reused Implementation Checks

All ran on 6d763ea; the only later commit (8242b9d) adds docs and evidence, no code (`git diff --name-only 6d763ea 8242b9d` touches only `tickets/`).

| Check | Reused for | Why it still holds |
| --- | --- | --- |
| IMP-02 | AC-001/002/004/005/007 on 3 companies | same code; JSON run files show counts |
| IMP-03 | AC-009 via API | same server.js/profile code |
| IMP-04 | B failure non-blocking | same pipeline |
| IMP-05 | AC-003 approve/edit/reject at desktop width | same UI |
| IMP-06 | AC-006 repo/log scan | repeated at the end on the final commit anyway (API-05) |

## Existing Durable Coverage

None. The repository has no test suite. Decision: `Use Temporary Executable Probe Only`. A hackday MVP with zero dependencies and a 45-minute window before feature freeze; the live pipeline is non-deterministic (LLM + search), so durable assertions would need a mocking layer the design does not include. Recorded in TESTING.md as the manual/live layers.

## Planned Cases

| Case | Scenario | Criteria | Surface | Plan |
| --- | --- | --- | --- | --- |
| API-01 | S-003 | AC-008, AC-006 (.env ignored) | CLI | Fresh `git clone` of the branch into `/tmp/lr-fresh`, `cp .env.example .env`, fill keys (not printed), `PORT=3001 npm start`; `/api/config` 200, `/` 200; `git status` clean |
| API-02 | S-001 | AC-001/002/003/004/005 | Browser (live) | In the fresh-clone app, enter a new judge-style company not in the README (`https://cal.com`), Find leads; time it; check profile+sources, ≥ 8 leads with URL/platform/score/reason/quote/verified, drafts, comparison; Approve, Edit+save, Reject, Copy |
| API-03 | — | AC-006 | API + browser | `/api/config` body and the captured `/api/run` NDJSON stream (teed in the page) grepped for the key values (count only); server log grepped too |
| API-04 | S-001 | AC-003, UI | Browser | Narrow viewport (≈ 390 px, headless Chromium) screenshot of the finished page from the same run's data; clipboard: Copy writes the approved text (`navigator.clipboard.readText()` after granting permission) |
| API-05 | S-002 | AC-009 | Browser | Invalid URL entered on the page shows a readable error; missing-key page banner on a server started with an empty env file |
| API-06 | — | AC-006 | Repo | Secret scan of the final commit (`git grep` for key values and patterns) |

Contrived / not tested: concurrent runs from one user; very long-running sites.
