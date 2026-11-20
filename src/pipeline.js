// Owns the run sequence: profile -> lead search -> scoring A (+ reference B in parallel) -> drafts -> comparison.
import { mkdirSync, writeFileSync } from 'node:fs';
import { config } from './config.js';
import { getPrices } from './nebius.js';
import { cost, compareScorers } from './compare.js';
import { buildProfile } from './steps/profile.js';
import { findLeads } from './steps/leads.js';
import { scoreLeads } from './steps/score.js';
import { draftReplies } from './steps/draft.js';

const REFERENCE_DEADLINE_MS = 75_000; // the reference scorer must never hold the demo hostage

function withDeadline(promise, ms, label) {
  let timer;
  const deadline = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} took longer than ${ms / 1000} s; skipped`)), ms); });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

const failed = (err) => ({ error: err.message });

export async function runPipeline(url, emit) {
  const started = Date.now();
  const stage = (name, message) => emit({ type: 'stage', stage: name, message, elapsedMs: Date.now() - started });
  const pricesP = getPrices();

  stage('profile', 'Reading the website with Tavily and profiling the product');
  const { profile, call: profileCall } = await buildProfile(url);
  emit({ type: 'profile', profile, model: profileCall.model });

  stage('leads', `Searching public posts with ${profile.search_queries.length} queries`);
  const candidates = await findLeads(profile);
  if (!candidates.length) throw new Error('No public posts found for this product’s pain points.');
  emit({ type: 'candidates', count: candidates.length });

  stage('scoring', `Scoring ${candidates.length} leads with ${config.scorerA} (reference ${config.scorerB} runs in parallel)`);
  let bDone = false;
  const bPromise = withDeadline(scoreLeads(config.scorerB, profile, candidates), REFERENCE_DEADLINE_MS, `Reference scorer ${config.scorerB}`)
    .catch(failed)
    .finally(() => { bDone = true; });
  let primary = await scoreLeads(config.scorerA, profile, candidates).catch(failed);
  let reference = null;
  let scorerError = null;
  if (primary.error) {
    // Scorer A failed: rank by B so the run still produces leads.
    scorerError = `Scorer ${config.scorerA} failed: ${primary.error}`;
    primary = await bPromise;
    if (primary.error) throw new Error(`Scoring failed: ${scorerError}; ${primary.error}`);
  }
  const leads = candidates
    .map((c) => ({ ...c, a: primary.scores[c.id] || null, b: null }))
    .sort((x, y) => (y.a?.score ?? -1) - (x.a?.score ?? -1));
  emit({ type: 'leads', leads, scorerA: primary.model, scorerB: scorerError ? null : config.scorerB, scorerError });

  const top = leads.filter((l) => (l.a?.score ?? 0) >= 5).slice(0, config.draftCount).map((l) => ({ ...l, quote: l.a.quote }));
  stage('drafts', `Drafting ${top.length} openers with ${config.draftModel}`);
  const drafts = await draftReplies(profile, top);
  emit({ type: 'drafts', drafts, model: config.draftModel });

  if (!scorerError) {
    if (!bDone) stage('reference', `Waiting for reference scores from ${config.scorerB} (for the comparison)`);
    const b = await bPromise;
    if (b.error) scorerError = b.error;
    else {
      reference = b;
      for (const l of leads) l.b = b.scores[l.id] || null;
    }
    emit({ type: 'reference', leads, scorerB: config.scorerB, scorerError });
  }

  const prices = await pricesP;
  const comparison = reference ? compareScorers(primary, reference, prices) : null;
  const draftUsage = drafts.reduce((s, d) => ({ in: s.in + d.usage.in, out: s.out + d.usage.out }), { in: 0, out: 0 });
  const steps = [
    { step: 'profile', model: profileCall.model, ...profileCall.usage, cost: cost(profileCall.usage, prices[profileCall.model]), latencyMs: profileCall.latencyMs },
    { step: 'scoring A', model: primary.model, ...primary.usage, cost: cost(primary.usage, prices[primary.model]), latencyMs: primary.latencyMs },
    ...(reference ? [{ step: 'scoring B', model: reference.model, ...reference.usage, cost: cost(reference.usage, prices[reference.model]), latencyMs: reference.latencyMs }] : []),
    { step: 'drafts', model: config.draftModel, ...draftUsage, cost: cost(draftUsage, prices[config.draftModel]), latencyMs: Math.max(0, ...drafts.map((d) => d.latencyMs)) },
  ];
  const totalCost = steps.every((s) => s.cost !== null) ? steps.reduce((s, x) => s + x.cost, 0) : null;
  const totalMs = Date.now() - started;
  emit({ type: 'comparison', comparison, steps, totalCost, totalMs, scorerError });

  mkdirSync('runs', { recursive: true });
  const runFile = `runs/${new Date().toISOString().replace(/[:.]/g, '-')}-${profile.domain}.json`;
  writeFileSync(runFile, JSON.stringify({ url, at: new Date().toISOString(), totalMs, totalCost, profile, leads, drafts, comparison, steps, scorerError }, null, 2));
  emit({ type: 'done', runFile, totalMs, totalCost, leadCount: leads.length });
}
