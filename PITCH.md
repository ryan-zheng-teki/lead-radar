# Lead Radar: 3-minute pitch

Read it like you're talking to a friend. Short lines, pause at each line break. *Italics are what you do, not what you say.*

---

**Start**

Hi, I'm Ryan.

I built this today, here at the hackathon, from my phone. AI agents did the work, I steered.

It's called Lead Radar.

---

**The problem**

You know how you find customers?

You scroll. X, LinkedIn, Reddit. You look for people who have the problem your product solves.

It takes forever. And at the end you've got a list in your head, no sources, nothing saved.

Next day, you start again.

Lead Radar does the scrolling for you. You just make the calls.

---

**Live demo**

So let's try it. Can someone give me a company? Any website.

*(Nobody? Type cal.com. Press Find leads.)*

First, it reads the website.

Then it figures out what the product does, who buys it, and how people actually talk about the pain.

*(Point at the purple phrases.)*

See these? That's how real people ask for help. Not how marketing talks.

Now it searches Reddit, Hacker News, X and LinkedIn for exactly those words.

*(Results appear.)*

That took about thirty seconds. And it cost about three cents.

---

**The leads**

*(Scroll down to the leads.)*

Here's who it found. Every lead links to the real post.

A small, fast model scores each one, zero to ten, and tells you why.

*(Point at a green tick.)*

This green tick means the quote was found word for word in the post. So nothing here is made up.

People asking for help score high. Ads, articles and competitors score low.

---

**The messages**

For the best ones, a bigger model writes a short first message.

It replies to what that person actually said. And it's honest that you work on the product.

*(Approve one. Edit one and save. Reject one.)*

And nothing gets posted. Ever. You read it, you decide.

---

**The numbers**

*(Show the comparison card.)*

Quick word on models. Both run on Nebius.

The small one is GLM Flash. The big one is Kimi.

The small one is about sixteen to twenty times cheaper and more than twice as fast. And it mostly agrees with the big one.

So we use the cheap one to filter, and the big one only where the writing matters.

---

**Close**

To be fair about the limits: it only sees public posts. And the scores are the model's opinion. That's why a person always approves.

The find, score, approve idea comes from my AutoByteus agent teams. What's new today is this app, built on Nebius and Tavily. It's all on GitHub.

That's Lead Radar. Team PocketSwarm. Thanks!

---

## If something goes wrong

- **Only one or two good leads?** Say: "It only shows real people asking for help. For a niche product, that's a short list. And that's the honest answer."
- **Wi-Fi fails?** Switch to your backup tab: "Here's one I ran earlier."
- Zoom the browser to about 120% before you start.
- Numbers come from 17 real runs (snapshot 2026-11-20 15:04); see the README's comparison section.
