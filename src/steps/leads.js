// Step 2: search public posts for people expressing the profile's pains.
import { search } from '../tavily.js';

// Discussion sites are where people ask and complain; searched separately so long articles cannot crowd them out.
const DISCUSSION_SOURCES = ['reddit.com', 'news.ycombinator.com', 'indiehackers.com', 'stackoverflow.com', 'quora.com', 'x.com', 'twitter.com'];
const ARTICLE_SOURCES = ['linkedin.com', 'dev.to', 'medium.com'];
const MAX_CANDIDATES = 20;
const MAX_DISCUSSION = 14;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

function collect(settled, queries, profile, mentionsProduct) {
  const byUrl = new Map();
  settled.forEach((s, qi) => {
    if (s.status !== 'fulfilled') return;
    for (const r of s.value) {
      const key = normalizeUrl(r.url);
      if (key.includes(profile.domain)) continue;
      if (mentionsProduct(`${r.title || ''} ${r.content || ''}`)) continue; // own or already-aware content
      const prev = byUrl.get(key);
      if (!prev || r.score > prev.tavilyScore) {
        byUrl.set(key, { url: r.url, title: r.title || '', content: r.content || '', tavilyScore: r.score || 0, query: queries[qi] });
      }
    }
  });
  return [...byUrl.values()].sort((a, b) => b.tavilyScore - a.tavilyScore);
}

export async function findLeads(profile) {
  const queries = profile.search_queries.length ? profile.search_queries : profile.pain_phrases;
  const name = String(profile.name || '').trim();
  const nameRe = name.length >= 4 ? new RegExp(`(?<![\\w])${escapeRe(name)}(?![\\w])`, 'i') : null;
  const mentionsProduct = (text) => Boolean(nameRe && nameRe.test(text));
  const opts = { search_depth: 'advanced', time_range: 'year' };
  const [discussion, articles] = await Promise.all([
    Promise.allSettled(queries.map((q) => search(q, { ...opts, max_results: 8, include_domains: DISCUSSION_SOURCES }))),
    Promise.allSettled(queries.map((q) => search(q, { ...opts, max_results: 4, include_domains: ARTICLE_SOURCES }))),
  ]);
  const all = [...discussion, ...articles];
  const failures = all.filter((s) => s.status === 'rejected');
  if (failures.length === all.length) throw new Error(`Lead search failed: ${failures[0]?.reason?.message || 'no queries'}`);

  const talk = collect(discussion, queries, profile, mentionsProduct);
  const talkKeys = new Set(talk.map((c) => normalizeUrl(c.url)));
  const reads = collect(articles, queries, profile, mentionsProduct).filter((c) => !talkKeys.has(normalizeUrl(c.url)));
  const picked = talk.slice(0, MAX_DISCUSSION);
  const chosen = [...picked, ...reads.slice(0, MAX_CANDIDATES - picked.length)];
  if (chosen.length < MAX_CANDIDATES) chosen.push(...talk.slice(MAX_DISCUSSION, MAX_DISCUSSION + MAX_CANDIDATES - chosen.length));
  return chosen.map((c, i) => ({ id: `L${i + 1}`, platform: platformOf(c.url), ...c }));
}
