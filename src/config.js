// Loads keys and model settings from an env file without any dependency.
import { readFileSync, existsSync } from 'node:fs';

const envFile = process.env.LEAD_RADAR_ENV_FILE || '.env';
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

const env = process.env;
export const config = {
  nebiusKey: env.NEBIUS_API_KEY || '',
  tavilyKey: env.TAVILY_API_KEY || '',
  profileModel: env.PROFILE_MODEL || 'deepseek-ai/DeepSeek-V4.1-Flash-1017',
  scorerA: env.SCORER_A_MODEL || 'zai-org/GLM-5.3-Flash',
  scorerB: env.SCORER_B_MODEL || 'moonshotai/Kimi-K3.1-Pro',
  draftModel: env.DRAFT_MODEL || 'moonshotai/Kimi-K3.1-Pro',
  draftCount: Number(env.DRAFT_COUNT || 5),
  port: Number(env.PORT || 3000),
};

export function missingKeys() {
  const missing = [];
  if (!config.nebiusKey) missing.push('NEBIUS_API_KEY');
  if (!config.tavilyKey) missing.push('TAVILY_API_KEY');
  return missing;
}

export function modelPlan() {
  return [
    { step: 'Product profile', model: config.profileModel, why: 'Fast, cheap and good at reading a web page into structured JSON.' },
    { step: 'Lead scoring A (primary)', model: config.scorerA, why: 'Very cheap and fast (with reasoning_effort low) — the model you would run on thousands of posts a day.' },
    { step: 'Lead scoring B (reference)', model: config.scorerB, why: 'Strongest model, run on the same leads as a quality reference to measure how much the cheap model loses.' },
    { step: 'Reply drafts', model: config.draftModel, why: 'Strongest writer: a human reads every draft, so tone and specificity matter more than cost.' },
  ];
}
