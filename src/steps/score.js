// Step 3: one batched scoring call per model over the same candidates.
import { chatJson } from '../nebius.js';
import { verifyQuote } from '../quote.js';

function prompt(profile, candidates) {
  const items = candidates.map((c) => `[${c.id}] (${c.platform}) ${c.title}\n${c.content.slice(0, 700)}`).join('\n\n');
  return `Product: ${profile.name} — ${profile.summary}
Problems it solves: ${profile.problems.join('; ')}
Ideal customer: ${profile.ideal_customer}

Below are public web posts. Classify and score each 0-10 as a sales lead for this product.
kind is one of: "asking" (a person asking for help), "complaining" (a person describing their own pain), "discussing" (a person sharing their own related need or experience), "article" (article, tutorial, course, listicle, news), "competitor" (sells or promotes its own product or service in this category).
- 9-10: kind asking or complaining, about exactly this problem
- 5-8: a person describing their own related need or experience
- at most 4: any article, tutorial, course, listicle or news, however relevant
- 0-2: competitor or vendor self-promotion, or unrelated
For each, give a one-line reason and a short quote (5-25 words) copied VERBATIM from that post's text. Never invent or paraphrase the quote.

${items}

Return JSON only: an array [{"id": "L1", "kind": "asking", "score": 0-10, "reason": "...", "quote": "..."}] with one entry for every id.`;
}

const KINDS = ['asking', 'complaining', 'discussing', 'article', 'competitor'];
const scoreList = (v) => (Array.isArray(v) ? v : v.scores || v.leads || []);

export async function scoreLeads(model, profile, candidates) {
  const res = await chatJson({ model, messages: [{ role: 'user', content: prompt(profile, candidates) }], maxTokens: 4000, temperature: 0, accept: (v) => scoreList(v).some((x) => x && x.id) });
  const list = scoreList(res.json);
  const scores = {};
  for (const s of list) {
    const c = candidates.find((x) => x.id === s.id);
    if (!c) continue;
    const score = Math.max(0, Math.min(10, Number(s.score) || 0));
    scores[s.id] = { score, kind: KINDS.includes(s.kind) ? s.kind : '', reason: s.reason || '', quote: s.quote || '', verified: verifyQuote(s.quote, `${c.title}\n${c.content}`) };
  }
  return { model, scores, usage: res.usage, latencyMs: res.latencyMs };
}
