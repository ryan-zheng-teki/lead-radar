// Step 1: read the company site via Tavily and turn it into a structured product profile.
import { config } from '../config.js';
import { extract, search } from '../tavily.js';
import { chatJson } from '../nebius.js';

export async function buildProfile(url) {
  const domain = new URL(url).hostname.replace(/^www\./, '');
  const [page, related] = await Promise.all([
    extract(url).catch(() => ''),
    search(`${domain} product`, { include_domains: [domain], max_results: 5 }).catch(() => []),
  ]);
  const sources = [];
  let text = '';
  if (page) {
    sources.push(url);
    text += `# ${url}\n${page.slice(0, 7000)}\n\n`;
  }
  for (const r of related) {
    if (text.length > 12000) break;
    if (!sources.includes(r.url)) sources.push(r.url);
    text += `# ${r.url}\n${r.title}\n${r.content}\n\n`;
  }
  if (!text.trim()) throw new Error(`Could not read the site ${url}: Tavily returned no page content and no search results for ${domain}.`);

  const prompt = `You analyse a company's website to find people who need its product.
Website text (from ${domain}):
"""
${text.slice(0, 12000)}
"""
Return JSON only:
{"name": "...", "summary": "one sentence: what it does", "problems": ["problem it solves", ...],
 "ideal_customer": "who buys it", "pain_phrases": ["3-5 phrases a frustrated potential customer would write in their own words"],
 "search_queries": ["4-6 web search queries that find PUBLIC POSTS by people asking for help or complaining about these problems, e.g. 'looking for a tool to ...', 'how do I ... without ...', 'frustrated with ...'. Do not mention the product name."]}
Base every field only on the website text.`;

  const res = await chatJson({ model: config.profileModel, messages: [{ role: 'user', content: prompt }], maxTokens: 3000, accept: (v) => !Array.isArray(v) && Array.isArray(v.search_queries) && v.search_queries.length > 0 });
  const p = res.json;
  return {
    profile: {
      name: p.name || domain,
      summary: p.summary || '',
      problems: p.problems || [],
      ideal_customer: p.ideal_customer || '',
      pain_phrases: p.pain_phrases || [],
      search_queries: (p.search_queries || []).slice(0, 6),
      domain,
      sources,
    },
    call: { model: res.model, usage: res.usage, latencyMs: res.latencyMs },
  };
}
