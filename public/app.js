// Lead Radar page: streams pipeline events, renders results, keeps approve/edit/reject local.
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtMs = (ms) => `${(ms / 1000).toFixed(1)} s`;
const fmtCost = (c) => (c === null || c === undefined ? 'n/a' : `$${c.toFixed(4)}`);
const short = (m) => String(m || '').split('/').pop();
const scoreCls = (s) => (s >= 8 ? 's-high' : s >= 5 ? 's-mid' : 's-low');

let state = { leads: [], drafts: [], startedAt: 0 };

async function loadModels() {
  const res = await fetch('/api/config');
  const cfg = await res.json();
  $('#models-table tbody').innerHTML = cfg.models.map((m) => `<tr><td>${esc(m.step)}</td><td><code>${esc(m.model)}</code></td><td>${esc(m.why)}</td></tr>`).join('');
  if (cfg.missingKeys.length) showError(`Missing ${cfg.missingKeys.join(' and ')}: copy .env.example to .env, add the key(s) and restart.`);
}

function showError(msg) {
  const el = $('#error');
  el.textContent = msg;
  el.hidden = false;
}

function addStage(ev) {
  const prev = $('#stages li:last-child');
  if (prev) { prev.classList.add('done'); prev.querySelector('.time').textContent = `done at ${fmtMs(ev.elapsedMs)}`; }
  const li = document.createElement('li');
  li.innerHTML = `${esc(ev.message)}<span class="time"></span>`;
  $('#stages').append(li);
}

function finishStages(ok, ms) {
  const last = $('#stages li:last-child');
  if (!last) return;
  last.classList.add(ok ? 'done' : 'failed');
  if (ok) {
    last.querySelector('.time').textContent = `done at ${fmtMs(ms)}`;
    const li = document.createElement('li');
    li.className = 'done';
    li.innerHTML = `Done — sourced leads and drafts ready for your review<span class="time">total ${fmtMs(ms)}</span>`;
    $('#stages').append(li);
  }
}

function renderProfile(p) {
  const el = $('#profile');
  el.hidden = false;
  el.innerHTML = `<h2>Product profile: ${esc(p.name)}</h2>
    <p>${esc(p.summary)}</p>
    <div class="profile-grid">
      <div><h3>Problems it solves</h3><ul>${p.problems.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div><h3>Ideal customer</h3><p>${esc(p.ideal_customer)}</p>
        <h3>Pain phrases</h3><div class="chips">${p.pain_phrases.map((x) => `<span>${esc(x)}</span>`).join('')}</div></div>
    </div>
    <h3 style="margin-top:12px">Search queries</h3><div class="chips">${p.search_queries.map((x) => `<span>${esc(x)}</span>`).join('')}</div>
    <p class="muted">Sources: ${p.sources.map((s) => `<a href="${esc(s)}" target="_blank" rel="noopener">${esc(s)}</a>`).join(' · ')}</p>`;
}

function quoteCell(s) {
  if (!s) return '<span class="muted">—</span>';
  return `<span class="quote">“${esc(s.quote)}”</span> ${s.verified ? '<span class="ok">✓ verified</span>' : '<span class="warn">⚠ unverified</span>'}`;
}

function renderLeads(ev) {
  state.leads = ev.leads;
  state.leadsEvent = ev;
  const el = $('#leads');
  el.hidden = false;
  const warn = ev.scorerError ? `<div class="error">One scorer failed: ${esc(ev.scorerError)}</div>` : '';
  el.innerHTML = `<h2>Leads (${ev.leads.length}) — ranked by ${esc(short(ev.scorerA))}</h2>${warn}
    <table><thead><tr><th class="num">${esc(short(ev.scorerA))}</th><th class="num">${esc(short(ev.scorerB) || 'B')}</th><th>Where</th><th>Post</th><th>Why it fits · evidence quote</th></tr></thead><tbody>
    ${ev.leads.map((l) => `<tr>
      <td class="num"><span class="score ${scoreCls(l.a?.score ?? 0)}">${l.a?.score ?? '–'}</span></td>
      <td class="num">${l.b ? `<span class="score ${scoreCls(l.b.score)}">${l.b.score}</span>` : `<span class="muted">${ev.pendingB ? '…' : '–'}</span>`}</td>
      <td>${esc(l.platform)}</td>
      <td><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title || l.url)}</a></td>
      <td>${esc(l.a?.reason || '')}<br>${quoteCell(l.a)}</td></tr>`).join('')}
    </tbody></table>`;
}

function renderDrafts(ev) {
  state.drafts = ev.drafts.map((d) => ({ ...d, status: 'pending', editing: false }));
  $('#drafts').hidden = false;
  drawDrafts(ev.model);
}

function drawDrafts(model = state.draftModel) {
  state.draftModel = model;
  const el = $('#drafts');
  if (!state.drafts.length) { el.innerHTML = '<h2>Drafts</h2><p class="muted">No lead scored 5 or higher, so no drafts were written.</p>'; return; }
  el.innerHTML = `<h2>Draft openers (${state.drafts.length}) — written by ${esc(short(model))}, approved by you</h2><div class="drafts-grid">${state.drafts.map((d, i) => {
    const lead = state.leads.find((l) => l.id === d.leadId) || {};
    const body = d.error ? `<div class="error">Draft failed: ${esc(d.error)}</div>`
      : d.editing ? `<textarea data-i="${i}">${esc(d.text)}</textarea>` : `<div class="text">${esc(d.text)}</div>`;
    const actions = d.error ? '' : d.editing
      ? `<button class="approve" data-act="save" data-i="${i}">Save &amp; approve</button><button data-act="cancel" data-i="${i}">Cancel</button>`
      : `<button class="approve" data-act="approve" data-i="${i}">Approve</button><button data-act="edit" data-i="${i}">Edit</button><button class="reject" data-act="reject" data-i="${i}">Reject</button>${d.status === 'approved' ? `<button data-act="copy" data-i="${i}">Copy</button>` : ''}`;
    return `<div class="draft ${d.status}">
      <span class="badge ${d.status}">${d.status === 'approved' ? (d.edited ? 'Approved (edited)' : 'Approved') : d.status === 'rejected' ? 'Rejected' : 'Pending review'}</span>
      <div><span class="score ${scoreCls(lead.a?.score ?? 0)}">${lead.a?.score ?? '–'}</span> <a href="${esc(lead.url)}" target="_blank" rel="noopener">${esc(lead.title)}</a> <span class="muted">· ${esc(lead.platform)}</span></div>
      <div class="quote muted">“${esc(lead.a?.quote)}”</div>
      ${body}<div class="actions">${actions}</div></div>`;
  }).join('')}</div>`;
}

$('#drafts').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const d = state.drafts[Number(btn.dataset.i)];
  const act = btn.dataset.act;
  if (act === 'approve') d.status = 'approved';
  if (act === 'reject') d.status = 'rejected';
  if (act === 'edit') d.editing = true;
  if (act === 'cancel') d.editing = false;
  if (act === 'save') {
    d.text = $(`#drafts textarea[data-i="${btn.dataset.i}"]`).value;
    d.editing = false; d.edited = true; d.status = 'approved';
  }
  if (act === 'copy') {
    await navigator.clipboard.writeText(d.text).catch(() => {});
    btn.textContent = 'Copied';
    return;
  }
  drawDrafts();
});

function renderCompanies(ev) {
  const el = $('#companies');
  el.hidden = false;
  if (ev.error || !ev.companies.length) {
    el.innerHTML = `<h2>Target companies (buying signals)</h2><p class="muted">Target companies unavailable${ev.error ? `: ${esc(ev.error)}` : ' for this run.'}</p>`;
    return;
  }
  el.innerHTML = `<h2>Target companies (buying signals)</h2>
    <table><thead><tr><th>Company</th><th>Signal</th><th>Why · source</th></tr></thead><tbody>
    ${ev.companies.map((c) => `<tr><td><strong>${esc(c.company)}</strong></td><td>${esc(c.signal)}</td><td>${esc(c.reason)}<br><a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.title || c.url)}</a></td></tr>`).join('')}
    </tbody></table>`;
}

function renderComparison(ev) {
  const el = $('#comparison');
  el.hidden = false;
  const c = ev.comparison;
  let scorer = ev.scorerError && !c ? `<div class="error">No scorer comparison for this run: ${esc(ev.scorerError)}</div>` : '';
  if (c) {
    const ratio = c.a.cost && c.b.cost ? `${(c.b.cost / c.a.cost).toFixed(1)}× cheaper` : 'n/a';
    scorer = `<h3>Scorer comparison (same ${c.agreement.comparedLeads} leads)</h3>
      <table><thead><tr><th>Model</th><th class="num">Tokens in</th><th class="num">Tokens out</th><th class="num">Cost</th><th class="num">Latency</th><th class="num">Verified quotes</th></tr></thead><tbody>
      ${[c.a, c.b].map((r, i) => `<tr><td><code>${esc(r.model)}</code> ${i === 0 ? '(A, primary)' : '(B, reference)'}</td><td class="num">${r.tokensIn}</td><td class="num">${r.tokensOut}</td><td class="num">${fmtCost(r.cost)}</td><td class="num">${fmtMs(r.latencyMs)}</td><td class="num">${r.verifiedQuotes}/${r.scored}</td></tr>`).join('')}
      </tbody></table>
      <div class="summary" style="margin-top:12px">
        <div><strong>${ratio}</strong><span class="muted">A vs B cost</span></div>
        <div><strong>${c.agreement.meanAbsDiff?.toFixed(2) ?? 'n/a'}</strong><span class="muted">mean |score A − score B| (0–10)</span></div>
        <div><strong>${c.agreement.top5Overlap}/5</strong><span class="muted">same leads in both top 5</span></div>
      </div>`;
  }
  el.innerHTML = `<h2>Cost, speed &amp; quality</h2>
    <div class="summary"><div><strong>${fmtMs(ev.totalMs)}</strong><span class="muted">total run time</span></div><div><strong>${fmtCost(ev.totalCost)}</strong><span class="muted">total model cost</span></div></div>
    ${scorer}
    <h3 style="margin-top:14px">Every model call in this run</h3>
    <table><thead><tr><th>Step</th><th>Model</th><th class="num">Tokens in</th><th class="num">Tokens out</th><th class="num">Cost</th><th class="num">Latency</th></tr></thead><tbody>
    ${ev.steps.map((s) => `<tr><td>${esc(s.step)}</td><td><code>${esc(s.model)}</code></td><td class="num">${s.in}</td><td class="num">${s.out}</td><td class="num">${fmtCost(s.cost)}</td><td class="num">${fmtMs(s.latencyMs)}</td></tr>`).join('')}
    </tbody></table><p class="muted">Prices are live per-token prices from Nebius Token Factory (<code>/v1/models</code>). Output tokens include reasoning tokens.</p>`;
}

const handlers = {
  stage: addStage,
  profile: (ev) => renderProfile(ev.profile),
  candidates: () => {},
  leads: (ev) => renderLeads({ ...ev, pendingB: !ev.scorerError }),
  reference: (ev) => renderLeads({ ...state.leadsEvent, leads: ev.leads, scorerB: ev.scorerB, scorerError: ev.scorerError, pendingB: false }),
  drafts: renderDrafts,
  companies: renderCompanies,
  comparison: renderComparison,
  done: (ev) => { finishStages(true, ev.totalMs); },
  error: (ev) => { finishStages(false); showError(ev.message); },
};

$('#run-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#run-btn');
  btn.disabled = true; btn.textContent = 'Running…';
  $('#stages').innerHTML = ''; $('#error').hidden = true;
  for (const id of ['profile', 'leads', 'companies', 'drafts', 'comparison']) { $(`#${id}`).hidden = true; $(`#${id}`).innerHTML = ''; }
  try {
    const res = await fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: $('#url').value }) });
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
    showError(`Connection to the Lead Radar server failed: ${err.message}`);
  } finally {
    btn.disabled = false; btn.textContent = 'Find leads';
  }
});

loadModels().catch(() => showError('Could not reach the Lead Radar server.'));
