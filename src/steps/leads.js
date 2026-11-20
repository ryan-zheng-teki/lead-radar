// Step 2: search public posts for people expressing the profile's pains.
import { search } from '../tavily.js';

const PUBLIC_SOURCES = ['reddit.com', 'news.ycombinator.com', 'x.com', 'twitter.com', 'linkedin.com', 'indiehackers.com', 'dev.to', 'stackoverflow.com', 'quora.com', 'medium.com'];
const MAX_CANDIDATES = 20;

function normalizeUrl(u) {
  try {
    const x = new URL(u);
    return (x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/$/, '')).toLowerCase();
  } catch {
    return u;
  }
}

function platformOf(u) {
  const host = new URL(u).hostname.replace(/^(www|old|m)\./, '');
  if (host === 'news.ycombinator.com') return 'Hacker News';
  if (host === 'x.com' || host === 'twitter.com') return 'X';
  const known = { 'reddit.com': 'Reddit', 'linkedin.com': 'LinkedIn', 'indiehackers.com': 'Indie Hackers', 'dev.to': 'dev.to', 'stackoverflow.com': 'Stack Overflow', 'quora.com': 'Quora' };
  for (const [d, name] of Object.entries(known)) if (host === d || host.endsWith('.' + d)) return name;
  return host.endsWith('medium.com') ? 'Medium' : host;
}

export async function findLeads(profile) {
  const queries = profile.search_queries.length ? profile.search_queries : profile.pain_phrases;
  const settled = await Promise.allSettled(
    queries.map((q) => search(q, { search_depth: 'advanced', max_results: 8, time_range: 'year', include_domains: PUBLIC_SOURCES })),
  );
  const failures = settled.filter((s) => s.status === 'rejected');
  if (failures.length === settled.length) throw new Error(`Lead search failed: ${failures[0]?.reason?.message || 'no queries'}`);

  const byUrl = new Map();
  settled.forEach((s, qi) => {
    if (s.status !== 'fulfilled') return;
    for (const r of s.value) {
      const key = normalizeUrl(r.url);
      if (key.includes(profile.domain)) continue;
      const prev = byUrl.get(key);
      if (!prev || r.score > prev.tavilyScore) {
        byUrl.set(key, { url: r.url, title: r.title || '', content: r.content || '', tavilyScore: r.score || 0, query: queries[qi] });
      }
    }
  });
  return [...byUrl.values()]
    .sort((a, b) => b.tavilyScore - a.tavilyScore)
    .slice(0, MAX_CANDIDATES)
    .map((c, i) => ({ id: `L${i + 1}`, platform: platformOf(c.url), ...c }));
}
