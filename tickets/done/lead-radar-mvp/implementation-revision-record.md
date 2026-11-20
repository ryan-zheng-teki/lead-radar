# Implementation Revision Record — lead-radar-mvp

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer / handoff.md / initial | N/A | `Initial Baseline` | SR-001 | Implemented; ready for direct API/E2E |
| IR-002 | Solution Designer / SR-002 / round 2 | N/A | Requirement change (stretch) | SR-002 | Target companies implemented; validated and delivered |
| IR-003 | Solution Designer / SR-003 / round 3 | N/A | Requirement change (page-only UI) | SR-003 | UI polish implemented; IMP-08 pass at 1280×720 and 1920×1080 |
| IR-004 | Solution Designer / SR-004 (sr-004-lead-quality-fix.md) / round 4 | P1–P4 | Requirement change (lead quality) | SR-004 | Implemented; IMP-09: AC-013/014/016 pass, AC-015 judged pass (see entry) |
| IR-005 | Solution Designer / SR-005 (CR-001 from CRR-001) / round 5 | CR-001 | Requirement change (AC-016 restated; docs only) | SR-005, CRR-001 | README/DEMO numbers updated; no code change |

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

### IR-004 — Lead quality fix (SR-004: P1–P4, AC-013..016)

- Triggering role, report path, and round: Solution Designer, `sr-004-lead-quality-fix.md`, round 4. User request ~14:55.
- Triggering finding IDs: P1, P2, P3, P4.
- Classification: Small + Low (prompt and filter changes in three existing owners, plus a small `kind` display).
- Prior authoritative result: IR-003 (d0bfa5a on `ui-polish-sr003`, based on origin/main 1d859de).
- Implementation delta:
  - P1 + P3, `src/steps/leads.js`. For each query there are now two parallel searches. The discussion search covers reddit, HN, indiehackers, stackoverflow, quora, x and twitter, with max 8 results. The article search covers linkedin, dev.to and medium, with max 4 results. Up to 14 discussion candidates are kept by Tavily score, articles fill the rest, and discussion results back-fill if there are not enough articles. A candidate is dropped when its title or content mentions the product name (case-insensitive, lookaround word boundaries so that "Cal.com" works; skipped for names under 4 characters), or when its URL contains the domain.
  - P2, `src/steps/score.js`. New rubric: 9–10 for asking or complaining about exactly this problem; 5–8 for a person's own related need; at most 4 for an article, tutorial, course, listicle or news; 0–2 for a competitor, vendor or unrelated post. The clause "or a discussion where such people are active" is removed. Each score now carries `kind` (asking | complaining | discussing | article | competitor), and an unknown value becomes `''`.
  - P4, `src/steps/companies.js`. Buyer-side queries look for hiring (job posts), struggling, and internal rollouts (news). The prompt defines buyers and excludes sellers in the same category, job boards, recruiters, agencies, media and the product itself. It returns [] instead of padding, and a company is kept only if its signal is in {hiring, adopting, struggling, funding} and its URL is one of the results.
  - `public/app.js`: a kind pill on each lead card (Asking / Complaining / Discussing / Article / Competitor), and an empty companies list shows "No clear buyer signals found in this run."
- Local validation: IMP-09, real parallel runs on :3013 (`evidence/IMP-09-lead-quality-acs.log`, `IMP-09-runs/`).
  - AC-013, autobyteus: 14/20 discussion-site leads (before: 0) and 0 leads mention AutoByteus → Pass.
  - AC-014, autobyteus: all 7 posts tagged competitor are scored 1–2 by A and 1–2 by B → Pass. On cal.com, B timed out (see below); A tagged 8 posts competitor, each scored 1–2.
  - AC-015, autobyteus: one company, Cosmic, signal adopting, source cosmicjs.com/blog "How to build an AI-native team". Cosmic sells a headless CMS, not an agent orchestration platform, so it is not a seller in this category → Pass, but it is a borderline case to check by hand. cal.com: [] → shows the "No clear buyer signals" message.
  - AC-016, cal.com: 9 leads with A ≥ 5 and a run of 87.1 s → Pass, but close to the 90 s limit. The time is the Kimi reference scorer hitting its 75 s deadline while the two runs ran in parallel. Leads and drafts showed earlier.
- Remaining limitations: Kimi reference latency under load (the 75 s cap holds). There is one near-duplicate article in the autobyteus run: the same title at two different URLs. A name-mention filter also drops genuine posts by people who already know the product.

### IR-005 — SR-005: AC-016 restated, README and DEMO numbers (docs only)

- Trigger: Solution Designer SR-005, which resolves Requirement Gap CR-001 from code review CRR-001. AC-016 now requires at least 5 leads with A ≥ 5 from a cal.com run, within 90 s.
- Code delta: none. Branch `sr005-release` is built on origin/main 8f6b3fb, with the SR-004 commits cherry-picked (b8f5193 = 9eddc9a, 6a6c6b5 = 346ecaa; no-reply identity).
- Docs:
  - README "Comparison numbers": the 17-run snapshot from 15:04 (16–22× cheaper, 2.3–2.6× faster, 1–1.4 points apart, 3.3 of the top 5 shared, 30–50 s, $0.03–0.04, one 87 s outlier). The per-company table is labelled as an earlier example. The cost/speed, quality and whole-pipeline bullets and the headline run line are updated.
  - DEMO.md: the spoken line and the video caption are updated.
  - Committed with this round: the Solution Designer's SR-005 edits (sr-004-lead-quality-fix.md, solution-revision-record.md, follow-ups.md FU-002/FU-003 added on top of main's resolved FU-001) and code review's code-review-report.md and code-review-revision-record.md.
- Validation: a docs-only change. The AC-016 re-judgement on the existing API-13 evidence is for API/E2E.
