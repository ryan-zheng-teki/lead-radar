// Temporary probe: narrow viewport + Copy-to-clipboard on the live app via raw CDP (no deps).
// usage: node narrow-clipboard.mjs <appUrl> <company> <screenshotPath>
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [appUrl, company, shot, replay] = process.argv.slice(2);
const replayText = replay ? (await import('node:fs')).readFileSync(replay, 'utf8') : null;
const port = 9333;
const chrome = spawn('/usr/bin/chromium', ['--headless=new', '--no-sandbox', `--remote-debugging-port=${port}`, '--user-data-dir=/tmp/lr-probe/profile', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ver; for (let i = 0; i < 40 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(250); } }
function client(wsUrl) {
  const ws = new WebSocket(wsUrl); let id = 0; const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(JSON.stringify(d.error))) : p.res(d.result); } };
  const ready = new Promise((r) => (ws.onopen = r));
  return { ready, ws, send: (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); }) };
}
const browser = client(ver.webSocketDebuggerUrl); await browser.ready;
const origin = new URL(appUrl).origin;
await browser.send('Browser.grantPermissions', { origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
const tgt = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const page = client(tgt.webSocketDebuggerUrl); await page.ready;
await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await page.send('Page.enable'); await page.send('Page.bringToFront'); await page.send('Runtime.enable');
await page.send('Page.navigate', { url: appUrl }); await sleep(1500);
const ev = async (expr) => { const r = await page.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return 'EXCEPTION ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const out = { company, viewport: '390x844 mobile' };
const t0 = Date.now();
await ev(`window.__calls=0; const of=window.fetch; window.fetch=(...a)=>{window.__calls++; if (${JSON.stringify(replayText)} && String(a[0]).includes('/api/run')) return Promise.resolve(new Response(${JSON.stringify(replayText)}, {headers:{'Content-Type':'application/x-ndjson'}})); return of(...a)}; document.querySelector('#url').value=${JSON.stringify(company)}; document.querySelector('#run-btn').click(); true`);
for (let i = 0; i < 120; i++) { await sleep(1000); if (await ev(`/Done/.test(document.querySelector('#stages').innerText) || !document.querySelector('#error').hidden`)) break; }
out.runSeconds = (Date.now() - t0) / 1000;
out.error = await ev(`document.querySelector('#error').hidden ? null : document.querySelector('#error').textContent`);
out.lastStage = await ev(`[...document.querySelectorAll('#stages li')].pop()?.textContent`);
out.leads = await ev(`document.querySelectorAll('#leads tbody tr').length`);
out.drafts = await ev(`document.querySelectorAll('#drafts .draft').length`);
if (!replayText) await sleep(8000); // let reference scorer B fill in if still pending
out.layout = await ev(`({ innerWidth, docScrollWidth: document.documentElement.scrollWidth, bodyOverflowX: document.documentElement.scrollWidth > innerWidth,
  wideElements: [...document.querySelectorAll('main > *, .draft, .row, input, button')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => e.tagName + '.' + e.className + '#' + e.id).slice(0, 10),
  tablesScrollable: [...document.querySelectorAll('table')].map(t => { const p = t.parentElement; return { w: Math.round(t.getBoundingClientRect().width), parentOverflowX: getComputedStyle(p).overflowX, parentW: Math.round(p.getBoundingClientRect().width) }; }) })`);
out.copy = await ev(`(async () => { const b = document.querySelector('#drafts button[data-act="approve"][data-i="0"]'); if (!b) return 'no draft'; b.click(); await new Promise(r=>setTimeout(r,100));
  const text = document.querySelectorAll('#drafts .draft')[0].querySelector('.text').textContent;
  const c = document.querySelector('#drafts button[data-act="copy"][data-i="0"]'); c.click(); await new Promise(r=>setTimeout(r,400));
  const read = await navigator.clipboard.readText(); return { buttonText: c.textContent, clipboardEqualsDraft: read === text, clipboardChars: read.length }; })()`);
out.networkCallsAfterRun = await ev(`window.__calls`);
const m = await ev(`({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight })`);
await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: Math.min(m.h, 12000), deviceScaleFactor: 1, mobile: true });
const shotData = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
writeFileSync(shot, Buffer.from(shotData.data, 'base64'));
console.log(JSON.stringify(out, null, 2));
chrome.kill(); process.exit(0);
