# Design Spec — lead-radar-mvp

Proportionate design for a one-afternoon hackathon prototype. Hard time box: working demo ~14:45, feature freeze 15:30 Berlin.

## Basis

- Approved requirements: `requirements-doc.md` SR-001 (Approved by Solution Designer within direction, user informed). D-2 now approved by the user ("you can create the github repo", 14:14): public repo `https://github.com/ryan-zheng-teki/lead-radar` created empty; push of the finished, secret-free `main` is approved.
- Evidence: `investigation-notes.md` (all model/Tavily facts below are Measured there).
- Authorities read: architecture-design.md, design-principles.md; project `DESIGN.md`: none existed → created at repo root in this ticket (`lead-radar-mvp/DESIGN.md`).
- Change posture: greenfield feature. Design health: `No Design Issue Found` (no existing code). Refactor needed now: no.

## Stack

Node ≥ 22, **zero npm dependencies** (global `fetch`, `node:http`, `node:fs`). One static HTML page with vanilla JS. Start: `node server.js` (or `npm start`), port `3000` (env `PORT`). Rationale: no pip here; judges need only Node.

## Spines

- SP-1 (UC-001/003, primary): `Browser page (URL + Run)` → `POST /api/run` (server.js, streams NDJSON progress events) → `Pipeline.run(url)` → [Profile step → Lead search step → Scoring step (model A ∥ model B) → Draft step] → `runs/<ts>-<domain>.json` → final `result` event rendered by the page.
- SP-2 (UC-002, local in the browser): `Draft card` → Approve / Edit (textarea → Save & approve) / Reject → status badge + Copy button. Browser state only; nothing sent anywhere. (Optionally `POST /api/decision` appends the decision to the run file — skip if short of time.)
- SP-3 (UC-003 aggregate): `node scripts/compare.js` → reads `runs/*.json` → prints a markdown comparison table (per company + average) for the README.

## Pipeline steps (owner: `src/pipeline.js`, which calls each step in order and emits progress events)

1. **Profile** (`src/steps/profile.js`): Tavily `/extract` on the URL (basic) + Tavily `/search` `"<domain> product"` with `include_domains:[domain]`, max 5 → page text (cap ~12k chars) + source URLs. Model `PROFILE_MODEL` = `deepseek-ai/DeepSeek-V4.1-Flash-1017` → JSON `{name, summary, problems[], ideal_customer, pain_phrases[3-5], search_queries[4-6]}` where queries are phrased as a *person* asking for help/complaining (e.g. "how do I … without …", "looking for a tool that …"). If extract fails and search returns nothing → error event "Could not read the site" (REQ-012).
2. **Lead search** (`src/steps/leads.js`): run the 4–6 queries in parallel on Tavily `/search` (`search_depth:"advanced"`, `max_results:8`, `time_range:"year"`, `include_domains:["reddit.com","news.ycombinator.com","x.com","twitter.com","linkedin.com","indiehackers.com","dev.to","stackoverflow.com","quora.com","medium.com"]`). Dedupe by normalized URL, drop the company's own domain, keep top 20 by Tavily score. Candidate = `{id, url, title, content, platform}`; `platform` from hostname.
3. **Scoring** (`src/steps/score.js`): one batched call per model with all candidates (id + title + content truncated ~700 chars) and the profile → JSON array `[{id, score 0-10, reason, quote}]`. Rubric in prompt: 9–10 a person explicitly asking for/complaining about exactly this problem; 5–8 related need; 0–4 article, listicle, vendor self-promotion, or unrelated. `quote` must be copied verbatim from the content. Run model A and model B **in parallel** on the same input; each returns `{scores, usage, latencyMs, model}`. Primary ranking uses model A (the cheap scorer; that is the product's point); B is the reference. **Quote verification** (`src/quote.js`): normalized (lowercase, collapse whitespace, strip quotes/ellipsis) substring of normalized content → `verified: true/false`.
4. **Drafts** (`src/steps/draft.js`): top `DRAFT_COUNT` (default 5) leads by model A score with score ≥ 5. One call per lead **in parallel**, `DRAFT_MODEL` = `moonshotai/Kimi-K3.1-Pro`: ≤ 70 words, references the person's specific words, helpful first, mentions the product once with honest affiliation ("I work on X" / "disclosure: …"), no hype, no links unless natural; platform-appropriate tone.
5. **Comparison** (`src/compare.js`, pure functions): per model tokens in/out, cost $ = tokens × live price, latency ms; agreement = mean absolute score difference, top-5 overlap (|A∩B| of top-5 ids), Spearman optional. Also total run cost and wall time.

## Nebius client (`src/nebius.js`) — the one owner of model calls

- `chat({model, messages, maxTokens}) → {content, usage, latencyMs}`; base URL `https://api.tokenfactory.nebius.com/v1`; `temperature: 0.2` (scoring 0).
- **Thinking control per model family (Measured, required):** `zai-org/GLM*` → `reasoning_effort:"low"`; `moonshotai/Kimi*` → `chat_template_kwargs:{thinking:false}` for scoring, default (thinking) is acceptable for drafts only if latency allows — use `thinking:false` by default; `deepseek-ai/*`, `openai/gpt-oss*` → `reasoning_effort:"low"`. Keep this mapping in one small table in `nebius.js`. `max_tokens` ≥ 2000 for scoring, 600 for drafts/profile.
- `getPrices()` → `GET /v1/models?verbose=true` once at startup (cached): `{id: {in, out}}` in $/token. Missing price → cost shown as "n/a" (not 0).
- JSON extraction helper (`src/json.js`): take the first `{…}`/`[…]` block (strip ```json fences); on parse failure retry once with "Return only valid JSON".
- Never log headers or keys; errors surface `status + message` only.

## Tavily client (`src/tavily.js`)

`search(query, opts)`, `extract(url)`; `Authorization: Bearer ${TAVILY_API_KEY}`; 20 s timeout via `AbortSignal.timeout`.

## Config (`src/config.js`)

Loads env file from `process.env.LEAD_RADAR_ENV_FILE || ./.env` (tiny parser, no dependency) into `process.env` without overriding existing vars. Exposes `NEBIUS_API_KEY`, `TAVILY_API_KEY`, `PROFILE_MODEL`, `SCORER_A_MODEL` (default `zai-org/GLM-5.3-Flash`), `SCORER_B_MODEL` (default `moonshotai/Kimi-K3.1-Pro`), `DRAFT_MODEL`, `DRAFT_COUNT`, `PORT`. Missing key → server starts but `/api/run` returns a readable error naming the missing variable (AC-009). Keys are never sent to the browser.

## HTTP (`server.js`, composition root)

- `GET /` → `public/index.html`; `GET /app.js`, `/style.css` static.
- `GET /api/config` → models per step + "why" text (REQ-006), no keys.
- `POST /api/run {url}` → validates/normalizes URL (adds https://) → streams `application/x-ndjson` events: `{type:"stage", stage, message}`, `{type:"profile", …}`, `{type:"leads", …}`, `{type:"scores", …}`, `{type:"drafts", …}`, `{type:"comparison", …}`, `{type:"done", runFile, totalMs, totalCost}`, `{type:"error", message}`.

## Page (`public/`)

Single page, clean light styling: header "Lead Radar — find people who need your product, sourced and human-approved"; URL input + Run; stage list with ticks and elapsed time; Product profile card (with source links); "Which model does what & why" panel; Leads table sorted by score A (score A, score B, platform, title→link, reason, quote with ✓ verified / ⚠ unverified); Drafts cards (lead link + quote, draft text, Approve / Edit / Reject, status badge, Copy); Comparison table (model, tokens in/out, cost $, latency, plus agreement row). Banner: "Nothing is ever posted automatically."

## Stretch: target companies (REQ-013, only after the core works, cut-off ~14:50)

`src/steps/companies.js`, called by the pipeline after drafts (or in parallel with drafting): 2–3 Tavily `/search` queries built from `profile.ideal_customer` (e.g. `"<ICP> hiring <role>"`, `"<ICP> startup launches <category>"`, `topic:"news"` for funding), `search_depth:"basic"`, max 8, no include_domains. Then one `PROFILE_MODEL` call → JSON `[{company, signal, reason, url}]` (max 5, url must be one of the given result URLs; drop any other). New NDJSON event `{type:"companies"}`; page section "Target companies (buying signals)". Failure here is non-fatal: show "Target companies unavailable" and continue.

## Visual design (SR-003, REQ-014) — authoritative for the page

Starting point: validated page (evidence/API-02-calcom-browser-full.png) works but reads like a long document: small text, dense tables, everything full-width, drafts before leads. Restyle and restructure the page only; **no pipeline, API or data changes** (server.js, src/ untouched except nothing). Files: `public/index.html`, `public/style.css`, `public/app.js`.

Look: calm, premium SaaS (Linear / Vercel / Stripe). Plain CSS custom properties; no frameworks or CDNs (works offline).

- **Tokens:** font `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`; mono `ui-monospace, SFMono-Regular, Menlo`. Background `#F7F8FA`; surface `#FFF`; border `#E6E8EC`; text `#0F172A`; muted `#64748B`; accent `#4F46E5` (hover `#4338CA`, soft `#EEF2FF`); success `#16A34A`/`#DCFCE7`; warning `#D97706`/`#FEF3C7`; danger `#DC2626`/`#FEE2E2`. Radius 12px cards, 8px controls, 999px pills. Shadow `0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)`. Base 16px / 1.55; H1 40px/700, letter-spacing -0.02em; section titles 20px/600. Container max-width 1120px.
- **Top bar:** sticky, white, hairline border: inline-SVG radar mark in an indigo rounded square + "Lead Radar"; right: pill "Nebius Token Factory · Tavily".
- **Hero (empty state):** H1 "Find people who need your product — right now."; subline "Paste a company website. Lead Radar reads it, finds people publicly describing the problem it solves, scores them and drafts a reply. You decide what gets sent."; 56px search-style input with globe icon + primary "Find leads"; example chips `autobyteus.com` `cal.com` `posthog.com` (click = fill + run); trust row "✓ Every lead sourced · ✓ Quotes verified in the source · ✓ Nothing posted automatically". After a run the hero compacts to one row (input + button).
- **Running:** horizontal stepper (Read site → Understand product → Search the web → Score leads → Draft replies): pending grey circle, active indigo spinner, done green check, seconds under each; live total timer; skeleton shimmer cards below. Sections fade/slide in as events arrive.
- **Order of results:** KPI strip → Product profile → Leads → Reply drafts → Model comparison → Which model does what & why → (Target companies if present).
- **KPI strip:** 4 tiles: Leads found · High-fit (A score ≥ 7) · Run time · Total cost $ (4 decimals). 28px/700 numbers.
- **Product profile:** name, one-line summary; two columns "Solves" (max 6 bullets, "+n more" toggle) and "Ideal customer"; pain phrases as soft indigo pills; search queries collapsed under "Search queries used"; sources as small link chips.
- **Leads:** cards, not a table. Left: 44px score circle (≥ 8 green, 5–7 amber, < 5 grey) with A score, beneath "Kimi n". Body: platform pill (Reddit `#FF4500`, Hacker News `#FF6600`, X `#0F172A`, LinkedIn `#0A66C2`, others grey) + title link ↗ (new tab) + reason (muted) + quote as left-bordered italic blockquote + pill "✓ Verified in source" or "⚠ Not verbatim". Tabs: All · High-fit · With draft. Leads with A < 5 collapsed under "Show n low-fit results".
- **Reply drafts — you approve:** header counter "n approved · n rejected · n pending". Card: platform pill + lead title link + short quote; draft in soft panel; buttons primary Approve, secondary Edit, ghost Reject. Edit → auto-growing textarea with "Save & approve"/"Cancel". Approved → green left border, "Approved" pill, buttons "Copy reply" + "Open post ↗"; Rejected → 55 % opacity, "Rejected" pill, "Undo". Toast on copy: "Copied — paste it on the post yourself". Two-column grid ≥ 1200px, one column below.
- **Model comparison:** headline sentence from the numbers (e.g. "GLM-5.3-Flash was 19.1× cheaper and 1.8× faster than Kimi-K3.1-Pro, agreeing on 3 of the top 5"); table Model · Tokens in/out · Cost · Latency with inline horizontal bars for cost and latency; agreement tiles (mean |A−B|, top-5 overlap, verified quotes); "Every model call in this run" collapsed.
- **Which model does what & why:** 4 rows: step · model in mono pill · why · $/1M.
- **Error:** danger-soft alert card with icon, plain message, "Try again"; missing key names the variable.
- **Footer:** "Built at AI Builders × commIT Hack Day Berlin · builds on AutoByteus".
- **Motion/a11y:** 150–200 ms transitions; focus ring 2px accent offset 2px; real `<button>`s; AA contrast; `aria-live="polite"` on the stepper.
- **Projector:** perfect at 1280×720 (no horizontal scroll, text ≥ 14px) and 1920×1080; acceptable at 390px.

Check (AC-012): real run in a browser, screenshots to `evidence/ui/`, look at each and fix what looks off. Time box 15:20 Berlin; the pushed validated version is the fallback.

## Files (Change inventory: all Add)

`package.json` (`"start": "node server.js"`, engines node ≥ 22, no deps), `server.js`, `src/config.js`, `src/nebius.js`, `src/tavily.js`, `src/json.js`, `src/quote.js`, `src/compare.js`, `src/pipeline.js`, `src/steps/{profile,leads,score,draft}.js`, `public/{index.html,app.js,style.css}`, `scripts/compare.js`, `README.md` (replace stub), `DEMO.md` (3-min demo + video script), `DESIGN.md` (created by Solution Designer), `runs/` gitignored (already). Each file < 300 lines.

## README content (REQ-010) and demo (REQ-011)

README: what it is; old process (scrolling X/LinkedIn by hand, ~30–60 min/day, unsourced) vs new (one URL → sourced, scored leads + drafts in ~1 min, human approves); model-per-step table with why (profile: fast+good; scorer A: cheapest fast, the one we'd run at volume; scorer B: strongest, reference; drafts: strongest writer since humans read it); comparison numbers from real runs on 2–3 companies (autobyteus.com plus e.g. https://www.tavily.com and https://linear.app or a judge-style company) via `scripts/compare.js`, including the thinking-on vs off finding; limitations (Tavily index coverage of X/LinkedIn is partial, no login-only content, scores are model judgement, quotes verified only against the snippet, no posting by design); what existed before (AutoByteus + Marketing Reply Scout / Event Networking Team patterns: find → score → approve; today's build is new); how to run (Node 22, `cp .env.example .env`, add keys, `npm start`, open http://localhost:3000). DEMO.md: 3-minute solo script (old way 20 s → live run on judge's URL 90 s → approve/edit a draft 30 s → comparison table + model choices 30 s → limitations/what existed 10 s) and a video shot list.

## Verification intent

Smoke: `node --check` all files; a real end-to-end run on https://www.autobyteus.com (time, lead count ≥ 8, drafts, comparison) and 1–2 more companies; error path with an invalid URL; `git grep -nE "tvly-|v1\.Cm"` empty; browser check of the page (approve/edit/reject).

## Change Scope

Only the new `lead-radar` repo. Leaves alone: AutoByteus and anything outside the repo. Follow-ups: none yet.

## Removal plan / persisted data

N/A (greenfield). Run files are disposable (`Discard or Rebuild`).

## Structural triggers fired

None material. `src/nebius.js` and `src/tavily.js` are real I/O boundaries (not empty indirection). The pipeline is the single sequence owner; steps do not call each other.

## Terminology

lead (a public post/comment by a person), candidate (search result before scoring), profile, scorer A/B, draft, decision (approve/edit/reject). No project glossary found.

## Classification

- `task_size`: Medium (≈15 small new files, one process, two external APIs).
- `architectural_risk`: Low — greenfield, no persistence, no deployment, no concurrency beyond parallel HTTP calls; secrets handled by gitignored `.env` (verified ignored). Uncertainty on model output is bounded by measured probes and JSON-retry.
- Evidence: investigation-notes.md Runtime findings. Escalation trigger: if the first real run cannot return ≥ 8 candidates or takes > 3 min, return a Design Impact to the Solution Designer.
