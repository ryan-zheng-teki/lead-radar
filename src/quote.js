// Checks that a model-provided quote really appears in the source text.
function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[‘’“”"'`]/g, '')
    .replace(/…|\.\.\./g, ' ')
    .replace(/[*_#>\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function verifyQuote(quote, content) {
  const q = normalize(quote);
  if (q.length < 8) return false;
  const c = normalize(content);
  if (c.includes(q)) return true;
  // Accept quotes the model joined with "..." if every part is verbatim.
  const parts = String(quote).split(/…|\.\.\./).map(normalize).filter((p) => p.length >= 8);
  return parts.length > 1 && parts.every((p) => c.includes(p));
}
