// Step 3: one batched scoring call per model over the same candidates.
import { chatJson } from '../nebius.js';
import { verifyQuote } from '../quote.js';

function prompt(profile, candidates) {
  const items = candidates.map((c) => `[${c.id}] (${c.platform}) ${c.title}\n${c.content.slice(0, 700)}`).join('\n\n');
  return `Product: ${profile.name} — ${profile.summary}
Problems it solves: ${profile.problems.join('; ')}
Ideal customer: ${profile.ideal_customer}

Below are public web posts. Score each 0-10 as a sales lead for this product:
- 9-10: a real person explicitly asking for help with, or complaining about, exactly this problem
- 5-8: a person with a related need, or a discussion where such people are active
- 0-4: an article, listicle, vendor self-promotion, news, or unrelated
For each, give a one-line reason and a short quote (5-25 words) copied VERBATIM from that post's text that shows the need. Never invent or paraphrase the quote.

${items}

Return JSON only: an array [{"id": "L1", "score": 0-10, "reason": "...", "quote": "..."}] with one entry for every id.`;
}

const scoreList = (v) => (Array.isArray(v) ? v : v.scores || v.leads || []);

export async function scoreLeads(model, profile, candidates) {
  const res = await chatJson({ model, messages: [{ role: 'user', content: prompt(profile, candidates) }], maxTokens: 4000, temperature: 0, accept: (v) => scoreList(v).some((x) => x && x.id) });
  const list = scoreList(res.json);
  const scores = {};
  for (const s of list) {
    const c = candidates.find((x) => x.id === s.id);
    if (!c) continue;
    const score = Math.max(0, Math.min(10, Number(s.score) || 0));
    scores[s.id] = { score, reason: s.reason || '', quote: s.quote || '', verified: verifyQuote(s.quote, `${c.title}\n${c.content}`) };
  }
  return { model, scores, usage: res.usage, latencyMs: res.latencyMs };
}
