# API/E2E Revision Record — lead-radar-mvp

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer / implementation-handoff.md / Round 1 | SR-001, IR-001 | N/A | Pass / 95% |
| API-REV-002 | implementation_engineer / IR-002 / Round 2 | SR-002, IR-002 | Pass / 95% | Pass / 95% |
| API-REV-003 | implementation_engineer / IR-003 / Round 3 | SR-003, IR-003 | Pass / 95% | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline live validation on a fresh clone

- Triggering role, report path, and round: implementation_engineer, `implementation-handoff.md`, Round 1 (direct Medium + Low route)
- Triggering finding or case IDs: N/A
- Related revision IDs: SR-001, IR-001
- Why recorded: the first API/E2E result
- Coverage decisions or durable test paths changed: no durable tests (none exist; see the investigation). `TESTING.md` was created at the repository root.
- Cases: API-01..API-06 added; IMP-02, IMP-04 and IMP-05 reused.
- Environment: a fresh clone on port 3001, a no-key server on port 3002, the agent browser tab, and headless Chromium over CDP at 390 px.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `follow-ups.md` (FU-001), `TESTING.md`
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95%
- New or remaining failure IDs: none
- Recommended owner: delivery_engineer
- Remaining risks: FU-001 (phone-width table overflow; Copy shows "Copied" on a failed write); Kimi latency (capped); the AC-010 timing rehearsal is the presenter's job

### API-REV-002 — IR-002 target companies (AC-011) delta check

- Trigger: implementation_engineer, IR-002 (commit b28dd34), Round 2
- Cases added: API-07 (live langfuse.com run and source-URL spot check), API-08 (non-fatal failure: step probe and UI replay), API-09 (key counts). Round 1 cases kept: the core is unchanged.
- Prior failure resolution: None
- Canonical artifacts updated: `api-e2e-execution-coverage-report.md` (Round 2 section)
- Prior result: Pass / 95%. Current: Pass / 95%.
- Remaining risks: a live Tavily outage during the companies step was not simulated (probe and replay only); an uncommitted, unvalidated `public/index.html` redesign in the shared worktree does not match `app.js`.

### API-REV-003 — IR-003 UI polish (AC-012) on d0bfa5a

- Trigger: implementation_engineer, IR-003 (branch ui-polish-sr003 at d0bfa5a), Round 3
- Cases added: API-10 (live journeys at 1280×720 via the posthog.com chip and at 1920×1080 via the cal.com chip, each with a 390 px recheck), API-11 (key counts)
- Prior failure resolution: FU-001's narrow-width table overflow is resolved by the new layout (API-10 390 px `hscroll` false); FU-001's Copy-failure feedback is resolved in code (`app.js` shows "Copy failed — select the text…" on a rejected write; the success path was proven live).
- Canonical artifacts updated: `api-e2e-execution-coverage-report.md` (Round 3)
- Prior result: Pass / 95%. Current: Pass / 95%.
- Remaining risks: uncommitted SR-004 edits (src/steps/*, public/app.js) appeared in the shared worktree during this round and are not covered by this result; the stepper labels are tight at 390 px (cosmetic).
