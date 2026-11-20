# Lead Radar: 3-minute demo script

Setup before going on stage:
- `npm start` is running, `http://localhost:3000` is open and zoomed to about 110 %.
- One run on https://www.autobyteus.com was done earlier, as a backup tab.
- This README is open in a second tab at "Comparison numbers".

| Time | Show | Say |
| --- | --- | --- |
| 0:00–0:20 | Title of the page | "I find people to talk to by scrolling X, LinkedIn and Reddit for posts from people who have the problem my product solves. That takes 30 to 60 minutes a day. At the end I have a list in my head, with no sources, and tomorrow I start again. Lead Radar does the scrolling. I keep the judgement." |
| 0:20–0:35 | Ask a judge for a company website, type it, press **Find leads** | "Give me any company website." (If nobody answers, use https://linear.app.) "Tavily is reading the site now. A Nebius model is turning it into a product profile: what it solves, who buys it, and how a frustrated buyer would phrase the pain." |
| 0:35–1:10 | The stepper ticks off, then the KPI strip and the profile card appear | Point at the pain phrases and the search queries: "These queries are written the way a person asking for help would write them, not like ads. Tavily runs them over public posts: Reddit, Hacker News, X, LinkedIn, dev.to." |
| 1:10–1:40 | Leads list, about 20 s in (best fits first; **Show N low-fit results** expands to all 20) | "We get 20 leads, each with a link to the source. A small, cheap model, GLM-5.3-Flash, scored each one from 0 to 10, with a reason and a quote copied from the post. A green tick means we found the quote word for word in the source, so nothing here is invented. Articles and vendor posts score low, and people asking for help score high." |
| 1:40–2:10 | Drafts: **Approve** one, **Edit** one (change a phrase, **Save & approve**), **Reject** one, **Copy** | "For the top 5 leads, Kimi-K3.1-Pro writes a short opener. It answers the person's own words and discloses that I work on the product. Nothing is ever posted. I approve, edit or reject each draft, copy it and reply myself." |
| 2:10–2:40 | Model comparison card | "The same leads were also scored by the strongest model, as a reference. The cheap model is about 17 times cheaper and 3 times faster. The scores differ by about 2 points on average, and the two models share 3–4 of their top 5, so it is good enough to filter. This whole run took about 30 seconds and cost about 3 cents. One finding: these models 'think' by default. Without `reasoning_effort: low`, GLM returned empty answers, so we control that per model." |
| 2:40–3:00 | README tab | "Limitations: Tavily covers public posts only, so no login-only content, and the scores are model judgement, which is why a human approves. What existed before: the same find, score and approve pattern in my AutoByteus agent teams. Built today: this standalone app, with no dependencies. It's on GitHub, and you need two keys and `npm start`." |

Fallback: if the live run fails (network), switch to the backup tab and say "here's the run from earlier". The error is shown readably on the page, never as a blank screen.

## Video shot list (about 2:30)

1. **0:00–0:10** Screen recording of scrolling LinkedIn and X by hand, with the voice-over: "The old way: 30–60 minutes a day, no sources."
2. **0:10–0:20** Lead Radar page: type a URL and press Find leads.
3. **0:20–0:45** The stepper ticks, then the profile card appears. Zoom in on the pain phrases and queries.
4. **0:45–1:15** Scroll the leads list. Zoom in on one score, its reason and its ✓ verified quote, then click through to the original Reddit post.
5. **1:15–1:45** Drafts: approve, edit and save, reject, copy. Overlay the caption "Nothing is posted automatically".
6. **1:45–2:10** Model comparison card, then the README's three-company comparison table. Caption: "17× cheaper, 3× faster, ~30 s and ~$0.03 per company".
7. **2:10–2:30** README limitations and "What existed before", then the GitHub URL and `npm start`.
