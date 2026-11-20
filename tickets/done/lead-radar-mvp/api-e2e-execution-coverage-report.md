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

---

## Round 3 — IR-003 (SR-003 UI polish: REQ-014 / AC-012) — API-REV-003

- Trigger: implementation_engineer, IR-003, branch `ui-polish-sr003` at `d0bfa5a` (based on origin/main `1d859de`). Changes: `public/index.html`, `public/style.css`, `public/app.js`; `git diff 1d859de d0bfa5a -- src server.js` is empty. Classification is unchanged: Medium + Low, direct route; test-code review `Not Required — direct low-risk route`.
- Environment: `LEAD_RADAR_ENV_FILE=…/lead-radar/.env PORT=3001 node server.js`, started about 13:53Z from this worktree while it matched `d0bfa5a` (no local changes at 13:52:37Z). Headless Chromium 1248 over raw CDP (`evidence/ui/API-10-probe-journey.mjs`), clipboard permission granted, console and Network events captured.
- Concurrent-edit note: after the server started, another session made uncommitted SR-004 edits in the same worktree: `src/steps/score.js` 13:55:14Z, `leads.js` and `companies.js` 13:55:31Z, `public/app.js` 13:55:42Z. The server loaded its `src` modules at start, so both runs used `d0bfa5a` pipeline code. The 1280 run loaded `app.js` at about 13:53:50Z, and the 1920 run at about 13:55:25Z (its probe ended 13:56:03Z after a 29.3 s run plus about 8 s of steps); both loads precede the 13:55:42Z edit. **This result covers `d0bfa5a` only, not the uncommitted SR-004 edits.**

| Case ID | Criteria | Surface | Steps | Result | Evidence (`evidence/ui/`) | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| API-10 @1280×720 | AC-012; regression AC-001..004, 009, 011 | Browser (live) | `node API-10-probe-journey.mjs http://localhost:3001/ https://posthog.com 1280 720 <out> 9341`: click the **posthog.com example chip**, run to Done; check KPIs, profile, leads and tabs and "Show n low-fit"; Approve d0, Edit+Save d1, Reject d2; Copy d0 (read the clipboard back); companies, comparison, models; 390 px recheck; then `not a url` → error card → **Try again** | Pass | `API-10-1280x720-01..09*.png`, `API-10-1280x720-report.json`, `API-10-run-posthog.com.json` | `"progressTitle": "Done — review your leads and drafts below \| total 43.3 s"`; KPIs `20 Leads found 0 High-fit 43.3 s $0.0326`; leads `"cards": 3` → after Show low-fit `"cards": 20`, `"verified": 20`; tabs High-fit 0 / With draft 3 / All 20, `aria-selected` follows; `"draftsCounter": "2 approved · 1 rejected · 0 pending"`, `"draft1HasEdit": true`; copy `"toast": "Copied — paste it on the post yourself"`, `"draftContainsClipboard": true`; `"requestsDuringDraftActions": []`; companies 5 links; comparison "18.3× cheaper … 2 / 5 same leads … 20/20 · 20/20"; error `"not a url" is not a valid URL. Try again`, and Try again sent one more `POST /api/run`; `"consoleErrors": []`; `hscroll` false in every state; `minFontPx` 14 | Only 3 leads scored ≥ 5, so 3 drafts and Undo was not exercised here (see 1920). |
| API-10 @1920×1080 | AC-012; regression | Browser (live) | same probe with the **cal.com chip**, plus Reject d2 → **Undo** → Reject again | Pass | `API-10-1920x1080-01..09*.png`, `API-10-1920x1080-report.json`, `API-10-run-cal.com.json` | `total 28.6 s`; KPIs `20 … 2 High-fit … $0.0359`; low-fit 7 → 20 cards, 20 verified; tabs High-fit 2 / With draft 5; undo `"afterReject": "draft rejected"` → `"cls": "draft pending", "buttons": ["Approve","Edit","Reject"]`, counter `2 approved · 0 rejected · 3 pending`; final counter `2 approved · 1 rejected · 2 pending`; badges "Approved", "Approved · edited" (text ends `[API-10 edit]`), "Rejected" (`05b-copy-toast.png`); copy matches; no requests during draft actions; `"consoleErrors": []`; no horizontal scroll; min 14 px | |
| API-10 390 px | FU-001 recheck | same runs, viewport switched to 390×844 mobile | — | Pass | `API-10-*-09-phone390-full.png` | `"innerWidth": 390, "scrollWidth": 390, "hscroll": false` | FU-001's table overflow is resolved. The stepper labels are tight at 390 px ("Read site / Understand product" nearly touch); cosmetic, outside AC-012's viewports. |
| API-11 | AC-006 | run files, reports, server log, `public/*`, worktree | count matches of the key values; `/api/config` keys | Pass | `API-11-key-check.log` | every `nebius=0 tavily=0`; `0 files`; `["draftCount","missingKeys","models"]` | |

- Layout detector notes (from the reports):
  - The "overlaps" listed are the search-query pills inside the closed `<details>` "Search queries used (n)". They are not rendered; the crop of `07-full` shows the collapsed summary with nothing overlapping.
  - "Clipped" entries are the intentional two-line ellipsis on long lead titles, the long profile source URL, and the screen-reader-only label. No text is cut without an ellipsis.
  - Headless Chromium has no emoji font, so emoji inside post titles render as boxes. That is a font limit of the environment, not the app.
- AC-012: **Proven**. Screenshots of every required state at both sizes exist from real runs (this round and IMP-08); no horizontal scroll, no overlapping visible text, no console errors. Earlier ACs still pass: AC-001 (profile + 5 source links), AC-002 (20 leads with link, platform, score, reason, quote, verified), AC-003 (approve / edit / reject / undo / copy with no network calls), AC-004 (comparison tokens / $ / latency / agreement), AC-005 (43.3 s and 28.6 s), AC-006 (API-11), AC-009 (error card + Try again), AC-011 (5 companies). AC-007, AC-008 and AC-010 are unaffected: no `src`, `server.js`, `package.json` or README change.
- Confidence (Round 3): requirement proof 96%, directness 96%, integration realism 95%, environment 93% (a concurrent-edit window, bounded by the timestamps above), failure/recovery 95%, UI 95%; durable regression N/A. Overall 95%.
- Cleanup: the 3001 server (pid 54680) was stopped; the Chromium profile and `/tmp/lr-ir003` were removed (the probe was kept as evidence); the server on 3000 was not touched.
- Result: **Pass** for `d0bfa5a`.

---

## Round 4 — IR-004 (SR-004 lead quality: AC-013..016) — API-REV-004

- Trigger: implementation_engineer, IR-004, branch `ui-polish-sr003` at `9eddc9a` (on `e9255f4`). Classification: Small + Low, direct route. Clean worktree at the start (`git status` empty at 13:58Z).
- Environment: my own server `LEAD_RADAR_ENV_FILE=…/lead-radar/.env PORT=3001 node server.js`, started at 13:59Z from `9eddc9a`. I did not restart the `:3000` server because it is not mine. Browser runs use the CDP journey probe (copy of `API-10-probe-journey.mjs` tagged API-12); cal.com timing runs use `curl -sN -X POST /api/run`.

| Case ID | Criteria | Steps | Result | Evidence | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| API-12 | AC-013, AC-014, AC-015; AC-012 regression | Browser 1280×720, autobyteus.com chip, full journey | Pass | `API-12-lead-quality-acs.log`, `ui/API-12-1280x720-*`, `ui/API-12-run-autobyteus.com.json` | `discussion-source leads … 14 / 20`; `matches /autobyteus/i: 0`; `{"n":11,"maxA":2,"maxB":2}`; one company, `Carrier`, signal `hiring`, an HVAC manufacturer hiring an "Agentic AI Engineer Lead" (buyer side; source HTTP 200); `total 46.6 s`; `consoleErrors: []`; `hscroll` false in every state including 390 px | Only 1 lead scored A ≥ 5 (1 draft). AC-013..015 do not require more, but a demo on autobyteus.com shows a single draft. |
| API-13 | AC-016 | (A) browser, cal.com chip, 1920×1080, alone; (B) and (C) `curl` POST /api/run cal.com, alone | **Fail** | `API-13-ac016-calcom.log`, `API-13-cal-curl-stream-timed.log`, `ui/API-13-run1-cal.com.json`, `ui/API-13-run2-cal.com.json` | (B) `totalMs=27568 … A>=5: 6 (need >= 8)`; (C) `totalMs=29878 … A>=5: 6 (need >= 8)`; (A) scorer A hung: page timer `198.5 s`, "Score leads" active, no run file within the probe's 260 s | Time limit met by B and C (≤ 30 s); the count is not met (6, 6 vs the required 8). The implementer saw 9 in IMP-09. Before SR-004 (`d0bfa5a`, API-10 1920) the All view showed 7 leads with A ≥ 5. AC-014 also holds on B and C (competitors max A 2, max B 1). |
| API-14 | AC-006 | key-value counts | Pass | `API-14-key-check.log` | `0` and `0` | |

- Failure detail (AC-016): two isolated cal.com runs gave 6 leads with A ≥ 5; the criterion requires ≥ 8.
  - Kinds: run B had article 9, asking 4, competitor 4, complaining 1, discussing 2; run C had article 6, asking 3, competitor 5, discussing 6.
  - The new rubric caps articles at 4 and competitors at 2, so fewer leads reach 5.
  - The result is non-deterministic: the implementer's run gave 9. The pre-SR-004 baseline view showed 7.
- Separate observation (attempt A): one scorer A (GLM) call hung for more than 180 s, while a direct GLM ping at the same time took 1.2 s. `nebius.js` allows 120 s per call plus one retry, and `pipeline.js` has no deadline on scorer A (B has a 75 s cap), so a single stuck call can push a run past AC-005 / AC-016's 90 s. This code path is unchanged by SR-004 (pre-existing), and runs B and C did not reproduce it.
- Preliminary classification: `Unclear`. It is either a scoring calibration issue (`Local Fix` in `src/steps/score.js`, implementation_engineer) or a threshold that conflicts with the stricter rubric (`Requirement Gap`, solution_designer: is ≥ 8 still the right bar when articles are capped at 4?). The hung-A observation is a follow-up candidate, not this ticket's failure.
- Earlier ACs on `9eddc9a`: AC-001..004, 006, 009, 011 and 012 held in API-12; AC-005 held in API-12 (46.6 s) and runs B and C (≤ 30 s).
- Cleanup: the 3001 server and the probe Chromium were stopped and `/tmp/lr-ir004` removed; the `:3000` server was not touched.
- Result: **Fail** (AC-016 count). Next: code_reviewer failure-origin review.

---

## Round 5 — IR-005 / SR-005 (AC-016 restated after CRR-001 / CR-001) — API-REV-005

- Trigger: implementation_engineer, IR-005. Branch `sr005-release` at `54bede7` (on origin/main `8f6b3fb`; `b8f5193` and `6a6c6b5` are cherry-picks of `9eddc9a` and `346ecaa`). There is no code change: `git diff 9eddc9a 54bede7 -- src public server.js package.json` is empty, and `6a6c6b5..54bede7` touches only README.md, DEMO.md and ticket docs.
- Basis: AC-016 as restated in `sr-004-lead-quality-fix.md` ("SR-005 revision"): a cal.com run yields **≥ 5 leads with model A score ≥ 5**, run ≤ 90 s, and all earlier ACs hold. Requirement Gap CR-001 was resolved by the Solution Designer.
- Re-judged on the existing evidence, with no rerun (the code is identical to what Round 4 exercised):

| Case ID | Criteria | Evidence | Look For | Result |
| --- | --- | --- | --- | --- |
| API-13 (re-judged) | AC-016 (restated) | `ui/API-13-run1-cal.com.json`, `ui/API-13-run2-cal.com.json`, `API-13-ac016-calcom.log` | run B `totalMs=27568 A>=5=6`; run C `totalMs=29878 A>=5=6`; both ≥ 5 and ≤ 90 s | **Pass** |
| API-12 (Round 4) | AC-013/014/015, AC-012 regression | unchanged | as in Round 4 | Pass (still holds: same code) |
| API-15 | AC-006 | `git grep --untracked -F` both key values on `54bede7` | `0` files | Pass |

- Not re-validated here: the README / DEMO.md numbers in the "17-run snapshot" are documentation, which delivery verifies against the run evidence.
- Residual risks, carried: scorer A has no deadline (one live hang in Round 4 attempt A; pre-existing; see follow-ups); autobyteus.com yields 1 draft under the SR-004 rubric; the lead count varies from run to run.
- Confidence: requirement proof 95%, directness 95% (live runs on the identical code), realism 95%, environment 93%, failure/recovery 90% (A-hang path unguarded but outside scope), UI 95%. Overall 94–95%, no category below 90%.
- Result: **Pass** for `54bede7`. Test-code review: `Not Required — direct low-risk route`.
