# Requirements Document — Lead Radar (hack-day MVP)

Proportionate to a one-afternoon hackathon prototype (Task direction: "keep design and review light").

## Document Status

- Status: `Approved` (D-1, D-3 on recommended defaults under the hard deadline, changeable; D-2 push stays gated on the user's explicit yes)
- Current solution revision ID: SR-001
- Package identifier: `lead-radar-mvp`
- Request / ticket: Project Task `ai-builders-commit-hack-day-berlin-2026-2` (Project `project_c34e85f0-88b9-46f3-b5cd-65611fd8af0a`)
- Requested by: `/project_task_manager` (run `project_task_manager_2f41a1df4e464bf2aa8970327d9d7ad0`) on behalf of the user
- Requirements owner: Solution Designer
- Date: 2026-11-20 (13:50 Berlin)
- Approved by and reference: Solution Designer within the direction (user informed in conversation 2026-11-20 14:12 Berlin: "starting the build now with the defaults… nothing goes to GitHub until you explicitly approve"). D-1/D-3 asked four times without objection; reversible via `.env` / script text. D-2 remains `Needs user` and blocks only the push (delivery).
- Exact approved requirements baseline: SR-001 (this file as of 14:12)
- Behavior-defining supplements: none
- Authorities read: requirements-engineering.md, ticket-scope.md, finding-the-cause.md, handoff.md, project-documents.md; event brief `/home/autobyteus/workspace/aibuilders-hackday-berlin-2026-11-20/event-details.md`

## Problem And Desired Outcome

- Problem: the user finds people worth replying to by scrolling X and LinkedIn by hand. Slow, unsourced, not repeatable for a new product.
- Affected actors: the user (founder/marketer, operator of the tool); hack-day judges (try it live on a company they name).
- Desired outcome: a local one-page web app. Given a company website URL it produces, in about a minute, a sourced list of public posts by people describing the pain that company solves, each scored for fit with quoted evidence, with drafted replies for the top leads that a human approves, edits or rejects. Nothing is sent. A two-model comparison (cost, speed, quality) on the same step is shown from real runs.
- Observable definition of success: AC-001..AC-010 pass on the live app with real Nebius and Tavily keys; README and demo script exist; repo pushed after user approval with no secrets.

## Relevant Current And Desired Behavior

| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| B-001 | No tool; manual scrolling of X/LinkedIn | Pipeline URL → product profile → leads → scores → drafts → human review | N/A (new) |
| B-002 | N/A | Two Nebius models compared numerically on the scoring step | N/A |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001 Analyze a company: user enters a URL and runs the pipeline; sees product profile, sourced leads, scores and drafts.
- UC-002 Review drafts: user approves, edits (then approves) or rejects each draft; can copy the approved text and open the source link to reply by hand.
- UC-003 Compare models: the same scoring step runs on model A and model B; a table shows tokens, $ cost, latency and agreement; results from real runs on 2–3 companies are aggregated into the README.
- UC-004 Try it: a judge clones the repo, adds two keys to `.env`, runs one command and opens the page.

### Out Of Scope

Sending/posting anything; logging into X/LinkedIn or scraping behind login; accounts, multi-user, database; deployment to a hosting service; CRM export.

### Non-Goals

Production hardening, automated test suite beyond smoke checks, perfect lead recall, UI polish beyond a clean single page.

### Preserved Behavior Boundary

No existing code. AutoByteus and its Marketing Reply Scout / Event Networking Team patterns are prior work: referenced in the README, not modified.

### Prerequisites

None found. The user supplies both API keys in `lead-radar/.env` himself (external action, not a Task).

### Review Authority

Standard: blocking findings must cite a REQ/AC ID below; scope-changing proposals are `Requirement Gap` and need the user.

## Requirements

- REQ-001 Product understanding: read the given website through Tavily (extract, falling back to search results for the domain) and have a Nebius model return a structured profile: product name, one-line summary, problem(s) solved, ideal customer, 3–5 pain phrases people would write, and search queries. Each profile field is grounded in the fetched page (source URL shown).
- REQ-002 Lead discovery: run several Tavily searches built from the profile across public sources (Reddit, Hacker News, X, LinkedIn posts, blogs, forums), dedupe by URL, exclude the company's own domain, and keep ~15–25 candidates with URL, title, snippet/content.
- REQ-003 Scoring: a small fast Nebius model scores each candidate 0–10 for fit with a one-line reason and a verbatim quote taken from the candidate's own text. A quote not found in the source text is flagged as unverified (no invented evidence).
- REQ-004 Drafting: a stronger Nebius model writes a short (≤ ~70 words), specific, non-spammy reply/opener for the top N (default 5) leads, grounded in the lead's quote and the product profile, disclosing affiliation where natural.
- REQ-005 Human approval: each draft has Approve, Edit (editable text, then approve) and Reject. Status is visible. Approved text can be copied; source link opens in a new tab. The app never posts or sends anything.
- REQ-006 Model transparency: the UI and README state which model does each step and why.
- REQ-007 Model comparison: the scoring step runs on both model A and model B over the same candidates; per run show tokens in/out, $ cost (from Nebius per-token prices), wall-clock latency, and quality as agreement (mean absolute score difference and top-5 overlap) between the two; each run's metrics are saved to a local JSON file so a summary across 2–3 companies can be produced for the README.
- REQ-008 Secrets: keys are read from `.env` (gitignored); never logged, displayed, sent to the browser or committed. `.env.example` documents the variable names.
- REQ-009 Run instructions: one command to start, documented in the README with prerequisites.
- REQ-010 README content: what it is; old vs new process; which model does what and why; comparison numbers from real runs; limitations; what existed before today; how to run.
- REQ-011 Demo script: a ≤3-minute live demo script and video script for the user.
- REQ-013 (STRETCH, conditional) Target companies: only after AC-001..AC-005 pass in a real run and before ~14:50 Berlin. From the profile's ideal customer, 2–3 Tavily searches for companies showing buying signals (job posts, launches, funding/news); a Nebius model lists up to 5 companies, each with a source URL and a one-line reason grounded in that source; shown as its own section below the leads. If not done by ~14:50 it is dropped and listed as future work in the README. Never delays the core, README or push.
- REQ-012 Progress and errors: the page shows pipeline stage progress; a failed external call (Tavily/Nebius) shows a readable error rather than a blank page; a site with too little content still produces a profile from search results or an explicit error.

## Acceptance Criteria

- AC-001 (REQ-001, UC-001) For https://www.autobyteus.com the page shows a product profile with its source URL(s).
- AC-002 (REQ-002/003, UC-001) The page lists ≥ 8 leads, each with a clickable source URL, platform/domain, score 0–10, reason and quote; quotes are marked verified/unverified against the source text.
- AC-003 (REQ-004/005, UC-002) Top leads have drafts with Approve / Edit / Reject that change visible status; edited text is kept; no network call posts anything.
- AC-004 (REQ-007, UC-003) After a run, a comparison table shows for model A and B: tokens, $ cost, latency, and agreement metrics.
- AC-005 (UC-001) A full run on a judge-style URL completes in ≈ 60–90 s on a normal connection (measured and reported).
- AC-006 (REQ-008) `git grep` for key patterns finds nothing; `.env` is ignored; keys never appear in browser responses or logs.
- AC-007 (REQ-007/010) README comparison table contains numbers from real runs on 2–3 companies (autobyteus.com plus 1–2 others).
- AC-008 (REQ-009, UC-004) Fresh clone + `.env` + documented command starts the app.
- AC-009 (REQ-012) An invalid/unreachable URL or a missing key gives a readable error.
- AC-011 (REQ-013, stretch) When built: the run shows up to 5 target companies, each with a working source link and a reason supported by that source; the run still finishes in about 90 s.
- AC-010 (REQ-011) Demo script file exists in the repo/ticket and fits 3 minutes.

## Relevant Scenarios And Journeys

- S-001 Supported Normal Scenario (UC-001/002/003): judge names a company → user pastes URL → Run → stages progress → profile, leads, scores, drafts, comparison appear → user approves/edits/rejects drafts. Evidence: Task description, event brief (Nebius × Tavily card).
- S-002 Supported Explicit Edge Scenario (REQ-012): URL unreachable or thin site → readable error or search-based profile. Evidence: live-judge requirement (any company).
- S-003 Supported Normal Scenario (UC-004): judge runs it locally from the README. Evidence: GTM bounty "instructions to try it".

## UI, Interaction, And Experience Requirements

- Applicable: Yes, minimal. Single page: URL input + Run; stage progress; profile card; leads table (score, platform, quote, link); drafts with Approve/Edit/Reject; model-comparison table; "which model does what" panel. No Product Design requested.

## Quality And Non-Functional Requirements

- Runtime ≈ 1 minute per run; Tavily ≤ ~30 credits per run (account has 9,000 event credits, 100 requests/min shared); Nebius cost per run reported (expected cents).
- No third-party install required if possible (fastest to run for judges).

## Data Continuity And Acceptable Loss

- Persisted data: No (only local run JSON files under a gitignored `runs/` folder; loss acceptable).

## External Contracts And Dependencies

- Nebius Token Factory, OpenAI-compatible: `https://api.tokenfactory.nebius.com/v1/` (chat completions; `GET /models?verbose=true` returns per-token prices).
- Tavily: `POST https://api.tavily.com/search` (Bearer key; basic 1 credit, advanced 2), `POST /extract`.

## Assumptions

- A-1 The user creates `lead-radar/.env` with `NEBIUS_API_KEY` and `TAVILY_API_KEY` before end-to-end checks.
- A-2 (Measured 14:08: 2 advanced searches returned 10 results each from reddit/linkedin/x/medium; many are articles/listicles, so the scorer must down-rank non-person content) Tavily indexes enough public Reddit/HN/X/LinkedIn/blog content to find ≥ 8 candidates for a typical B2B tool (feasibility to be measured in the first real run; X/LinkedIn coverage is expected to be thinner than Reddit/HN — stated as a limitation, not promised).

## Decisions

| ID | Decision | Owner | Reasoning / recommendation |
| --- | --- | --- | --- |
| D-1 | Which two Nebius models to compare on the scoring step | Asked the user; proceeding on recommended default (user informed), changeable in `.env` | Llama models are no longer in the live catalog (Measured: `/v1/models`). Scorer A = `zai-org/GLM-5.3-Flash` ($0.15/$0.50 per 1M, with `reasoning_effort:"low"`); scorer B = `moonshotai/Kimi-K3.1-Pro` ($2/$10, strongest, with `chat_template_kwargs:{thinking:false}`); profile = `deepseek-ai/DeepSeek-V4.1-Flash-1017` ($0.30/$1.20); drafts = `moonshotai/Kimi-K3.1-Pro`. Prices are read live from `/v1/models?verbose=true`. |
| D-2 | Public GitHub repo under the user's account and its name | `Needs user` — open; gates only the push at delivery | `gh` is logged in as `ryan-zheng-teki`. Recommend public repo `lead-radar`; push only after explicit yes. |
| D-3 | Solo or team demo; who presents | Asked; proceeding on default solo (user informed) | Script written for one speaker; trivially re-split. |
| D-7 | Leads are people/posts (core); companies only as a conditional stretch | User delegated ("You decide, we need to win, show people it works", ~14:25) → Solution Designer | People/posts match the user's old process (GTM usefulness 40%) and carry explicit sourced need; a reliable working demo wins more than breadth. The company view adds a recognizable "accounts" angle for the Nebius × Tavily judges, so it is built only if the core already works. |
| D-4 | Stack | Solution Designer | Node 22 with zero npm dependencies (built-in `fetch` + `http`), one HTML page. No pip on this machine, and judges can run it with only Node. |
| D-5 | Quality metric | Solution Designer | Agreement between the two scorers (mean abs. diff, top-5 overlap) — cheap, numeric, honest; the 70B serves as reference. A third-model judge rating is optional if time allows. |
| D-6 | Comparison step | Solution Designer | Scoring: it is the high-volume step where a small model matters for cost/speed. |

## Traceability

UC-001 → REQ-001..004, 006, 012 → AC-001, 002, 005, 009. UC-002 → REQ-005 → AC-003. UC-003 → REQ-007 → AC-004, 007. UC-004 → REQ-008..010 → AC-006, 008. REQ-011 → AC-010.

## Architecture Phase Input

- Map S-001..S-003. Verify model IDs and prices via `/v1/models`. Measure run time and lead count on autobyteus.com.

## Readiness Check

- Content ready for approval: Yes
- Approval recorded: Yes (Solution Designer within direction, user informed; D-2 open for push only)
- Approved requirements package ready for architecture design: Yes
