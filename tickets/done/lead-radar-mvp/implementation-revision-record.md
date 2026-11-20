# Implementation Revision Record — lead-radar-mvp

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer / handoff.md / initial | N/A | `Initial Baseline` | SR-001 | Implemented; ready for direct API/E2E |
| IR-002 | Solution Designer / SR-002 / round 2 | N/A | Requirement change (stretch) | SR-002 | Target companies implemented; validated and delivered |
| IR-003 | Solution Designer / SR-003 / round 3 | N/A | Requirement change (page-only UI) | SR-003 | UI polish implemented; IMP-08 pass at 1280×720 and 1920×1080 |

## Revision Entries

### IR-001 — Lead Radar MVP initial implementation

- Triggering role, report path, and round: Solution Designer, `tickets/lead-radar-mvp/handoff.md`, initial.
- Triggering finding IDs: N/A
- Classification: Initial Baseline
- Prior authoritative result: N/A
- Current authoritative result: full pipeline, review page, comparison, README with real numbers, DEMO.md. Code commit `6d763ea`.
- Related solution revision IDs: SR-001. ARCH-REV / CRR / API-REV / DR: N/A.
- Why recorded: the initial baseline.
- Approved behavior or requirement IDs affected: REQ-001..REQ-012, AC-001..AC-010.
- Implementation delta: all files added (see the handoff's Key Files). Two refinements inside the design's owners after live findings: reference scorer B does not block (pipeline), and profile max_tokens is 3000 with a shape-checked JSON parse.
- Changed files or areas: `server.js`, `src/**`, `public/**`, `scripts/compare.js`, `package.json`, `README.md`, `DEMO.md`.
- Local validation and result: IMP-01..IMP-06 Pass.
- Next recipient or routing: per `get_handoff_rules` (direct API/E2E).
- Remaining limitations or risks: R-1 article noise, R-2 Kimi latency (capped at 75 s, non-blocking), fresh-clone check not run here.

### IR-002 — Target companies stretch (REQ-013 / AC-011)

- Triggering role, report path, and round: Solution Designer, SR-002 (`solution-revision-record.md`, D-7), round 2.
- Triggering finding IDs: N/A (new stretch requirement)
- Classification: Requirement change implemented (SR-002); still Medium + Low.
- Prior authoritative result: IR-001 (6d763ea).
- Current authoritative result: commit `b28dd34`. README edited in the working tree but not committed: it contains the delivery engineer's uncommitted changes too.
- Related solution revision IDs: SR-002. ARCH-REV / CRR: N/A. API-REV: the IR-001 validation in b2f085c (does not cover this step). DR: in progress.
- Implementation delta: `src/steps/companies.js` (new). The step runs 3 Tavily basic searches (hiring, launches, news/funding) built from `ideal_customer` and the first problem. One PROFILE_MODEL call with an `accept: Array.isArray` check returns up to 5 `{company, signal, reason, url, title}`, and a company is dropped unless its url is in the results. `src/pipeline.js` starts it in parallel with drafting and emits a `companies` event (non-fatal; the error is carried in the event). It adds a "target companies" row to the steps table and `companies`/`companiesError` to the run file. `public/*` adds the "Target companies (buying signals)" section, showing "Target companies unavailable" on failure.
- Local validation: IMP-07. Live linear.app run: 5 companies, run 35.4 s. Browser run on tavily.com: 4 companies rendered, run 48.7 s (Kimi reference latency dominates). `node --check` and the secret scan are clean.
- Remaining limitations: the companies come from news/search results (for example, YC hiring lists and press releases), and their quality depends on the model. The failure path was not exercised live: it is a `.catch` that emits the error, and the UI path renders "unavailable".

### IR-003 — Page-only UI polish (REQ-014 / AC-012, SR-003)

- Triggering role, report path, and round: Solution Designer, SR-003 (design-spec.md "Visual design (SR-003, REQ-014)"), round 3.
- Triggering finding IDs: N/A (user request ~14:30 "world class UI").
- Classification: Requirement change implemented; still Medium + Low (page-only).
- Prior authoritative result: IR-002 as delivered on origin/main 1d859de.
- Current authoritative result: branch `ui-polish-sr003` from origin/main (1d859de); the commit adds the SR-003 docs and the UI. No pipeline, API or server changes (`git diff b28dd34 HEAD -- src server.js` is empty).
- Implementation delta:
  - `public/index.html`: top bar with the radar mark, hero with example chips and trust row, stepper card, alert, skeleton, sections in the new order (KPIs → profile → leads → drafts → comparison → models → companies), footer, inline favicon.
  - `public/style.css`: rewritten on the spec tokens.
  - `public/app.js`: rewritten. Stepper driven by stage events: the single `profile` stage covers "Read site" and "Understand product" together, so they advance together and nothing is faked. KPI strip. Profile with "+n more" and collapsed queries. Lead cards with score circles, platform pills, verified pills, tabs All / High-fit / With draft, and A < 5 collapsed. Drafts with approve / edit (auto-grow) / reject / undo, Copy reply plus toast, and Open post. Comparison headline, bars, agreement tiles, and every call collapsed. The error card has "Try again". Example chips fill the input and run.
- Spec deviation: the "$/1M" column in "Which model does what & why" was omitted, because `/api/config` does not return prices and the round is page-only (no API changes).
- Local validation: IMP-08 (real runs, CDP headless Chromium, 1280×720 and 1920×1080). Issues found in the screenshots and fixed:
  - a stale stepper on the error state;
  - an orphaned ↗ and lone pills on long titles;
  - 12–13 px text;
  - a squeezed profile column at 1920 px;
  - a favicon 404.
  Final pass: no horizontal scroll in any state, smallest text 14 px, no console errors.
- Remaining limitations: in two of the screenshot runs, the Kimi reference scorer used about 11k input tokens (its JSON retry ran), which pushed the run cost to about $0.09. That is pipeline behavior, outside this page-only round. A narrow width (390 px) was not re-shot in this round; the CSS has 900 px and 640 px breakpoints.
