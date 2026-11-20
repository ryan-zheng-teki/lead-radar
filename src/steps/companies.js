// Stretch step: buyer-side companies (would use the product) showing a buying signal.
import { config } from '../config.js';
import { search } from '../tavily.js';
import { chatJson } from '../nebius.js';

const MAX_COMPANIES = 5;
const SIGNALS = ['hiring', 'adopting', 'struggling', 'funding'];

export async function findTargetCompanies(profile) {
  const icp = profile.ideal_customer.split(/[.;,]/)[0].slice(0, 100);
  const problem = (profile.problems[0] || profile.summary).slice(0, 120);
  const queries = [
    { query: `${problem} hiring engineer job`, opts: {} },
    { query: `${icp} struggling with ${problem}`, opts: {} },
    { query: `company rolls out ${problem} internally`, opts: { topic: 'news' } },
  ];
  const settled = await Promise.allSettled(queries.map((q) => search(q.query.slice(0, 380), { search_depth: 'basic', max_results: 8, ...q.opts })));
  const results = settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []))
    .filter((r) => !r.url.includes(profile.domain));
  if (!results.length) throw new Error('no search results for buying signals');
  const byUrl = new Map(results.map((r) => [r.url, r]));

  const items = [...byUrl.values()].map((r) => `URL: ${r.url}\nTitle: ${r.title}\n${(r.content || '').slice(0, 400)}`).join('\n\n');
  const prompt = `Product: ${profile.name} — ${profile.summary}
Ideal customer: ${profile.ideal_customer}

From the search results below, list organizations that would BUY and USE this product (buyer side), named in the result, with one of these signals:
- "hiring": a job post for a role that would use this product
- "adopting": rolling out or building this kind of capability internally
- "struggling": publicly describing the pain this product solves
- "funding": raised money, and would use (not sell) such a product
Exclude: anyone that sells or builds a product or service in the same category as ${profile.name} (competitors and vendors), job boards, recruiters, agencies, listicle or media sites, and ${profile.name} itself.
Return at most ${MAX_COMPANIES}. If none qualify, return []. Do not pad the list.
${items}

Return JSON only: [{"company": "name", "signal": "hiring | adopting | struggling | funding", "reason": "one line, based only on that result", "url": "the exact URL of the result"}]`;
  const res = await chatJson({ model: config.profileModel, messages: [{ role: 'user', content: prompt }], maxTokens: 3000, accept: Array.isArray });
  const companies = res.json
    .filter((c) => c && c.company && byUrl.has(c.url) && SIGNALS.includes(c.signal))
    .slice(0, MAX_COMPANIES)
    .map((c) => ({ company: c.company, signal: c.signal, reason: c.reason || '', url: c.url, title: byUrl.get(c.url).title || '' }));
  return { companies, call: { model: res.model, usage: res.usage, latencyMs: res.latencyMs } };
}
