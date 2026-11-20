// Pure functions: cost and agreement metrics for the two scorers.
export function cost(usage, price) {
  if (!price) return null;
  return usage.in * price.in + usage.out * price.out;
}

export function topIds(scores, n = 5) {
  return Object.entries(scores).sort((a, b) => b[1].score - a[1].score).slice(0, n).map(([id]) => id);
}

export function compareScorers(a, b, prices) {
  const ids = Object.keys(a.scores).filter((id) => b.scores[id]);
  const mad = ids.length ? ids.reduce((s, id) => s + Math.abs(a.scores[id].score - b.scores[id].score), 0) / ids.length : null;
  const topB = new Set(topIds(b.scores));
  const overlap = topIds(a.scores).filter((id) => topB.has(id)).length;
  const row = (r) => {
    const all = Object.values(r.scores);
    return {
      model: r.model,
      tokensIn: r.usage.in,
      tokensOut: r.usage.out,
      cost: cost(r.usage, prices[r.model]),
      latencyMs: r.latencyMs,
      scored: all.length,
      verifiedQuotes: all.filter((s) => s.verified).length,
    };
  };
  return { a: row(a), b: row(b), agreement: { comparedLeads: ids.length, meanAbsDiff: mad, top5Overlap: overlap } };
}
