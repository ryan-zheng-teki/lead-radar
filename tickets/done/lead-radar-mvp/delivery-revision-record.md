# Delivery Revision Record — lead-radar-mvp

| ID | Date (Berlin) | Trigger | Result |
| --- | --- | --- | --- |
| DR-001 | 2026-11-20 ~14:45 | API/E2E Pass (b2f085c), direct route | Verified from the evidence. Docs synced, RELEASE.md created, ticket archived, `main` fast-forwarded and pushed to `origin`. No release (the user's decision: push only). |
| DR-002 | 2026-11-20 ~14:50 | API/E2E Pass round 2 (API-REV-002), IR-002 code b28dd34 | Verified from the evidence. Stretch REQ-013 delivered onto `origin/main`, the README updated by the implementation engineer, pushed. No release. |
| DR-003 | 2026-11-20 ~15:00 | API/E2E Pass round 3 (SR-003 UI polish, AC-012), code d0bfa5a + reports e9255f4 | Verified from the evidence. `main` fast-forwarded to the `ui-polish-sr003` branch plus a delivery docs commit, pushed. No release. |

## DR-001

- Inputs: api-e2e-execution-coverage-report.md (API-REV-001), implementation-handoff.md, evidence/API-* and IMP-*.
- Evidence gap found and closed by delivery: the API-01 log stops after `git status` (no server-start or `/` 200 lines). DE-01 reran the fresh-clone start on 624e257 and proved it.
- Branch head moved during validation: 624e257 (SR-002, ticket docs only, no code). Included in the delivered state.
- Outcome and finalization state: see release-deployment-report.md.

## DR-002

- Inputs: api-e2e-execution-coverage-report.md "Round 2", api-e2e-revision-record.md API-REV-002, implementation-revision-record.md IR-002, evidence API-07/08/09 and IMP-07.
- Built on `origin/main` ff14bd6 in a temporary clone. `src/steps/companies.js`, `src/pipeline.js`, `public/app.js` and `public/index.html` were taken from commit b28dd34; every code file is byte-identical to b28dd34 (checked file by file). The ticket branch was not merged, because its history carries the pre-rewrite private email.
- Excluded, uncommitted in the shared worktree, for the next round (SR-003 UI polish): `public/index.html` and `public/style.css` (a redesign that removes `#stages` and `#models-table`, which the validated `app.js` still uses), and the SR-003 / D-8 edits to `design-spec.md`, `requirements-doc.md` and `solution-revision-record.md`.
- Integrated check DE-02, on the assembled tree: `node --check` on all JS passed; a server on port 3006 with the user's `.env` served `/` 200 and `/app.js` 200, the page has `#companies`, `#stages` and `#models-table`, `missingKeys` was empty, and `POST /api/run` with "not a url" returned the readable error. The server was stopped.
- Outcome: see release-deployment-report.md "Round 2 (DR-002)".

## DR-003

- Inputs: api-e2e-execution-coverage-report.md "Round 3", api-e2e-revision-record.md, implementation-revision-record.md IR-003, evidence/ui/API-10-*, API-11-*, IMP-08-*.
- Branch `ui-polish-sr003` was based on `origin/main` 1d859de, and every commit on it carries the no-reply identity. Delivery cloned the committed state e9255f4 only, so the uncommitted SR-004 edits in the shared worktree (`src/steps/score.js`, `leads.js`, `companies.js`, `public/app.js`, `solution-revision-record.md`, untracked `sr-004-lead-quality-fix.md`, IMP-09 evidence) are excluded. They need their own validation.
- Code check: `git diff --quiet d0bfa5a -- src public server.js scripts package.json .gitignore .env.example` held.
- Integrated check DE-03: `node --check` on all JS passed. A server on port 3007 served `/`, `/style.css` and `/app.js` with 200, `missingKeys` was empty, and the invalid-URL error was readable. Every element id that `app.js` looks up exists in `index.html` (none missing). The server was stopped.
- Docs synced: README (the phone limitation and the "make it work on phones" next step removed, because FU-001 is resolved), DEMO.md (the screen names now match the new page: stepper, KPI strip, leads list with "Show N low-fit results", "Model comparison" card), follow-ups.md (FU-001 marked resolved, not sent).
