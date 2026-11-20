// Step 4: write a short, specific, honest opener for each top lead.
import { config } from '../config.js';
import { chat } from '../nebius.js';

async function draftOne(profile, lead) {
  const prompt = `You work on ${profile.name} (${profile.summary}).
A person posted this on ${lead.platform}:
Title: ${lead.title}
Text: ${lead.content.slice(0, 1200)}
The key line: "${lead.quote}"

Write a reply to this person (max 70 words) that:
- responds to their specific words first and is genuinely helpful,
- mentions ${profile.name} once, with honest disclosure (e.g. "disclosure: I work on ${profile.name}"),
- has no hype, no emojis, no hashtags, no links, and fits ${lead.platform}'s tone.
Return only the reply text.`;
  const res = await chat({ model: config.draftModel, messages: [{ role: 'user', content: prompt }], maxTokens: 600, temperature: 0.5 });
  return { leadId: lead.id, text: res.content.trim().replace(/^"|"$/g, ''), usage: res.usage, latencyMs: res.latencyMs };
}

export async function draftReplies(profile, leads) {
  const settled = await Promise.allSettled(leads.map((l) => draftOne(profile, l)));
  return settled.map((s, i) => (s.status === 'fulfilled' ? s.value : { leadId: leads[i].id, text: '', error: s.reason.message, usage: { in: 0, out: 0 }, latencyMs: 0 }));
}
