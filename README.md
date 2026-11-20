# Lead Radar

**Company URL in → sourced, scored public leads plus reply drafts that a human approves.**
Built at the AI Builders × commIT Hack Day Berlin (2026-11-20) for the *GTM Tech Week: Build Something Useful* challenge, on **Tavily** (web reading and search) and **Nebius Token Factory** (all models).

Nothing is ever posted automatically. Lead Radar finds and drafts, and you decide.

## The problem: the old way

Finding people worth replying to meant scrolling X, LinkedIn and Reddit by hand, searching for posts by people who have the problem your product solves. That takes **30–60 minutes a day** and gives an unsourced list in your head or in a spreadsheet. Nobody records why a post looked like a good lead, and the search has to start over for every new product.

## The new way

1. Paste a company website (yours, or the one a judge names) and press **Find leads**.
2. **Profile.** Tavily reads the site and searches the company's domain. A Nebius model turns that text into a product profile: problems solved, ideal customer, the pain phrases a frustrated buyer would write, and 4–6 search queries. Source links are shown.
3. **Lead search.** Tavily runs those queries in parallel over public posts on Reddit, Hacker News, X, LinkedIn, Indie Hackers, dev.to, Stack Overflow, Quora and Medium. Results are deduplicated and the company's own domain is dropped, leaving the top 20 candidates.
4. **Scoring.** A small, fast model scores every candidate from 0 to 10, with a one-line reason and a **verbatim quote** from the post. Each quote is checked against the post text and marked **✓ verified** or **⚠ unverified**: a lead never rests on invented evidence. A strong model scores the same candidates in parallel, as a quality reference. It never delays the results: if it is slow or fails, you still get leads and drafts.
5. **Drafts.** For the top 5 leads that score at least 5, the strongest model writes an opener of 70 words or fewer. It responds to the person's own words, helps first and discloses the affiliation honestly.
6. **You review.** For each draft: **Approve**, **Edit** (then save and approve) or **Reject**, then **Copy** the text and open the source link to reply yourself.
7. **Comparison.** The page shows tokens, cost, latency and agreement for both scorers, plus every model call in the run. Each run is saved to `runs/`.

**A full run takes about 30 s and costs about $0.03.** You get 20 sourced, scored leads and 5 drafts ready for review.

## Which model does what, and why

| Step | Model (Nebius Token Factory) | Why |
| --- | --- | --- |
| Product profile | `deepseek-ai/DeepSeek-V4.1-Flash-1017` | Fast and cheap ($0.30 / $1.20 per 1M tokens in/out), and reliable at turning a web page into structured JSON. |
| Lead scoring A (primary ranking) | `zai-org/GLM-5.3-Flash` | Very cheap ($0.15 / $0.50) and quick with `reasoning_effort: "low"`. This is the model you would run on thousands of posts a day. |
| Lead scoring B (reference) | `moonshotai/Kimi-K3.1-Pro` | The strongest model in the catalog ($2.00 / $10.00). It scores the same leads to measure how much the cheap model loses. |
| Reply drafts | `moonshotai/Kimi-K3.1-Pro` | A human reads every draft, so tone and specificity matter more than cost. Five drafts cost about $0.009. |

Prices are read live from `GET /v1/models?verbose=true` at runtime. Every model can be changed in `.env` (`PROFILE_MODEL`, `SCORER_A_MODEL`, `SCORER_B_MODEL`, `DRAFT_MODEL`).

### What we measured about "thinking" models (this mattered)

Several current Nebius models reason by default, and the reasoning tokens are billed as output tokens. We measured the same scoring prompt:

| Model, setting | Latency | Output tokens (reasoning) | Result |
| --- | --- | --- | --- |
| GLM-5.3-Flash, default, max_tokens 400 | 3.2 s | 400 (400) | **Empty answer**: the whole budget went on reasoning |
| GLM-5.3-Flash, default, max_tokens 1500 | 8.2 s | 897 (819) | OK |
| GLM-5.3-Flash, `reasoning_effort: "low"` | **1.0 s** | 50 (1) | OK. **8× faster, about 18× fewer output tokens** |
| Kimi-K3.1-Pro, default | 3.2–4.6 s | 233–264 (184–207) | OK |
| Kimi-K3.1-Pro, `chat_template_kwargs: {thinking: false}` | **1.2 s** | 64 (0) | OK. **About 3× faster** |
| Nemotron-3.5-Lightning (cheapest), default | 17.5 s | 400 | No JSON, only prose: unusable for this step |

That is why `src/nebius.js` keeps a per-model-family table of thinking controls, and why the cheapest model in the price list was not the cheapest one that worked.

## Comparison numbers from real runs

Three companies, run on 2026-11-20 with the final code (latest run per company). Scorers A and B saw exactly the same 20 candidates. Generated with `node scripts/compare.js`:

| Company | Leads (A ≥ 7) | Cost A | Cost B | B/A cost | Latency A | Latency B | Verified quotes A / B | Mean abs. score diff | Top-5 overlap | Full run | Full run cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tavily.com | 20 (1) | $0.0011 | $0.0206 | 18.6× | 4.5 s | 17.0 s | 20/20 / 20/20 | 2.15 | 4/5 | 29.3 s | $0.0334 |
| linear.app | 20 (2) | $0.0010 | $0.0180 | 17.3× | 5.3 s | 15.2 s | 20/20 / 20/20 | 1.90 | 3/5 | 30.5 s | $0.0291 |
| autobyteus.com | 20 (10) | $0.0012 | $0.0184 | 15.7× | 5.4 s | 18.2 s | 20/20 / 20/20 | 1.95 | 3/5 | 33.7 s | $0.0295 |
| **Average** | 20 (4.3) | $0.0011 | $0.0190 | 17.1× | 5.1 s | 16.8 s | | 2.00 | 3.3/5 | 31.1 s | $0.0307 |

What the numbers say:

- **Cost and speed:** the cheap scorer is **about 17× cheaper and about 3× faster** than the strong one (5.1 s against 16.8 s for 20 leads). Scoring 1,000 posts a day would cost **about $0.06 with GLM-5.3-Flash and about $0.95 with Kimi-K3.1-Pro**.
- **Quality:** on a 0–10 scale the two models differ by about **2 points per lead** on average, and they share **3–4 of their top-5 leads**. Both separate people asking for help from articles and vendor posts in the same way. The gap is almost entirely an **offset**, not disagreement. The strong model is stricter: it gave an average score of 3.4 against 5.3 from the cheap model, and the cheap model scored higher on 53 of the 60 leads and lower on only 1. So with the cheap model, set the bar about 2 points higher (≥ 7 instead of ≥ 5). In practice the cheap model is good enough to *filter* and rank. A human reviews every draft anyway, and the strong model's scores sit next to the cheap model's for every lead.
- **Grounding:** all 60 quotes from each scorer were found verbatim in the source text. In earlier runs, a quote that was not found was flagged ⚠ unverified in the UI.
- **Whole pipeline:** about **31 s and $0.03 per company**. That covers reading the site, the profile, 6 Tavily searches, two scorers and 5 drafts. Leads and drafts show up after about 20 s, because the reference scorer runs in parallel and only fills in the comparison. The old manual way took 30–60 minutes.

## Limitations (honest)

- **Coverage:** Tavily's index includes public posts from Reddit, Hacker News, LinkedIn, X, Medium and others, but not everything. Content behind a login and most of X are only partly covered. Many results are blog posts or articles, which the scorer marks down instead of dropping.
- **Scores are model judgement.** The reasons and verified quotes let you check them quickly, but they are not ground truth. The A/B agreement above is agreement between models, not accuracy measured against human labels.
- **Quotes are verified only against the snippet Tavily returned**, not the full page.
- **Freshness:** searches are limited to the last year, but a post can still be old or already answered. Check the date when you open it.
- **No posting, by design.** No account connections and no CRM export. Approvals live in the browser tab, and each run's data is saved to `runs/`.
- A hack-day prototype: no automated test suite, a single user, run locally.
- Built for a laptop screen. On a phone the leads and comparison tables are wider than the screen, so the page zooms out.

## Next steps

- **Target companies:** from the profile's ideal customer, search for companies showing buying signals (job posts, launches, funding news) and list them with a source link and a one-line reason, next to the people-level leads.
- Make the page work on phones, and add an automated test of the pipeline with recorded API responses.

## What existed before today

- **AutoByteus** (https://www.autobyteus.com), the author's agent-team orchestration platform. Its *Marketing Reply Scout* and *Event Networking* agent teams use the same *find → score → human approves* pattern inside agent conversations.
- **Built today:** this standalone app, which needs only Node and the two keys. That covers the pipeline, the Tavily and Nebius clients, quote verification, the review UI, the two-model comparison and the measurements above. It has no dependencies and uses no code from AutoByteus.

## Try it

Requirements: **Node.js 22 or newer** (no `npm install` needed: zero dependencies), a Nebius Token Factory API key, and a Tavily API key.

```bash
git clone https://github.com/ryan-zheng-teki/lead-radar.git
cd lead-radar
cp .env.example .env      # then put your NEBIUS_API_KEY and TAVILY_API_KEY in .env
npm start                 # or: node server.js
# open http://localhost:3000, enter a company URL, press "Find leads"
```

- `PORT` changes the port (default 3000), and `DRAFT_COUNT` the number of drafts (default 5).
- `LEAD_RADAR_ENV_FILE=/path/to/.env` loads keys from another file.
- `npm run compare` prints the comparison table over your own runs in `runs/`.
- Keys stay on the server. They are never sent to the browser, logged or committed (`.env` is gitignored).

## How it is built

The stack is Node 22 with no dependencies: `fetch` and `node:http`. One static page in vanilla JS receives the run as a stream of progress events (NDJSON). See [DESIGN.md](DESIGN.md).

```
server.js              HTTP boundary + composition root (/api/run streams progress events)
src/pipeline.js        run sequence: profile → leads → scoring A ∥ B → drafts → comparison
src/steps/*.js         profile, leads, score, draft (one concern each)
src/nebius.js          the only Nebius caller: thinking controls per model family, JSON retry, live prices
src/tavily.js          the only Tavily caller
src/quote.js           verbatim quote check
src/compare.js         cost + agreement metrics
public/                the page
scripts/compare.js     README comparison table from runs/*.json
```

A 3-minute demo script is in [DEMO.md](DEMO.md).
