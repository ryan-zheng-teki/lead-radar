// usage: node shoot.mjs <appUrl> <company> <width> <height> <outDir> <port>
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const [appUrl, company, W, H, outDir, port] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const tag = `${W}x${H}`;
const chrome = spawn('/usr/bin/chromium', ['--headless=new', '--no-sandbox', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/lr-ui/profile-${port}`, 'about:blank'], { stdio: 'ignore' });
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
const consoleErrors = [];
page.on((d) => {
  if (d.method === 'Runtime.exceptionThrown') consoleErrors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') consoleErrors.push(d.params.args.map((a) => a.value || a.description).join(' '));
  if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') consoleErrors.push(d.params.entry.text);
});
await page.send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: false });
await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Log.enable'); await page.send('Page.bringToFront');
const ev = async (expr) => { const r = await page.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) return 'EXCEPTION ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const shot = async (name, full = false) => {
  const params = { format: 'png' };
  if (full) { const h = await ev('document.documentElement.scrollHeight'); params.captureBeyondViewport = true; params.clip = { x: 0, y: 0, width: +W, height: h, scale: 1 }; }
  const { data } = await page.send('Page.captureScreenshot', params);
  writeFileSync(`${outDir}/${tag}-${name}.png`, Buffer.from(data, 'base64'));
};
const hscroll = () => ev('document.documentElement.scrollWidth > window.innerWidth');
const scrollTo = async (sel) => { await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 70); return true})()`); await sleep(400); };
const out = { viewport: tag, company, hscroll: {} };

await page.send('Page.navigate', { url: appUrl }); await sleep(1500);
await shot('01-empty'); out.hscroll.empty = await hscroll();
const t0 = Date.now();
await ev(`document.querySelector('#url').value=${JSON.stringify(company)}; document.querySelector('#run-btn').click(); true`);
await sleep(9000); await shot('02-running'); out.hscroll.running = await hscroll();
for (let i = 0; i < 150; i++) { await sleep(1000); if (await ev(`/Done/.test(document.querySelector('#progress-title').textContent) || !document.querySelector('#error').hidden`)) break; }
out.runSeconds = (Date.now() - t0) / 1000;
await sleep(600);
await ev('window.scrollTo(0,0); true'); await sleep(300); await shot('03-results-top'); out.hscroll.results = await hscroll();
await scrollTo('#leads'); await shot('04-leads');
// draft actions: approve 0, edit+save 1, reject 2
await ev(`(()=>{const c=(i,a)=>document.querySelector('#drafts button[data-act="'+a+'"][data-i="'+i+'"]')?.click(); c(0,'approve'); c(1,'edit'); const t=document.querySelector('#drafts textarea[data-i="1"]'); if(t){t.value=t.value+' (edited by me)'; } c(1,'save'); c(2,'reject'); return true})()`);
await scrollTo('#drafts'); await shot('05-drafts');
await ev(`document.querySelector('#drafts button[data-act="copy"]')?.click(); true`); await sleep(500); await shot('05b-drafts-copy-toast');
out.draftsState = await ev(`[...document.querySelectorAll('#drafts .draft')].map(d=>d.className.replace('draft ','')+':'+(d.querySelector('.pill-success,.pill-danger')?.textContent||'-'))`);
out.counter = await ev(`document.querySelector('#drafts .counter')?.textContent`);
await scrollTo('#comparison'); await shot('06-comparison');
out.hscroll.after = await hscroll();
await shot('07-full', true);
out.sections = await ev(`[...document.querySelectorAll('main > section')].filter(s=>!s.hidden).map(s=>s.id)`);
out.minFont = await ev(`Math.min(...[...document.querySelectorAll('main *')].filter(e=>e.offsetParent && e.childNodes.length && [...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(e=>parseFloat(getComputedStyle(e).fontSize)))`);
// error state
await ev(`window.scrollTo(0,0); document.querySelector('#url').value='not a url'; document.querySelector('#run-btn').click(); true`); await sleep(2500);
await shot('08-error'); out.errorText = await ev(`document.querySelector('#error').innerText`);
out.consoleErrors = consoleErrors;
writeFileSync(`${outDir}/${tag}-report.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
chrome.kill(); process.exit(0);
