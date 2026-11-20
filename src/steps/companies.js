// Stretch step: companies showing buying signals (hiring, launches, funding) that match the ideal customer.
import { config } from '../config.js';
import { search } from '../tavily.js';
import { chatJson } from '../nebius.js';

const MAX_COMPANIES = 5;

export async function findTargetCompanies(profile) {
  const icp = profile.ideal_customer.split(/[.;]/)[0].slice(0, 120);
  const problem = profile.problems[0] || profile.summary;
  const queries = [
    { query: `${icp} hiring ${problem}`.slice(0, 380), opts: {} },
    { query: `startup launches ${problem}`.slice(0, 380), opts: {} },
    { query: `${icp} raises funding`.slice(0, 380), opts: { topic: 'news' } },
  ];
  const settled = await Promise.allSettled(queries.map((q) => search(q.query, { search_depth: 'basic', max_results: 8, ...q.opts })));
  const results = settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []))
    .filter((r) => !r.url.includes(profile.domain));
  if (!results.length) throw new Error('no search results for buying signals');
  const byUrl = new Map(results.map((r) => [r.url, r]));

  const items = [...byUrl.values()].map((r) => `URL: ${r.url}\nTitle: ${r.title}\n${(r.content || '').slice(0, 400)}`).join('\n\n');
  const prompt = `Product: ${profile.name} — ${profile.summary}
Ideal customer: ${profile.ideal_customer}

From the search results below, pick up to ${MAX_COMPANIES} specific companies (not ${profile.name}, not media outlets) that show a buying signal for this product: hiring for related roles, launching something related, or raising funding.
${items}

Return JSON only: [{"company": "name", "signal": "hiring | launch | funding | other", "reason": "one line, based only on that result", "url": "the exact URL of the result"}]`;
  const res = await chatJson({ model: config.profileModel, messages: [{ role: 'user', content: prompt }], maxTokens: 3000, accept: Array.isArray });
  const companies = res.json
    .filter((c) => c && c.company && byUrl.has(c.url))
    .slice(0, MAX_COMPANIES)
    .map((c) => ({ company: c.company, signal: c.signal || 'other', reason: c.reason || '', url: c.url, title: byUrl.get(c.url).title || '' }));
  return { companies, call: { model: res.model, usage: res.usage, latencyMs: res.latencyMs } };
}
