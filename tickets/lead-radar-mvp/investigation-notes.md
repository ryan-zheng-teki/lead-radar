# Investigation Notes — lead-radar-mvp

## Investigation Meta

- Package: `lead-radar-mvp`; owner: Solution Designer; date 2026-11-20 (13:38–14:12 Berlin).
- Workspace: repo `/home/autobyteus/workspace/aibuilders-hackday-berlin-2026-11-20/lead-radar` (branch `main`, base commit `922954d`, new repo created for this ticket); ticket worktree `/home/autobyteus/workspace/aibuilders-hackday-berlin-2026-11-20/lead-radar-mvp` on branch `ticket/lead-radar-mvp`; finalization target `main`, then push to the GitHub repo the user approves (D-2, open).
- Secrets: `/home/autobyteus/workspace/aibuilders-hackday-berlin-2026-11-20/lead-radar/.env` (mode 600, gitignored, holds `NEBIUS_API_KEY`, `TAVILY_API_KEY`; the user gave both keys in chat and the Solution Designer wrote them in without printing them). The worktree has no `.env`: run with `LEAD_RADAR_ENV_FILE=/home/autobyteus/workspace/aibuilders-hackday-berlin-2026-11-20/lead-radar/.env` or copy it (never commit).
- Authorities read: requirements-engineering.md, ticket-scope.md, finding-the-cause.md, handoff.md, project-documents.md, architecture-design.md, design-principles.md.

## Initial Request And Clarifications

Task `ai-builders-commit-hack-day-berlin-2026-2` (full text in requirements doc). User conversation: asked about Nebius, redeemed $100 Nebius code and 8,000 Tavily credits (account now shows 9,000), supplied keys. Did not answer D-1..D-3; Solution Designer proceeded on defaults, informed the user (14:12); push stays gated.

## Source Log

| Source | What it established | How |
| --- | --- | --- |
| `/home/autobyteus/workspace/aibuilders-hackday-berlin-2026-11-20/event-details.md` | Challenge criteria, deadlines | Read |
| https://docs.tokenfactory.nebius.com/api-reference/examples/list-of-models.md | Base URL `https://api.tokenfactory.nebius.com/v1/`, OpenAI-compatible | Read |
| `GET /v1/models?verbose=true` with the user's key | 24 live models + per-token prices (pricing.prompt / pricing.completion in $ per token) | Measured (HTTP 200) |
| https://docs.tokenfactory.nebius.com/june-2026-deprecation-notice | DeepSeek-V3.2, Kimi-K2.5, GLM-5, gpt-oss-120b-fast removed | Read |
| https://benchlm.ai/hosts/nebius | Quality score / speed per model (third party) | Read |
| https://docs.tavily.com/documentation/api-reference/endpoint/search | `/search` params, credits (basic 1, advanced 2) | Read |
| Tavily `/extract`, `/search` with the user's key | Works; timings below | Measured |

## Runtime, Probe, Or Reproduction Findings

Probes: `/tmp/probe.mjs`, `/tmp/probe2.mjs`, `/tmp/tprobe.mjs` (disposable, not promoted; the measurements are recorded here).

Live model prices ($/1M in/out, from `/v1/models`): GLM-5.3-Flash 0.15/0.50; Kimi-K3.1-Pro 2.00/10.00; DeepSeek-V4.1-Flash-1017 0.30/1.20; Nemotron-3_5-Lightning 0.06/0.24; Qwen3-30B-A3B-Instruct-2507 0.10/0.30; gpt-oss-120b 0.15/0.60. No Llama models in the catalog any more.

Single scoring prompt (Measured):

| Model, setting | HTTP | Latency | Completion tokens (reasoning) | Content |
| --- | --- | --- | --- | --- |
| GLM-5.3-Flash, default, max_tokens 400 | 200 | 3.2 s | 400 (400) | **empty**: budget used up by reasoning |
| GLM-5.3-Flash, default, max 1500 | 200 | 8.2 s | 897 (819) | JSON ok |
| GLM-5.3-Flash, `reasoning_effort:"low"` | 200 | **1.0 s** | 50 (1) | JSON ok |
| GLM-5.3-Flash, `chat_template_kwargs.enable_thinking:false` | 200 | 10.2 s | 1059 (1059) | empty: ignored |
| GLM-5.3-Flash, `thinking:{type:disabled}` | 200 | 8.4 s | 939 (860) | ignored |
| Kimi-K3.1-Pro, default | 200 | 3.2–4.6 s | 233–264 (184–207) | JSON ok |
| Kimi-K3.1-Pro, `chat_template_kwargs.thinking:false` | 200 | **1.2 s** | 64 (0) | JSON ok |
| DeepSeek-V4.1-Flash-1017, default | 200 | 2.1 s | 241 (193) | JSON ok |
| Nemotron-3_5-Lightning, default | 200 | 17.5 s | 400 | prose "thinking process", no JSON |
| gpt-oss-120b, `reasoning_effort:"low"` | 200 | 0.7 s | 140 | JSON ok |
| Qwen3-30B-A3B-Instruct-2507 | 200 | 2.1 s | 104 | JSON ok |

Consequences: every call must set the model's thinking control and a generous `max_tokens`; the model reply may wrap JSON in prose/fences, so parse the first JSON object/array; `usage.completion_tokens` includes reasoning tokens (cost must use it).

Tavily (Measured): `/extract` on https://www.autobyteus.com: 1.26 s, 1,373 chars of markdown (hero text "Human-Guided, Self-Improving Agent Team Orchestration Platform…"); thin, so complement with a `/search` restricted to the company domain. `/search` advanced, `include_domains` [reddit.com, news.ycombinator.com, x.com, linkedin.com, indiehackers.com, dev.to, medium.com], `time_range:"year"`, max 10: 4.3–4.6 s, 10 results each, mostly reddit posts, some LinkedIn posts, an X post, and Medium listicles. Searches run in parallel. Account: 9,000 credits, 100 requests/min shared.

## External Contracts, Standards, And Dependencies

- Nebius: `POST /v1/chat/completions` (OpenAI shape), `Authorization: Bearer`; `usage.prompt_tokens/completion_tokens`.
- Tavily: `POST https://api.tavily.com/search` and `/extract`, `Authorization: Bearer tvly-…`; result fields `url,title,content,score,raw_content?`.

## Persisted Data And State Facts

None existing. New: per-run JSON under gitignored `runs/` (disposable).

## Supplemental Artifact Inventory

None (probes disposable).

## Assumptions, Unknowns, And Risks

- R-1 Leads may include vendor articles rather than people with a need: the scoring prompt must score "a person expressing the need" high and articles/self-promotion low.
- R-2 Kimi latency under load is unknown; scoring is batched (all candidates in one or two calls) to keep calls few.
- R-3 Quote verification by substring may fail on whitespace/case: normalize before comparing.

## Architecture Investigation Findings

Greenfield. Node v22.23.3 present (global `fetch`, `node:http`); no pip; npm reachable but not needed. `gh` logged in as `ryan-zheng-teki`.

## Notes For Architecture Design

See design-spec.md.
