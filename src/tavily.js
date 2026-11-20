// The only owner of Tavily calls.
import { config } from './config.js';

async function call(path, body) {
  const res = await fetch(`https://api.tavily.com/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.tavilyKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Tavily ${path} failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export async function search(query, opts = {}) {
  const data = await call('search', { query, ...opts });
  return data.results || [];
}

export async function extract(url) {
  const data = await call('extract', { urls: [url], extract_depth: 'basic' });
  return data.results?.[0]?.raw_content || '';
}
