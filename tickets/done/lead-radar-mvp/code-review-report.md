# Code Review Report — lead-radar-mvp

## Review Round Meta

- Entry point: API/E2E failure-origin review (no source review was done before; SR-004 took the direct route).
- Ticket / revision: SR-004 lead quality (IR-004). Classification preserved: `Small` / `Low`, direct route.
- Code: branch `ui-polish-sr003` at `9eddc9a`; failure evidence is in `346ecaa` (API/E2E Round 4).
- Failing scenario: API-13 / AC-016, "cal.com run gives ≥ 8 leads with model A score ≥ 5, run ≤ 90 s".
- Reviewer: code_reviewer. Date: 2026-11-20 15:10 Berlin. Revision: CRR-001.

## Review Scope

The scope is AC-016 only. I read `src/steps/score.js`, the candidate selection in `src/steps/leads.js` (lines 7–8 and 60–65) and the scorer deadline in `src/pipeline.js`. I also compared every lead's model A and B kind and score in three cal.com runs:

- `evidence/ui/API-13-run1-cal.com.json` (run B)
- `evidence/ui/API-13-run2-cal.com.json` (run C)
- `evidence/IMP-09-runs/2026-11-20T13-57-10-467Z-cal.com.json` (IMP-09)

I did not repeat the full source audit or the scorecard (failure-origin entry point). I did not rerun anything; the three recorded runs settle the question.

## Basis Confirmation

- AC-016 still describes approved behavior: a cal.com run should produce enough good leads for the demo. Its scenario (a user pastes a URL and starts a run) and its entry surface (`POST /api/run`) are real.
- REQ-003 (amended, approved in SR-004) sets these score limits:
  - articles, tutorials, courses, listicles and news: at most 4
  - competitor or vendor self-promotion: 0–2
  - 5–8: only a person describing their own related need or experience
- Design delta 1 sets the pool: 14 discussion slots plus 6 article slots (`MAX_DISCUSSION = 14`, `MAX_CANDIDATES = 20`).

## Evidence: per-lead result of model A

| Run | A ≥ 5 | Discussion candidates | Where the other discussion slots went (A < 5) |
| --- | --- | --- | --- |
| IMP-09 | 9 | 14 | Almost all Reddit hits were people asking or complaining. 1 STR "discussing" post scored 4. 1 HN Show HN and 1 Reddit "we built" post were competitors. |
| Run B | 6 | 14 | 2 Quora questions labeled `article` (3 and 4; B gave 6 and 7 `asking`). 1 Quora holiday-cottage post: `asking` but scored 4. 1 Reddit Zoom FAQ. 2 Reddit and 2 X posts were vendor or self-promotion. |
| Run C | 6 | 14 | 2 Reddit listicles ("6 Best Free Employee Scheduling Software 2026", "Google Calendar Apps&extensions"). 4 Reddit or Indie Hackers posts that promote a tool. 1 off-topic Stack Overflow CP-SAT post. 1 STR "discussing" post at 3. |

## Candidate Finding And Mechanism Gate

| ID | Candidate | Scenario / contract | Evidence | Disposition |
| --- | --- | --- | --- | --- |
| C-1 | score.js implements the rubric incorrectly | REQ-003 (amended) | The prompt in `score.js` matches the REQ-003 text word for word. `kind` is kept and checked against the 5 allowed values. In all 3 runs, every listicle, tutorial or vendor post that A scored below 5 also has the matching kind, and B agrees with almost every one. | Reject: the code follows the approved requirement. |
| C-2 | The ≥ 8 bar cannot be met reliably under the approved SR-004 rules | AC-016 vs REQ-002/REQ-003 amended + design delta 1 | Only the 14 discussion slots can score ≥ 5, because the 6 article slots are capped at 4 by design. AC-016 therefore needs at least 8 of the 14 Tavily discussion hits (57 %) to be real people with the need. The share of real people varies between runs: IMP-09 9, run B 6, run C 6. Before SR-004, d0bfa5a with the old, more generous rubric also gave only 7 (API-10). | Promote → Requirement Gap (approved bar vs approved rules) |
| C-3 | Model A (GLM) calibration slips: Quora question pages labeled `article`, and an `asking` post scored 4 | REQ-003 | Run B: 2 Quora questions, A `article` 3–4 vs B `asking` 6–7. Holiday-cottage post: A `asking` 4, which REQ-003 does not allow for `asking`. Fixing this would add at most +1 to +3 in run B and about 0 in run C (its gaps are true listicles and vendors). | Promote as a minor contributor. A score.js fix alone is not enough to make AC-016 reliable, so it does not change the classification. |
| C-4 | Scorer A has no deadline (attempt A hung > 198 s) | Runtime limit of the run (≤ 90 s, AC-016 / earlier ACs) | `pipeline.js:41`: `scoreLeads(config.scorerA…)` without `withDeadline`. Only B is capped at 75 s. `nebius.js` allows 120 s per call plus 1 retry. The path predates SR-004, and runs B and C did not reproduce the hang. | Promote → Follow-up FU-002 (old path, not caused by this change, not the cause of the count failure) |

## Findings

- **CR-001 (Requirement Gap, owner solution_designer):** AC-016's "≥ 8 leads with A ≥ 5" conflicts with the approved SR-004 rules. Articles are capped at ≤ 4, and only 14 of the 20 slots are discussion slots. Whether a run reaches 8 depends on how many real people asking for help Tavily returns, which varies between runs (9 / 6 / 6). The implementation follows the approved REQ-003 and design delta. The options below are for the Solution Designer and the user to choose; I do not prescribe one:
  1. Restate AC-016 to fit the stricter rubric, e.g. "≥ 5 leads with A ≥ 5". Runs B and C pass it with 6. Pre-SR-004 gave 7 under the generous rubric.
  2. Change the design: let discussion candidates fill all 20 slots when available, with articles only as a fallback. This raises the ceiling from 14 to 20. The leads.js change is small but needs new real runs.
  3. Tune the score.js wording: "a Quora/forum question page is `asking`", and "asking/complaining is never below 5 unless off-topic". This fixes C-3 only (+0 to +3), so it is not enough alone.

  Within the 15:20 time box, only option 1 needs no new code and no rerun of API-13's count. Options 2 and 3 need implementation plus a new API/E2E run.

## Follow-ups

- FU-002: scorer A (model A, GLM) has no run-level deadline in `pipeline.js` (recorded in `follow-ups.md`).

## Review Gap Statement

There was no prior source review (direct route). The pool ceiling and the run-to-run variance only show across several real runs. A single implementer run (IMP-09: 9) could not detect them.

## Classification

`Requirement Gap`, owned by solution_designer. It is not a `Local Fix`. The code matches the approved rubric and selection design, and a score.js calibration change alone would not make ≥ 8 reliable. This confirms the API/E2E engineer's second branch.

## Recommended Recipient

`/solution_designer`

## Residual Risks

- autobyteus.com gives only 1 lead with A ≥ 5 (API-12). A demo on it shows 1 draft. This is the same pool effect.
- GLM `article`/`asking` labeling slips (C-3) remain unless option 3 is taken.

## Latest Authoritative Result

CRR-001: API/E2E failure-origin review of AC-016 → `Requirement Gap` (CR-001), routed to solution_designer. Follow-up FU-002 was recorded.
