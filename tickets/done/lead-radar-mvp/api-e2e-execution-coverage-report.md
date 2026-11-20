# API/E2E Execution Coverage Report — lead-radar-mvp

## Round

- Coverage investigation: `tickets/lead-radar-mvp/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/lead-radar-mvp/api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: not used (six short cases in one sitting; all completed)
- Round and trigger: Round 1, direct route from implementation (IR-001)
- Prior round reviewed: N/A
- Deviations from the plan: API-04 ran twice. The first run was live on posthog.com; its clipboard step returned no value. The rerun replayed the saved cal.com NDJSON stream into the real page, so the UI path was exercised without new model calls, and it gave the clipboard result.
- Evidence folder: `/home/autobyteus/workspace/aibuilders-hackday-berlin-2026-11-20/lead-radar-mvp/tickets/lead-radar-mvp/evidence/` (files `API-*`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | 8242b9d (code = 6d763ea) | Linux 6.12 (container) | Fresh `git clone` in `/tmp/lr-fresh`, Node 22.23.3, `PORT=3001 npm start`; `.env` from `.env.example` with the team keys | Live Nebius Token Factory and Tavily; default models |
| ENV-2 | same | same | Agent browser tab (Chromium, 1920 px) on ENV-1 | `window.fetch` wrapped in the page to tee the `/api/run` stream and count requests |
| ENV-3 | same | same | `/usr/bin/chromium --headless=new` driven over raw CDP (`API-04-probe-narrow-clipboard.mjs`) on ENV-1 | 390×844 mobile emulation, `clipboardReadWrite` granted |
| ENV-4 | same | same | `env -u NEBIUS_API_KEY -u TAVILY_API_KEY LEAD_RADAR_ENV_FILE=/nonexistent PORT=3002 node /tmp/lr-fresh/server.js` | No keys |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-008, AC-006 (.env ignored) | CLI / startup | `git clone --branch ticket/lead-radar-mvp <worktree> /tmp/lr-fresh`; `cp .env.example .env`; fill both keys; `PORT=3001 npm start`; `curl /api/config`, `curl /` | ENV-1 | Pass | `API-01-fresh-clone-npm-start.log`, `API-03-api-config.json` | no `node_modules`/`.env` after clone; `git status` empty after `.env` created; server printed `Lead Radar running at http://localhost:3001`; `/` 200; `"missingKeys":[]` | No install step needed (zero deps). `runs/` is created on the first run. |
| API-02 | AC-001, 002, 003, 004, 005 | Browser → API → Tavily/Nebius (live) | Page on ENV-1: URL `https://cal.com` (not in README) → Find leads → wait → inspect profile, leads, drafts, comparison → Approve draft 1, Edit draft 2 (append ` [E2E-EDIT-cal]`) + Save & approve, Reject draft 3 | ENV-2 | Pass | `API-02-calcom-browser-full.png`, `API-02-calcom-run-stream.ndjson`, `API-runs/2026-11-20T13-31-40-725Z-cal.com.json` | stages "done at 8.8 s / 17.4 s / 24.2 s / 29.2 s", "total 29.6 s"; profile with 5 cal.com source links; 20 lead rows, each with a link; 20/20 quotes "✓ verified"; 5 drafts with "Disclosure: I work on Cal.com"; badges "Approved", "Approved (edited)" (text ends `[E2E-EDIT-cal]`), "Rejected"; comparison "A 3340/1136 $0.0011 6.8 s 20/20; B 3350/1369 $0.0204 12.2 s 20/20; 19.1× cheaper; 1.55 mean |A−B|; 3/5 same top 5" | Page made only one request after load (`POST /api/run`); approve/edit/reject/copy made none. |
| API-03 | AC-006 | API response, NDJSON stream, server log, run file | Count matches of the two exact key values, `tvly-`, `bearer` and `api_key` in `/api/config`, the captured cal.com stream, the server log, and the run JSON | ENV-1/2 | Pass | `API-03-key-leak-check.log`, `API-03-api-config.json` | every line reads `NEBIUS value matches=0 TAVILY value matches=0 'tvly-' matches=0 'Bearer' matches=0 'api_key' matches=0` | Key values were read into shell variables only and never printed. |
| API-04 | AC-003 (copy), AC-005, REQ-007 B non-blocking, UI at narrow width | Headless Chromium 390 px | (a) live run on `https://posthog.com` at 390×844; (b) replay of the saved cal.com stream into the real page at 390×844, then Approve draft 1 → Copy → `navigator.clipboard.readText()` | ENV-3 | Pass (with follow-up FU-001) | `API-04-narrow-clipboard.log`, `API-04-narrow-390px.png`, `API-04-narrow-390px-calcom-replay.png`, `API-runs/2026-11-20T13-35-43-423Z-posthog.com.json` | (a) `"leads": 20`, `"drafts": 5`, `"total 86.7 s"`, run file `"scorerError": "Reference scorer moonshotai/Kimi-K3.1-Pro took longer than 75 s; skipped"`; (b) `"buttonText": "Copied"`, `"clipboardEqualsDraft": true`; layout `"innerWidth": 827` with tables `"w": 782 … "parentW": 342` | Live proof that a slow B does not block: B hit the 75 s cap and the run still completed with leads and drafts. Narrow width: no element breaks, but the leads and comparison tables (585–782 px) are wider than their 342 px cards, so a phone lays the page out at about 827 px and zooms it out. No acceptance criterion covers mobile, so this is a follow-up (FU-001), not a failure. Copy always shows "Copied", even when the clipboard write fails (`.catch(() => {})`). |
| API-05 | AC-009 | Browser page → server | Page on ENV-1: type `not a url`, empty, `https://this-domain-does-not-exist-lr9431.com`, then Find leads; page on ENV-4 at load and after Find leads | ENV-2, ENV-4 | Pass | `API-05-page-error-paths.log`, `API-05-missing-keys-page.png` | `"not a url" is not a valid URL.`; `Please enter a company website URL.`; `Could not read the site … Tavily returned no page content and no search results …`; `Missing NEBIUS_API_KEY and TAVILY_API_KEY: copy .env.example to .env …` | Complements IMP-03 (same paths via curl). |
| API-06 | AC-006 | Repository | `git grep --untracked -F <each key value>`, `git grep -E 'tvly-[A-Za-z0-9]{10,}'`, a grep of the evidence folder, `git check-ignore .env` | worktree before the API/E2E commit | Pass | `API-06-secret-scan.log` | `0 files`, `0 files`, `0 files`, `0 lines`, `.env` | Covers the new `API-*` evidence too. |
| IMP-02 (Reused) | AC-001/002/004/005/007 | Live pipeline on 3 companies | Implementation check IMP-02 | — | Pass | — | — | Code unchanged since 6d763ea; API-02 and API-04 repeated it on two new companies. |
| IMP-04 (Reused) | REQ-007/012 | Failing reference scorer | Implementation check IMP-04 | — | Pass | — | — | Same pipeline code; API-04(a) adds a live B timeout. |
| IMP-05 (Reused) | AC-003 | Browser at desktop width | Implementation check IMP-05 | — | Pass | — | — | Same UI; repeated in API-02. |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 profile with sources | Yes | API-02, IMP-02 | Proven | — |
| AC-002 ≥ 8 leads with URL/platform/score/reason/quote/verified | Yes | API-02 (20), API-04 (20), IMP-02 | Proven | — |
| AC-003 approve/edit/reject, edited text kept, nothing posted | Yes | API-02, API-04(b), IMP-05 | Proven | — |
| AC-004 A/B comparison: tokens, $, latency, agreement | Yes | API-02, IMP-02 | Proven | — |
| AC-005 run ≈ 60–90 s | Yes | API-02 (29.6 s), API-04(a) (86.7 s, B capped), IMP-02 (29–37 s) | Proven | — |
| AC-006 no keys in the repo, browser responses or logs | Yes | API-01, API-03, API-06, IMP-06 | Proven | — |
| AC-007 README numbers from real runs | No | IMP-02 (run JSON + `compare.js` output match the README table) | Proven | — |
| AC-008 fresh clone + `.env` + `npm start` | Yes | API-01 | Proven | — |
| AC-009 readable errors | Yes | API-05, IMP-03 | Proven | — |
| AC-010 demo script ≤ 3 min | No | `DEMO.md` exists (IMP handoff) | Proven (exists) | Rehearsing the timing aloud is the presenter's job |

## Validation Confidence Scorecard

No repository suite exists, so the "post-repository" column covers the reused implementation checks only.

| Category | Post-Repository | Final | Supports | Residual | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement / AC proof | 85% | 96% | API-01..06 + reused IMP | AC-010 timing not rehearsed | rehearsal |
| Changed-boundary directness | 85% | 97% | live browser → server → real APIs | — | — |
| Integration realism / mock gap | 90% | 96% | no mocks; the API-04(b) replay is UI-only | live model variance | more companies |
| Env / config / fixture fidelity | 80% | 96% | fresh clone, `.env` from example, separate no-key server | other OS not tried | macOS run |
| Failure / edge / recovery | 90% | 95% | API-05, IMP-03/04, live B timeout | partial Tavily outage not simulated | — |
| User surface / browser | 80% | 92% | desktop full journey, clipboard granted, 390 px run | tables overflow on phones (FU-001); "Copied" shown even on a failed write | wrap the tables in `overflow-x:auto` |
| Durable regression coverage | N/A | N/A | no test suite in a zero-dependency hackday MVP with non-deterministic live output; layers recorded in `TESTING.md` | no automated regression | add a mocked pipeline test after the event |

- Overall post-repository confidence: 85%
- Overall final confidence: 95% (simple average of the six applicable categories: 96, 97, 96, 96, 95, 92)
- Every critical AC directly proven: `Yes`
- Any final applicable category below 90%: `No`
- 95% target met: `Yes`
- Confidence-limiting residual risks: phone-width table overflow (FU-001); Kimi latency (B is capped at 75 s and does not block, but "Done" can take up to about 90 s); lead quality varies by company (R-1 in the handoff).

## Broader Validation Decision

- Decision: `Required` (executed)
- Execution mode: Browser + Live API
- Gap addressed: the live end-to-end journey, fresh-start startup, key exposure across the browser boundary, and narrow width and clipboard, none of which repository checks could prove.

## Persisted-Data Transition Checks

- `Discard or Rebuild`: a fresh clone has no `runs/`, the first run creates it, and `runs/` stays ignored (`git status` clean). No migration.

## Compatibility / Legacy Scope Check

- Compatibility in scope: `No`. Observed: `No`. Durable coverage for compatibility: `No`.

## Durable Coverage Changed In The Codebase

- `No`. `TESTING.md` was added (a guideline, not a test).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| `/api/run` stream in API-04(b) | the saved real cal.com stream replayed through `fetch` in the page | get the clipboard result without another paid run | proves the UI only; the live path is API-02 / API-04(a) |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| `/tmp/lr-fresh` clone with `.env` holding the keys | Yes | `rm -rf`, after copying the two run JSONs to `evidence/API-runs/` | Removed |
| Servers on 3001 (pid 48108) and 3002 (pid 48212) | Yes | `kill` | Stopped; the implementation engineer's server on 3000 was not touched |
| Browser tabs 1 and 2 | Yes | closed | Done |
| Headless Chromium profile `/tmp/lr-probe` | Yes | removed; the probe script was kept as `evidence/API-04-probe-narrow-clipboard.mjs` | Done |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven / user-only: none. The AC-010 timing rehearsal is the presenter's.
- Next recipient: delivery_engineer
- Notes: follow-up FU-001 (narrow-width tables, and Copy showing "Copied" on a failed write) is recorded in `follow-ups.md`. It is optional before the freeze: a one-line CSS rule.

---

## Round 2 — IR-002 (SR-002 stretch: REQ-013 / AC-011 target companies) — API-REV-002

- Trigger: implementation_engineer, IR-002, code commit `b28dd34`. Delta: `src/steps/companies.js` (new), `src/pipeline.js`, `public/app.js`, `public/index.html`. Classification is unchanged: Medium + Low, direct route; test-code review `Not Required — direct low-risk route`.
- Scope: a narrow check of the delta. Round 1 cases API-01..06 still hold for the unchanged core (`git diff b2f085c b28dd34` touches only the four files above); the pipeline change only adds a parallel promise and an event.
- Environment: worktree code identical to `b28dd34` (`git diff --quiet b28dd34 -- src public server.js` at 13:43Z), `LEAD_RADAR_ENV_FILE=…/lead-radar/.env PORT=3001 node server.js`, agent browser tab (Chromium, 1920 px).
- Evidence folder: `/home/autobyteus/workspace/aibuilders-hackday-berlin-2026-11-20/lead-radar-mvp/tickets/done/lead-radar-mvp/evidence/`

| Case ID | Criteria | Surface | Steps | Result | Evidence | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| API-07 | AC-011, AC-005, AC-001..004 regression | Browser → API → Tavily/Nebius (live) | Page: `https://langfuse.com` (a new company) → Find leads; then `curl -sL` each company's source URL and count mentions of the company name | Pass | `API-07-langfuse-companies-browser.png`, `API-07-run-langfuse.com.json`, `API-07-companies-source-check.log` | `"Drafting 5 openers … (and looking for target companies)"`, `"total 29.7 s"`; `companies=5 companiesError=null`; all 5 rows `HTTP 200` with name mentions 1–178 (MacroCoderz hiring, Sycamore Labs funding, Potpie AI funding, Workato launch, Weaviate launch); the `target companies` step took 7.2 s and $0.0028; leads 20, drafts 5 | Section order on the page: profile, models, drafts, leads, companies, comparison. One request after load (POST /api/run). |
| API-08 | REQ-013 non-fatal failure | Step probe + browser replay | (a) `findTargetCompanies` with the real profile shape (`ideal_customer: ''`) and no Tavily key, `.catch(failed)` as in pipeline.js; (b) the captured langfuse stream replayed into the page with `{"type":"companies","companies":[],"error":"no search results for buying signals"}` | Pass | `API-08-companies-failure-path.log` | `{"error":"no search results for buying signals"}`; page shows `Target companies unavailable: no search results for buying signals`, the last stage still reads `Done … total 29.7 s`, `#error` stays hidden, and leads 20 / drafts 5 / comparison are shown | The probe proves the step rejects into `{error}`; part (b) proves the UI only. A live Tavily outage was not simulated. |
| API-09 | AC-006 | Run file, server log, worktree | Count matches of the two key values | Pass | `API-09-key-check.log` | every line `nebius=0 tavily=0`; `0 files` | |

- AC-011 proof: **Proven** by API-07 (live, 5 companies, every source URL real and naming the company) and API-08 (failure is non-fatal). AC-005 still holds: 29.7 s with the step in parallel.
- Confidence (Round 2, delta scope): requirement proof 96%, directness 96%, integration realism 95% (live; the failure path is shown by a probe and a replay, not a live outage), environment 95%, failure/recovery 92%, UI 95%; durable regression N/A. Overall 95%.
- Broader validation: `Required` and executed (Browser + Live API).
- Cleanup: the 3001 server (pid 51704) was stopped and the tab closed; the probe script was deleted after its output was recorded; the server on 3000 was not touched.
- Shared-worktree observation (not part of IR-002, not validated): at 13:44:59Z, after API-07 ran, someone else's uncommitted change rewrote `public/index.html` (a redesign: `#stages` and `#models-table` were removed, `#progress/#stepper/#kpis/#toast` added). The committed `public/app.js` still references `#stages` 5 times and `#models-table` once, so the working tree as it stands would not render runs correctly. That change is unvalidated. Do not commit it with this ticket unless a matching `app.js` lands and is validated.
- Result: **Pass** for `b28dd34`.
