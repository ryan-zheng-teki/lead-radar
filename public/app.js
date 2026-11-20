// Lead Radar page: streams pipeline events, renders results, keeps approve/edit/reject local (nothing is sent).
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtS = (ms) => `${(ms / 1000).toFixed(1)} s`;
const fmtCost = (c) => (c === null || c === undefined ? 'n/a' : `$${c.toFixed(4)}`);
const short = (m) => String(m || '').split('/').pop();
const scoreCls = (s) => (s >= 8 ? 'score-high' : s >= 5 ? 'score-mid' : 'score-low');
const link = (url, text, cls = '') => `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${text}</a>`;
const PLATFORM_COLORS = { Reddit: '#FF4500', 'Hacker News': '#FF6600', X: '#0F172A', LinkedIn: '#0A66C2' };
const platformPill = (p) => `<span class="pill pill-platform" style="background:${PLATFORM_COLORS[p] || '#64748B'}">${esc(p)}</span>`;
const STEPS = ['Read site', 'Understand product', 'Search the web', 'Score leads', 'Draft replies'];
const STAGE_STEPS = { profile: [0, 1], leads: [2], scoring: [3], drafts: [4] };

let state;
let timerId;

function resetState() {
  state = { leads: [], drafts: [], leadsEvent: null, tab: 'all', showLow: false, showAllProblems: false, startedAt: Date.now(), stepStatus: STEPS.map(() => 'pending'), stepTimes: [], kpi: {}, url: '' };
}

/* ---------- Progress ---------- */
function drawStepper() {
  $('#stepper').innerHTML = STEPS.map((name, i) => {
    const st = state.stepStatus[i];
    const dot = st === 'done' ? '✓' : st === 'failed' ? '!' : st === 'active' ? '' : i + 1;
    return `<li class="step ${st}"><span class="step-dot">${dot}</span>${name}<span class="step-time">${state.stepTimes[i] ? fmtS(state.stepTimes[i]) : ''}</span></li>`;
  }).join('');
}

function onStage(ev) {
  const steps = STAGE_STEPS[ev.stage];
  state.stepStatus.forEach((st, i) => {
    if (st === 'active' && !(steps || []).includes(i)) { state.stepStatus[i] = 'done'; state.stepTimes[i] = ev.elapsedMs; }
  });
  if (steps) steps.forEach((i) => (state.stepStatus[i] = 'active'));
  if (ev.stage === 'reference') {
    const note = $('#progress-note');
    note.textContent = 'Leads and drafts are ready. Finishing the reference scores from the strong model for the comparison…';
    note.hidden = false;
  }
  drawStepper();
}

function finishProgress(ok, totalMs) {
  clearInterval(timerId);
  if (!ok && state.stepStatus.every((st) => st === 'pending')) { $('#progress').hidden = true; return; }
  state.stepStatus = state.stepStatus.map((st, i) => {
    if (st === 'active') { if (ok) state.stepTimes[i] = totalMs; return ok ? 'done' : 'failed'; }
    return st;
  });
  drawStepper();
  $('#progress-note').hidden = true;
  $('#progress-title').textContent = ok ? 'Done — review your leads and drafts below' : 'Run stopped';
  $('#timer').textContent = ok ? `total ${fmtS(totalMs)}` : `stopped at ${fmtS(Date.now() - state.startedAt)}`;
}

/* ---------- KPIs ---------- */
function drawKpis() {
  const k = state.kpi;
  const tile = (v, label) => `<div class="kpi"><div class="kpi-value">${v ?? '—'}</div><div class="kpi-label">${label}</div></div>`;
  $('#kpis').innerHTML = tile(k.leads, 'Leads found') + tile(k.highFit, 'High-fit (score ≥ 7)') + tile(k.ms !== undefined ? fmtS(k.ms) : null, 'Run time') + tile(k.cost !== undefined ? fmtCost(k.cost) : null, 'Total model cost');
  $('#kpis').hidden = false;
}

/* ---------- Profile ---------- */
function renderProfile(p) {
  const el = $('#profile');
  const problems = state.showAllProblems ? p.problems : p.problems.slice(0, 6);
  const more = p.problems.length - 6;
  el.innerHTML = `<div class="section-head"><h2>${esc(p.name)}</h2><span class="pill pill-accent">Product profile</span></div>
    <p class="profile-summary">${esc(p.summary)}</p>
    <div class="profile-grid">
      <div><h3>Solves</h3><ul>${problems.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        ${more > 0 ? `<button class="link-btn" data-act="problems">${state.showAllProblems ? 'Show less' : `+${more} more`}</button>` : ''}</div>
      <div><h3>Ideal customer</h3><p style="margin:0 0 16px">${esc(p.ideal_customer)}</p>
        <h3>How they describe the pain</h3><div class="pills">${p.pain_phrases.map((x) => `<span class="pill pill-accent">${esc(x)}</span>`).join('')}</div></div>
    </div>
    <details><summary>Search queries used (${p.search_queries.length})</summary><div class="pills">${p.search_queries.map((x) => `<span class="pill pill-muted">${esc(x)}</span>`).join('')}</div></details>
    <div class="sources"><span class="muted">Sources</span>${p.sources.map((s) => link(s, esc(s.replace(/^https?:\/\/(www\.)?/, '')))).join('')}</div>`;
  el.hidden = false;
  el.querySelector('[data-act="problems"]')?.addEventListener('click', () => { state.showAllProblems = !state.showAllProblems; renderProfile(p); });
}

/* ---------- Leads ---------- */
const KIND_PILLS = { asking: ['Asking', 'pill-success'], complaining: ['Complaining', 'pill-success'], discussing: ['Discussing', 'pill-accent'], article: ['Article', 'pill-muted'], competitor: ['Competitor', 'pill-danger'] };
const kindPill = (k) => (KIND_PILLS[k] ? `<span class="pill ${KIND_PILLS[k][1]}">${KIND_PILLS[k][0]}</span>` : '');

function leadCard(l, scorerB) {
  const a = l.a || {};
  const verified = a.quote ? (a.verified ? '<span class="pill pill-success">✓ Verified in source</span>' : '<span class="pill pill-warning">⚠ Not verbatim</span>') : '';
  const b = l.b ? `${esc(short(scorerB).split('-')[0])} ${l.b.score}` : state.leadsEvent?.pendingB ? 'ref …' : '';
  return `<article class="lead">
    <div class="score-col"><div class="score ${scoreCls(a.score ?? 0)}" title="Score from ${esc(short(state.leadsEvent?.scorerA))}">${a.score ?? '–'}</div><div class="score-b" title="Reference score">${b}</div></div>
    <div><div class="lead-top">${platformPill(l.platform)}${kindPill(a.kind)}<span class="lead-meta-right">${verified}</span></div>
      ${link(l.url, `${esc(l.title || l.url)}&nbsp;↗`, 'lead-title')}
      <p class="lead-reason">${esc(a.reason)}</p>
      ${a.quote ? `<blockquote>“${esc(a.quote)}”</blockquote>` : ''}</div></article>`;
}

function renderLeads() {
  const ev = state.leadsEvent;
  if (!ev) return;
  const el = $('#leads');
  const draftIds = new Set(state.drafts.map((d) => d.leadId));
  const tabs = { all: 'All', high: 'High-fit', draft: 'With draft' };
  let list = state.leads;
  if (state.tab === 'high') list = list.filter((l) => (l.a?.score ?? 0) >= 7);
  if (state.tab === 'draft') list = list.filter((l) => draftIds.has(l.id));
  const low = state.tab === 'all' ? list.filter((l) => (l.a?.score ?? 0) < 5) : [];
  const shown = state.tab === 'all' && !state.showLow ? list.filter((l) => (l.a?.score ?? 0) >= 5) : list;
  const warn = ev.scorerError ? `<div class="notice">Reference scorer note: ${esc(ev.scorerError)}</div>` : '';
  el.innerHTML = `<div class="section-head"><h2>Leads <span class="muted" style="font-weight:400">· ${state.leads.length} people and posts, ranked by ${esc(short(ev.scorerA))}</span></h2>
      <div class="tabs" role="tablist">${Object.entries(tabs).map(([k, v]) => `<button class="tab" role="tab" data-tab="${k}" aria-selected="${state.tab === k}">${v}</button>`).join('')}</div></div>
    ${warn}<div class="lead-list">${shown.map((l) => leadCard(l, ev.scorerB)).join('') || '<p class="empty">No leads in this view.</p>'}</div>
    ${low.length ? `<button class="btn btn-secondary show-more" data-act="low">${state.showLow ? 'Hide low-fit results' : `Show ${low.length} low-fit results`}</button>` : ''}`;
  el.hidden = false;
}

$('#leads').addEventListener('click', (e) => {
  const tab = e.target.closest('[data-tab]');
  if (tab) { state.tab = tab.dataset.tab; renderLeads(); }
  if (e.target.closest('[data-act="low"]')) { state.showLow = !state.showLow; renderLeads(); }
});

/* ---------- Drafts ---------- */
function renderDrafts() {
  const el = $('#drafts');
  const n = (s) => state.drafts.filter((d) => d.status === s).length;
  const head = `<div class="section-head"><h2>Reply drafts — you approve</h2>${state.drafts.length ? `<span class="counter"><b>${n('approved')}</b> approved · <b>${n('rejected')}</b> rejected · <b>${n('pending')}</b> pending</span>` : ''}</div>`;
  if (!state.drafts.length) { el.innerHTML = `${head}<p class="empty">No lead scored 5 or higher, so no drafts were written.</p>`; el.hidden = false; return; }
  el.innerHTML = `${head}<div class="drafts-grid">${state.drafts.map((d, i) => {
    const lead = state.leads.find((l) => l.id === d.leadId) || {};
    const pill = d.status === 'approved' ? `<span class="pill pill-success">${d.edited ? 'Approved · edited' : 'Approved'}</span>` : d.status === 'rejected' ? '<span class="pill pill-danger">Rejected</span>' : '';
    let body = `<div class="draft-text">${esc(d.text)}</div>`;
    let actions = `<button class="btn btn-primary" data-act="approve" data-i="${i}">Approve</button><button class="btn btn-secondary" data-act="edit" data-i="${i}">Edit</button><button class="btn btn-ghost" data-act="reject" data-i="${i}">Reject</button>`;
    if (d.error) { body = `<div class="notice">Draft failed: ${esc(d.error)}</div>`; actions = ''; }
    else if (d.editing) { body = `<textarea data-i="${i}" aria-label="Edit draft">${esc(d.text)}</textarea>`; actions = `<button class="btn btn-primary" data-act="save" data-i="${i}">Save &amp; approve</button><button class="btn btn-secondary" data-act="cancel" data-i="${i}">Cancel</button>`; }
    else if (d.status === 'approved') actions = `<button class="btn btn-primary" data-act="copy" data-i="${i}">Copy reply</button>${link(lead.url, 'Open post ↗', 'btn btn-secondary')}<button class="btn btn-ghost" data-act="undo" data-i="${i}">Undo</button>`;
    else if (d.status === 'rejected') actions = `<button class="btn btn-secondary" data-act="undo" data-i="${i}">Undo</button>`;
    return `<article class="draft ${d.status}">
      <div class="lead-top">${platformPill(lead.platform)}<span class="lead-meta-right">${pill}</span></div>
      ${link(lead.url, `${esc(lead.title)}&nbsp;↗`, 'lead-title')}
      <div class="draft-quote">“${esc(lead.a?.quote)}”</div>${body}<div class="draft-actions">${actions}</div></article>`;
  }).join('')}</div>`;
  el.hidden = false;
  el.querySelectorAll('textarea').forEach((t) => { autoGrow(t); t.addEventListener('input', () => autoGrow(t)); t.focus(); });
}

function autoGrow(t) { t.style.height = 'auto'; t.style.height = `${t.scrollHeight + 2}px`; }

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.id);
  toast.id = setTimeout(() => (t.hidden = true), 2600);
}

$('#drafts').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const i = Number(btn.dataset.i);
  const d = state.drafts[i];
  const act = btn.dataset.act;
  if (act === 'copy') {
    await navigator.clipboard.writeText(d.text).then(() => toast('Copied — paste it on the post yourself'), () => toast('Copy failed — select the text and copy it manually'));
    return;
  }
  if (act === 'approve') d.status = 'approved';
  if (act === 'reject') d.status = 'rejected';
  if (act === 'undo') d.status = 'pending';
  if (act === 'edit') d.editing = true;
  if (act === 'cancel') d.editing = false;
  if (act === 'save') { d.text = $(`#drafts textarea[data-i="${i}"]`).value; d.editing = false; d.edited = true; d.status = 'approved'; }
  renderDrafts();
});

/* ---------- Comparison & models ---------- */
function bar(value, max, label, alt) {
  const pct = max ? Math.max(3, Math.round((value / max) * 100)) : 0;
  return `<div class="bar"><div class="bar-track"><div class="bar-fill ${alt ? 'alt' : ''}" style="width:${pct}%"></div></div>${label}</div>`;
}

function renderComparison(ev) {
  const el = $('#comparison');
  const c = ev.comparison;
  let body = ev.scorerError && !c ? `<div class="notice">No scorer comparison for this run: ${esc(ev.scorerError)}</div>` : '';
  if (c) {
    const cheaper = c.a.cost && c.b.cost ? (c.b.cost / c.a.cost).toFixed(1) : null;
    const faster = c.a.latencyMs && c.b.latencyMs ? (c.b.latencyMs / c.a.latencyMs).toFixed(1) : null;
    const maxCost = Math.max(c.a.cost || 0, c.b.cost || 0);
    const maxMs = Math.max(c.a.latencyMs, c.b.latencyMs);
    body = `<p class="headline">${esc(short(c.a.model))} was ${cheaper ? `<b>${cheaper}× cheaper</b>` : 'n/a cheaper'} and ${faster ? `<b>${faster}× faster</b>` : ''} than ${esc(short(c.b.model))}, agreeing on <b>${c.agreement.top5Overlap} of the top 5</b> leads.</p>
      <div class="table-scroll"><table><thead><tr><th>Scorer</th><th class="num">Tokens in / out</th><th>Cost</th><th>Latency</th></tr></thead><tbody>
      ${[c.a, c.b].map((r, i) => `<tr><td><span class="model-pill">${esc(short(r.model))}</span> <span class="muted">${i === 0 ? 'primary' : 'reference'}</span></td><td class="num">${r.tokensIn.toLocaleString()} / ${r.tokensOut.toLocaleString()}</td><td class="bar-cell">${bar(r.cost || 0, maxCost, fmtCost(r.cost), i)}</td><td class="bar-cell">${bar(r.latencyMs, maxMs, fmtS(r.latencyMs), i)}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="tiles">
        <div class="tile"><div class="tile-value">${c.agreement.meanAbsDiff?.toFixed(2) ?? 'n/a'}</div><div class="tile-label">Mean |score A − score B| on a 0–10 scale</div></div>
        <div class="tile"><div class="tile-value">${c.agreement.top5Overlap} / 5</div><div class="tile-label">Same leads in both top 5</div></div>
        <div class="tile"><div class="tile-value">${c.a.verifiedQuotes}/${c.a.scored} · ${c.b.verifiedQuotes}/${c.b.scored}</div><div class="tile-label">Quotes verified in source (A · B)</div></div>
      </div>`;
  }
  el.innerHTML = `<div class="section-head"><h2>Model comparison</h2><span class="counter">Same leads, scored by two Nebius models</span></div>${body}
    <details><summary>Every model call in this run (${ev.steps.length})</summary><div class="table-scroll"><table><thead><tr><th>Step</th><th>Model</th><th class="num">Tokens in / out</th><th class="num">Cost</th><th class="num">Latency</th></tr></thead><tbody>
    ${ev.steps.map((s) => `<tr><td>${esc(s.step)}</td><td><span class="model-pill">${esc(short(s.model))}</span></td><td class="num">${s.in.toLocaleString()} / ${s.out.toLocaleString()}</td><td class="num">${fmtCost(s.cost)}</td><td class="num">${fmtS(s.latencyMs)}</td></tr>`).join('')}
    </tbody></table></div><p class="muted" style="font-size:14px">Live per-token prices from Nebius Token Factory. Output tokens include reasoning tokens.</p></details>`;
  el.hidden = false;
}

function renderModels(models) {
  $('#models').innerHTML = `<div class="section-head"><h2>Which model does what &amp; why</h2></div>
    <div class="table-scroll"><table><tbody>${models.map((m) => `<tr><td style="font-weight:600;white-space:nowrap">${esc(m.step)}</td><td><span class="model-pill">${esc(short(m.model))}</span></td><td class="muted">${esc(m.why)}</td></tr>`).join('')}</tbody></table></div>`;
}

function renderCompanies(ev) {
  const el = $('#companies');
  const head = '<div class="section-head"><h2>Target companies <span class="muted" style="font-weight:400">· buying signals</span></h2></div>';
  if (ev.error) { el.innerHTML = `${head}<p class="empty">Target companies unavailable: ${esc(ev.error)}</p>`; el.hidden = false; return; }
  if (!ev.companies.length) { el.innerHTML = `${head}<p class="empty">No clear buyer signals found in this run.</p>`; el.hidden = false; return; }
  const sig = { hiring: 'pill-success', adopting: 'pill-accent', struggling: 'pill-warning', funding: 'pill-muted' };
  el.innerHTML = `${head}<div class="lead-list">${ev.companies.map((c) => `<article class="lead" style="grid-template-columns:1fr"><div>
    <div class="lead-top"><span class="lead-title" style="margin:0">${esc(c.company)}</span><span class="pill ${sig[c.signal] || 'pill-muted'}">${esc(c.signal)}</span></div>
    <p class="lead-reason">${esc(c.reason)}</p>${link(c.url, `${esc(c.title || c.url)}&nbsp;↗`)}</div></article>`).join('')}</div>`;
  el.hidden = false;
}

/* ---------- Errors ---------- */
function showError(msg) {
  const el = $('#error');
  el.innerHTML = `<span class="alert-icon" aria-hidden="true">!</span><div class="alert-body"><strong>Something went wrong</strong>${esc(msg)}</div><button class="btn btn-secondary" data-act="retry">Try again</button>`;
  el.hidden = false;
  $('#skeleton').hidden = true;
}
$('#error').addEventListener('click', (e) => { if (e.target.closest('[data-act="retry"]')) $('#run-form').requestSubmit(); });

/* ---------- Event stream ---------- */
const handlers = {
  stage: onStage,
  profile: (ev) => { $('#skeleton').hidden = true; renderProfile(ev.profile); },
  candidates: () => {},
  leads: (ev) => {
    state.leads = ev.leads;
    state.leadsEvent = { ...ev, pendingB: !ev.scorerError };
    state.kpi.leads = ev.leads.length;
    state.kpi.highFit = ev.leads.filter((l) => (l.a?.score ?? 0) >= 7).length;
    drawKpis(); renderLeads();
  },
  reference: (ev) => { state.leads = ev.leads; state.leadsEvent = { ...state.leadsEvent, scorerB: ev.scorerB, scorerError: ev.scorerError, pendingB: false }; renderLeads(); },
  drafts: (ev) => { state.drafts = ev.drafts.map((d) => ({ ...d, status: 'pending' })); renderDrafts(); renderLeads(); },
  companies: renderCompanies,
  comparison: (ev) => { state.kpi.ms = ev.totalMs; state.kpi.cost = ev.totalCost; drawKpis(); renderComparison(ev); $('#models').hidden = false; },
  done: (ev) => finishProgress(true, ev.totalMs),
  error: (ev) => { finishProgress(false); showError(ev.message); },
};

async function run(url) {
  resetState();
  state.url = url;
  const btn = $('#run-btn');
  btn.disabled = true; btn.textContent = 'Finding leads…';
  $('#hero').classList.add('compact');
  for (const id of ['error', 'kpis', 'profile', 'leads', 'drafts', 'comparison', 'models', 'companies']) $(`#${id}`).hidden = true;
  $('#progress').hidden = false; $('#skeleton').hidden = false; $('#progress-note').hidden = true;
  $('#progress-title').textContent = 'Finding people who need this product…';
  drawStepper();
  timerId = setInterval(() => ($('#timer').textContent = fmtS(Date.now() - state.startedAt)), 100);
  try {
    const res = await fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line) { const ev = JSON.parse(line); handlers[ev.type]?.(ev); }
      }
    }
  } catch (err) {
    finishProgress(false);
    showError(`Connection to the Lead Radar server failed: ${err.message}`);
  } finally {
    clearInterval(timerId);
    $('#skeleton').hidden = true;
    btn.disabled = false; btn.textContent = 'Find leads';
  }
}

$('#run-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const url = $('#url').value.trim();
  if (!url) { $('#url').focus(); return; }
  run(url);
});
$('#examples').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-url]');
  if (chip) { $('#url').value = chip.dataset.url; run(chip.dataset.url); }
});

resetState();
fetch('/api/config').then((r) => r.json()).then((cfg) => {
  renderModels(cfg.models);
  if (cfg.missingKeys.length) showError(`Missing ${cfg.missingKeys.join(' and ')}. Copy .env.example to .env, add the key(s) and restart the server.`);
}).catch(() => showError('Could not reach the Lead Radar server.'));
