// The only owner of Nebius Token Factory calls: chat, per-model thinking control, live prices.
import { config } from './config.js';
import { parseJsonBlock } from './json.js';

const BASE = 'https://api.tokenfactory.nebius.com/v1';

// Measured: without these, GLM returns empty content and Kimi is 3-4x slower.
const THINKING_CONTROLS = [
  { prefix: 'zai-org/GLM', extra: { reasoning_effort: 'low' } },
  { prefix: 'moonshotai/Kimi', extra: { chat_template_kwargs: { thinking: false } } },
  { prefix: 'deepseek-ai/', extra: { reasoning_effort: 'low' } },
  { prefix: 'openai/gpt-oss', extra: { reasoning_effort: 'low' } },
];

function thinkingControl(model) {
  return THINKING_CONTROLS.find((t) => model.startsWith(t.prefix))?.extra || {};
}

function headers() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${config.nebiusKey}` };
}

export async function chat({ model, messages, maxTokens = 600, temperature = 0.2 }) {
  const started = Date.now();
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature, ...thinkingControl(model) }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`Nebius ${model} failed: HTTP ${res.status} ${body}`);
  }
  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    usage: { in: data.usage?.prompt_tokens || 0, out: data.usage?.completion_tokens || 0 },
    latencyMs: Date.now() - started,
    model,
  };
}

// Chat that must return JSON; retries once with a stricter instruction. Usage/latency are summed.
// `accept(value)` rejects JSON that parses but lacks the expected shape.
export async function chatJson({ accept, ...opts }) {
  const first = await chat(opts);
  try {
    return { ...first, json: parseJsonBlock(first.content, accept) };
  } catch {
    const retry = await chat({
      ...opts,
      messages: [...opts.messages, { role: 'assistant', content: first.content }, { role: 'user', content: 'Return only valid JSON, nothing else.' }],
    });
    return {
      ...retry,
      json: parseJsonBlock(retry.content, accept),
      usage: { in: first.usage.in + retry.usage.in, out: first.usage.out + retry.usage.out },
      latencyMs: first.latencyMs + retry.latencyMs,
    };
  }
}

let pricesPromise;
// $ per token for each model id, from the live catalog (cached for the process).
export function getPrices() {
  pricesPromise ??= fetch(`${BASE}/models?verbose=true`, { headers: headers(), signal: AbortSignal.timeout(20_000) })
    .then((r) => (r.ok ? r.json() : { data: [] }))
    .then((d) => Object.fromEntries((d.data || []).filter((m) => m.pricing).map((m) => [m.id, { in: Number(m.pricing.prompt), out: Number(m.pricing.completion) }])))
    .catch(() => {
      pricesPromise = undefined;
      return {};
    });
  return pricesPromise;
}
