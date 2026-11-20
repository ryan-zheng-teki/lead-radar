// Extracts the first parseable JSON object/array that `accept` approves from a model reply (tolerates prose, [refs] and ``` fences).
function balancedBlock(text, start) {
  const open = text[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

export function parseJsonBlock(text, accept = () => true) {
  if (!text) throw new Error('empty model reply');
  const cleaned = text.replace(/```(?:json)?/gi, '');
  for (let start = cleaned.search(/[[{]/); start >= 0; ) {
    const block = balancedBlock(cleaned, start);
    if (block) {
      try {
        const value = JSON.parse(block);
        if (typeof value === 'object' && value !== null && accept(value)) return value;
      } catch { /* try the next bracket */ }
    }
    const next = cleaned.slice(start + 1).search(/[[{]/);
    start = next < 0 ? -1 : start + 1 + next;
  }
  throw new Error('no valid JSON in model reply');
}
