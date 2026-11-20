// Composition root and HTTP boundary.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { config, missingKeys, modelPlan } from './src/config.js';
import { runPipeline } from './src/pipeline.js';

const STATIC = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };

function normalizeUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) throw new Error('Please enter a company website URL.');
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  const u = new URL(s);
  if (!u.hostname.includes('.')) throw new Error(`"${raw}" does not look like a website URL.`);
  return u.toString();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function handleRun(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache' });
  const emit = (event) => res.write(JSON.stringify(event) + '\n');
  try {
    const missing = missingKeys();
    if (missing.length) throw new Error(`Missing ${missing.join(' and ')}: copy .env.example to .env and add your key(s), then restart.`);
    let body = {};
    try { body = JSON.parse(await readBody(req)); } catch { /* empty body */ }
    let url;
    try { url = normalizeUrl(body.url); } catch (e) { throw new Error(e.message.startsWith('Invalid URL') ? `"${body.url}" is not a valid URL.` : e.message); }
    await runPipeline(url, emit);
  } catch (err) {
    console.error('[run] error:', err.message);
    emit({ type: 'error', message: err.message });
  }
  res.end();
}

createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  try {
    if (req.method === 'POST' && path === '/api/run') return await handleRun(req, res);
    if (req.method === 'GET' && path === '/api/config') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ models: modelPlan(), draftCount: config.draftCount, missingKeys: missingKeys() }));
    }
    const file = STATIC[path];
    if (req.method === 'GET' && file) {
      res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8` });
      return res.end(await readFile(new URL(`./public/${file[0]}`, import.meta.url)));
    }
    res.writeHead(404).end('Not found');
  } catch (err) {
    console.error('[http] error:', err.message);
    if (!res.headersSent) res.writeHead(500);
    res.end('Server error');
  }
}).listen(config.port, () => console.log(`Lead Radar running at http://localhost:${config.port}`));
