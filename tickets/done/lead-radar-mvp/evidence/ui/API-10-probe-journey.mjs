// Temporary API/E2E probe (IR-003): full user journey at a given viewport via raw CDP, live run started by an example chip.
// usage: node journey.mjs <appUrl> <chipUrl> <W> <H> <outDir> <cdpPort>
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [appUrl, chipUrl, W, H, outDir, port] = process.argv.slice(2);
const tag = `API-10-${W}x${H}`;
const chrome = spawn('/usr/bin/chromium', ['--headless=new', '--no-sandbox', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/lr-ir003/profile`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ver; for (let i = 0; i < 40 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(250); } }
function client(wsUrl) {
  const ws = new WebSocket(wsUrl); let id = 0; const pending = new Map(); const listeners = [];
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(JSON.stringify(d.error))) : p.res(d.result); } else if (d.method) listeners.forEach((f) => f(d)); };
  const ready = new Promise((r) => (ws.onopen = r));
  return { ready, on: (f) => listeners.push(f), send: (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); }) };
}
const browser = client(ver.webSocketDebuggerUrl); await browser.ready;
await browser.send('Browser.grantPermissions', { origin: new URL(appUrl).origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
const tgt = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const page = client(tgt.webSocketDebuggerUrl); await page.ready;
const consoleErrors = []; const requests = [];
page.on((d) => {
  if (d.method === 'Runtime.exceptionThrown') consoleErrors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') consoleErrors.push(d.params.args.map((a) => a.value || a.description).join(' '));
  if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') consoleErrors.push(d.params.entry.text);
  if (d.method === 'Network.requestWillBeSent') requests.push(`${d.params.request.method} ${d.params.request.url.replace(new URL(appUrl).origin, '')}`);
});
const setVp = (w, h, mobile = false) => page.send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile });
await setVp(W, H);
for (const d of ['Page', 'Runtime', 'Log', 'Network']) await page.send(`${d}.enable`);
await page.send('Page.bringToFront');
const ev = async (expr) => { const r = await page.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return 'EXCEPTION ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const shot = async (name, w = W, full = false) => {
  const params = { format: 'png' };
  if (full) { const h = await ev('document.documentElement.scrollHeight'); params.captureBeyondViewport = true; params.clip = { x: 0, y: 0, width: +w, height: h, scale: 1 }; }
  const { data } = await page.send('Page.captureScreenshot', params);
  writeFileSync(`${outDir}/${tag}-${name}.png`, Buffer.from(data, 'base64'));
};
const scrollTo = async (sel) => { await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 70); return true})()`); await sleep(400); };
// layout health: horizontal scroll, smallest visible text, clipped text (overflow hidden and content wider/taller than the box), overlapping sibling text blocks
const layout = () => ev(`(() => {
  const vis = [...document.querySelectorAll('body *')].filter(e => e.offsetParent && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
  const clipped = vis.filter(e => { const s = getComputedStyle(e); return (s.overflowX !== 'visible' || s.overflowY !== 'visible' || s.textOverflow === 'ellipsis') && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 2) && !e.closest('.table-scroll') && e.tagName !== 'TEXTAREA'; })
    .map(e => e.tagName.toLowerCase() + '.' + [...e.classList].join('.') + ' "' + e.textContent.trim().slice(0, 40) + '"');
  const boxes = vis.filter(e => !e.closest('[hidden]')).map(e => ({ e, r: e.getBoundingClientRect() })).filter(x => x.r.width && x.r.height);
  const overlaps = [];
  for (let i = 0; i < boxes.length && overlaps.length < 10; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j]; if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (ix > 4 && iy > 4) overlaps.push(a.e.tagName + '.' + a.e.className + ' "' + a.e.textContent.trim().slice(0, 25) + '" x ' + b.e.tagName + '.' + b.e.className + ' "' + b.e.textContent.trim().slice(0, 25) + '"');
  }
  return { innerWidth, scrollWidth: document.documentElement.scrollWidth, hscroll: document.documentElement.scrollWidth > innerWidth,
    minFontPx: Math.min(...vis.map(e => parseFloat(getComputedStyle(e).fontSize))), clipped: clipped.slice(0, 10), overlaps };
})()`);
const out = { viewport: `${W}x${H}`, chip: chipUrl, layout: {} };

await page.send('Page.navigate', { url: appUrl }); await sleep(1500);
out.layout.empty = await layout(); await shot('01-empty');
const t0 = Date.now();
out.chipClicked = await ev(`(()=>{const c=document.querySelector('[data-url=${JSON.stringify(chipUrl)}]'); c.click(); return c.textContent})()`);
await sleep(8000); out.layout.running = await layout(); await shot('02-running');
out.runningStepper = await ev(`[...document.querySelectorAll('#stepper li')].map(l=>l.className+': '+l.textContent.replace(/\\s+/g,' ').trim())`);
for (let i = 0; i < 150; i++) { await sleep(1000); if (await ev(`/Done/.test(document.querySelector('#progress-title').textContent) || !document.querySelector('#error').hidden`)) break; }
out.runSeconds = (Date.now() - t0) / 1000;
out.progressTitle = await ev(`document.querySelector('#progress-title').textContent + ' | ' + document.querySelector('#timer').textContent`);
out.errorShown = await ev(`document.querySelector('#error').hidden ? null : document.querySelector('#error').innerText`);
await sleep(600); await ev('window.scrollTo(0,0); true'); await sleep(300);
out.layout.results = await layout(); await shot('03-results-top');
out.kpis = await ev(`document.querySelector('#kpis').innerText.replace(/\\s+/g,' ')`);
// AC-001 profile + sources
out.profile = await ev(`({ text: document.querySelector('#profile').innerText.slice(0,200).replace(/\\s+/g,' '), sourceLinks: [...document.querySelectorAll('#profile a[href^="http"]')].map(a=>a.href) })`);
// AC-002 leads, tabs, low-fit
await scrollTo('#leads');
const leadInfo = () => ev(`({ cards: document.querySelectorAll('#leads article.lead').length, withLink: [...document.querySelectorAll('#leads article.lead')].filter(a=>a.querySelector('a[href^="http"]')).length, verified: document.querySelectorAll('#leads .pill-success').length, notVerbatim: document.querySelectorAll('#leads .pill-warning').length, showMore: document.querySelector('#leads [data-act="low"]')?.textContent || null, header: document.querySelector('#leads h2').textContent })`);
out.leads = { all: await leadInfo() }; await shot('04-leads');
await ev(`document.querySelector('#leads [data-act="low"]')?.click(); true`); await sleep(200); out.leads.afterShowLow = await leadInfo();
out.leads.sampleCard = await ev(`document.querySelector('#leads article.lead')?.innerText.replace(/\\s+/g,' ').slice(0,300)`);
for (const t of ['high', 'draft', 'all']) { await ev(`document.querySelector('#leads [data-tab="${t}"]').click(); true`); await sleep(200); out.leads['tab_' + t] = await ev(`({ cards: document.querySelectorAll('#leads article.lead').length, selected: document.querySelector('#leads [aria-selected="true"]').textContent })`); }
// AC-003 drafts: approve 0, edit+save 1, reject 2, reject 3 then undo 3, copy 0
const d = (i, a) => `document.querySelector('#drafts button[data-act="${a}"][data-i="${i}"]')?.click();`;
await ev(`${d(0, 'approve')} true`); await sleep(100);
await ev(`${d(1, 'edit')} true`); await sleep(100);
await ev(`(()=>{const t=document.querySelector('#drafts textarea[data-i="1"]'); t.value=t.value+' [API-10 edit]'; return true})()`);
await ev(`${d(1, 'save')} true`); await sleep(100);
await ev(`${d(2, 'reject')} true`); await sleep(100);
out.undo = { afterReject: await ev(`document.querySelectorAll('#drafts .draft')[2]?.className`) };
await ev(`${d(2, 'undo')} true`); await sleep(100);
out.undo.afterUndo = await ev(`({ cls: document.querySelectorAll('#drafts .draft')[2]?.className, buttons: [...document.querySelectorAll('#drafts .draft')[2].querySelectorAll('button')].map(b=>b.textContent.trim()), counter: document.querySelector('#drafts .counter')?.textContent })`);
await ev(`${d(2, 'reject')} true`); await sleep(100);
out.drafts = await ev(`[...document.querySelectorAll('#drafts .draft')].map(x=>({ cls: x.className, badge: (x.querySelector('.pill')||{}).textContent, buttons: [...x.querySelectorAll('button,a.btn')].map(b=>b.textContent.trim()), tail: (x.querySelector('.draft-text,.text,p')||{}).textContent?.slice(-40) }))`);
out.draftsCounter = await ev(`document.querySelector('#drafts .counter')?.textContent`);
out.draft1HasEdit = await ev(`document.querySelectorAll('#drafts .draft')[1].innerText.includes('[API-10 edit]')`);
await scrollTo('#drafts'); await shot('05-drafts');
const reqBeforeCopy = requests.length;
await ev(`${d(0, 'copy')} true`); await sleep(400);
out.copy = await ev(`(async()=>{ const read = await navigator.clipboard.readText(); const draft = document.querySelectorAll('#drafts .draft')[0].innerText; return { toast: document.querySelector('#toast').hidden ? null : document.querySelector('#toast').textContent, clipboardChars: read.length, draftContainsClipboard: draft.includes(read.slice(0, 120)) && read.length > 50 }; })()`);
await shot('05b-copy-toast');
out.requestsDuringDraftActions = requests.slice(reqBeforeCopy);
// AC-011 companies, AC-004 comparison, REQ-006 models
out.companies = await ev(`({ hidden: document.querySelector('#companies').hidden, text: document.querySelector('#companies').innerText.slice(0,300).replace(/\\s+/g,' '), links: document.querySelectorAll('#companies a[href^="http"]').length })`);
await scrollTo('#comparison'); await shot('06-comparison');
out.comparison = await ev(`document.querySelector('#comparison').innerText.replace(/\\s+/g,' ').slice(0,900)`);
out.models = await ev(`document.querySelector('#models').innerText.replace(/\\s+/g,' ').slice(0,500)`);
out.sections = await ev(`[...document.querySelectorAll('main > section')].filter(s=>!s.hidden).map(s=>s.id)`);
out.layout.afterActions = await layout();
await shot('07-full', W, true);
// 390 px recheck of the results (FU-001)
await setVp(390, 844, true); await sleep(600); out.layout.phone390 = await layout(); await ev('window.scrollTo(0,0); true'); await shot('09-phone390-full', 390, true);
await setVp(W, H);
// AC-009 error card + Try again
const reqBeforeErr = requests.length;
await ev(`window.scrollTo(0,0); document.querySelector('#url').value='not a url'; document.querySelector('#run-btn').click(); true`); await sleep(2000);
out.error = await ev(`document.querySelector('#error').innerText.replace(/\\s+/g,' ')`); out.layout.error = await layout(); await shot('08-error');
await ev(`document.querySelector('#error [data-act="retry"]').click(); true`); await sleep(2000);
out.afterTryAgain = { error: await ev(`document.querySelector('#error').innerText.replace(/\\s+/g,' ')`), newRunRequests: requests.slice(reqBeforeErr).filter(r => r.includes('/api/run')).length };
out.allRequests = requests; out.consoleErrors = consoleErrors;
writeFileSync(`${outDir}/${tag}-report.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
chrome.kill(); process.exit(0);
