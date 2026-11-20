// Prints a markdown comparison table across saved runs (runs/*.json) for the README.
// Usage: node scripts/compare.js [runs-dir]   (keeps the latest run per company)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] || 'runs';
const latest = new Map();
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  const run = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  if (run.comparison) latest.set(run.profile.domain, run);
}
const runs = [...latest.values()];
if (!runs.length) {
  console.log('No runs with a scorer comparison found in', dir);
  process.exit(0);
}

const usd = (c) => (c === null || c === undefined ? 'n/a' : `$${c.toFixed(4)}`);
const sec = (ms) => `${(ms / 1000).toFixed(1)} s`;
const avg = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const short = (m) => m.split('/').pop();
const a0 = runs[0].comparison.a.model;
const b0 = runs[0].comparison.b.model;

const rows = runs.map((r) => {
  const { a, b, agreement } = r.comparison;
  return {
    company: r.profile.domain,
    leads: r.leads.length,
    good: r.leads.filter((l) => (l.a?.score ?? 0) >= 7).length,
    aCost: a.cost, bCost: b.cost, aMs: a.latencyMs, bMs: b.latencyMs,
    aVer: `${a.verifiedQuotes}/${a.scored}`, bVer: `${b.verifiedQuotes}/${b.scored}`,
    mad: agreement.meanAbsDiff, top5: agreement.top5Overlap,
    total: r.totalMs, totalCost: r.totalCost,
  };
});

console.log(`Scorer A = \`${a0}\`, scorer B = \`${b0}\`, same candidates per company.\n`);
console.log(`| Company | Leads (A ≥ 7) | Cost A | Cost B | B/A cost | Latency A | Latency B | Verified quotes A / B | Mean abs. score diff | Top-5 overlap | Full run | Full run cost |`);
console.log(`| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`);
for (const r of rows) {
  console.log(`| ${r.company} | ${r.leads} (${r.good}) | ${usd(r.aCost)} | ${usd(r.bCost)} | ${(r.bCost / r.aCost).toFixed(1)}× | ${sec(r.aMs)} | ${sec(r.bMs)} | ${r.aVer} / ${r.bVer} | ${r.mad.toFixed(2)} | ${r.top5}/5 | ${sec(r.total)} | ${usd(r.totalCost)} |`);
}
console.log(`| **Average** | ${avg(rows.map((r) => r.leads)).toFixed(0)} (${avg(rows.map((r) => r.good)).toFixed(1)}) | ${usd(avg(rows.map((r) => r.aCost)))} | ${usd(avg(rows.map((r) => r.bCost)))} | ${(avg(rows.map((r) => r.bCost)) / avg(rows.map((r) => r.aCost))).toFixed(1)}× | ${sec(avg(rows.map((r) => r.aMs)))} | ${sec(avg(rows.map((r) => r.bMs)))} | | ${avg(rows.map((r) => r.mad)).toFixed(2)} | ${avg(rows.map((r) => r.top5)).toFixed(1)}/5 | ${sec(avg(rows.map((r) => r.total)))} | ${usd(avg(rows.map((r) => r.totalCost)))} |`);
console.log(`\nScoring 1,000 posts/day (extrapolated from the average per-lead cost): A ≈ ${usd((avg(rows.map((r) => r.aCost / r.leads)) * 1000))}/day, B ≈ ${usd((avg(rows.map((r) => r.bCost / r.leads)) * 1000))}/day (${short(a0)} vs ${short(b0)}).`);
