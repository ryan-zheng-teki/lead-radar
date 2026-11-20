# Handoff — lead-radar-mvp — Architecture Design Complete (direct implementation)

- From: Solution Designer, 2026-11-20 ~14:17 Berlin. Route: `/implementation_engineer` (task_size Medium, architectural_risk Low).
- **HARD DEADLINE:** working end-to-end demo by ~14:45, everything (README with real comparison numbers, DEMO.md, pushed) by 15:15; feature freeze 15:30 Berlin. Keep checks proportionate: smoke checks + real runs, no test framework. Prefer shipping a working simple version first, then polish.

## Original request

Project Task `ai-builders-commit-hack-day-berlin-2026-2` (Project `project_c34e85f0-88b9-46f3-b5cd-65611fd8af0a`), requested by `/project_task_manager` for the user at AI Builders × commIT Hack Day Berlin. Build "Lead Radar": company URL → Tavily reads site → Nebius model profiles product/ICP → Tavily finds public posts of people with that pain → small fast Nebius model scores with source + quote → strong Nebius model drafts openers → human approves/edits/rejects (never sent) → numeric two-model comparison (cost, speed, quality). Event brief: `/home/autobyteus/workspace/aibuilders-hackday-berlin-2026-11-20/event-details.md`.

## Workspace

- Repo: `/home/autobyteus/workspace/aibuilders-hackday-berlin-2026-11-20/lead-radar` (branch `main`, base `922954d`: .gitignore with `.env`, `.env.*`, `!.env.example`, `node_modules/`, `runs/`; `.env.example`; stub README).
- Ticket worktree: `/home/autobyteus/workspace/aibuilders-hackday-berlin-2026-11-20/lead-radar-mvp`, branch `ticket/lead-radar-mvp`. Ticket folder: `.../lead-radar-mvp/tickets/lead-radar-mvp/`.
- Keys: `/home/autobyteus/workspace/aibuilders-hackday-berlin-2026-11-20/lead-radar/.env` (NEBIUS_API_KEY, TAVILY_API_KEY, both verified working). The worktree has no `.env`: run with `LEAD_RADAR_ENV_FILE=/home/autobyteus/workspace/aibuilders-hackday-berlin-2026-11-20/lead-radar/.env`. **Never print, log or commit keys**; check `git grep -nE "tvly-|v1\.Cm"` is empty before every commit.
- GitHub: user approved; empty public repo `https://github.com/ryan-zheng-teki/lead-radar` exists (no remote configured yet). Push of the final secret-free `main` is approved (delivery).
- Finalization target: `main`, then push.

## Approval basis

Requirements SR-001 Approved (Solution Designer within direction, user informed; models and solo demo on defaults, changeable; GitHub approved by the user). See requirements-doc.md Decisions.

## What to build

`design-spec.md` is authoritative (stack: Node 22, zero dependencies; files; pipeline; Nebius thinking controls; page). Key measured facts (investigation-notes.md): GLM-5.3-Flash needs `reasoning_effort:"low"` or it returns empty content; Kimi-K3.1-Pro needs `chat_template_kwargs:{thinking:false}` for ~1 s replies; prices come from `GET /v1/models?verbose=true`.

Also produce: README.md (REQ-010, with the comparison table from real runs on autobyteus.com + 1–2 other companies via `scripts/compare.js`) and DEMO.md (REQ-011). `DESIGN.md` at the repo root is already written by the Solution Designer.

## Acceptance

AC-001..AC-010 in requirements-doc.md. Escalation: if a real run yields < 8 candidates or takes > 3 minutes, report a Design Impact to the Solution Designer quickly rather than tuning for long.

## Open risks

R-1 non-person articles among results (prompt rubric handles); R-2 Kimi latency under load; R-3 quote normalization.

## Status

Architecture Design Complete. Next: implementation, then API/E2E validation and delivery per the team routes.
