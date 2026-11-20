# Lead Radar: 3-minute pitch

Spoken script for the live demo at the AI Builders × commIT Hack Day Berlin, 2026-11-20. Lines in *italics* are stage cues, not spoken.

---

**0:00, title page on screen**

Hi, I'm Ryan. I built this today, at this hackathon, from my phone, with a team of AI agents doing the work. It's called Lead Radar.

Here's the problem. To find customers, you scroll through X, LinkedIn and Reddit, looking for people who have the problem your product solves.

It takes a lot of time. At the end you have a list in your head, no sources, and tomorrow you start again.

Lead Radar does the scrolling. You keep the judgement.

---

**0:20, ask a judge**

Can someone give me a company website? Any company.

*(No answer? Type cal.com.)*

*(Type it, press Find leads.)*

---

**0:30, the steps tick off**

First, Tavily reads the website.

Then a Nebius model turns it into a product profile: what it solves, who buys it, and how a frustrated buyer would describe the pain.

*(Point at the purple pain phrases.)*

These are the words real people use when they ask for help. Not marketing words.

Then Tavily searches public posts on Reddit, Hacker News, X and LinkedIn for exactly those words.

---

**1:00, the numbers at the top**

Done in about thirty seconds, for about three cents.

---

**1:10, scroll to the leads**

Here are the leads. Each one links to the original post.

A small, fast model, GLM Flash on Nebius, scored every one from zero to ten, with a reason.

*(Point at a green tick.)*

This green tick means the quote was found word for word in the source. Nothing here is made up.

People asking for help score high. Articles, vendors and competitors score low.

---

**1:40, the drafts**

For the best leads, a stronger model, Kimi on Nebius, writes a short opener. It answers the person's own words, and it says openly that you work on the product.

*(Click Approve on one. Edit one, Save. Reject one.)*

And this is important: nothing is ever posted. You approve, edit or reject every message. The human stays in charge.

---

**2:10, the comparison card**

We also scored the same leads with the stronger model, to compare.

The small model is about sixteen to twenty times cheaper and more than twice as fast. The scores are only about one point apart, and they agree on three of the top five.

So the cheap model is good enough to filter, and the strong model is only used where writing quality matters.

---

**2:40, close**

The limits: it only sees public posts, and the scores are model judgement. That's why a human approves.

What existed before today: the same find, score and approve idea in my AutoByteus agent teams. What was built today is this standalone app, on GitHub, with Nebius and Tavily, by agents I steered from my phone.

That's Lead Radar, from team PocketSwarm. Thank you!

---

## Tips

- If a run gives only one or two strong leads, say: "It only shows real people asking for help. For a niche product that's a short list, and that's the honest answer."
- Zoom the browser to about 120% before you start.
- If the Wi-Fi fails, switch to the backup tab: "Here's a run from earlier."
- Numbers are from 17 real runs (snapshot 2026-11-20 15:04); see the README's comparison section.
