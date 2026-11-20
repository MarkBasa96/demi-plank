// Takes the screenshots used in README.md (docs/screenshots/) from the real build, with realistic sample data.
// Usage: node tools/readme-shots.mjs     (headless Edge, iPhone size 390x844 at 2x)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'screenshots');
const RAW = path.join(process.env.TEMP || '.', 'demi-readme-raw');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(RAW, { recursive: true });
const PORT = 5198, DBG = 9345, URL0 = `http://127.0.0.1:${PORT}/`;
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = http.createServer((req, rs) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { rs.writeHead(404); return rs.end('nf'); } rs.writeHead(200, { 'content-type': T[path.extname(p)] || 'application/octet-stream' }); rs.end(d); });
}).listen(PORT, '127.0.0.1');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(process.env.TEMP, 'demi-edge-readme-'));
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', '--disable-extensions', 'about:blank'], { stdio: 'ignore' });
let ws, id = 0; const pending = new Map();
for (let i = 0; i < 60 && !ws; i++) {
  try { const list = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); const pg = list.find(t => t.type === 'page' && !t.url.startsWith('chrome-extension'));
    if (pg) { ws = new WebSocket(pg.webSocketDebuggerUrl); await new Promise(r => (ws.onopen = r)); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } }; } } catch { await sleep(250); }
}
const cdp = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => (await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
const KEY = 'demi-plank:v1';
await cdp('Page.enable'); await cdp('Runtime.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
// silent fake speech so the app never makes sound while we shoot
await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `window.SpeechSynthesisUtterance = function(t){this.text=t}; Object.defineProperty(window,'speechSynthesis',{value:{speaking:false,pending:false,getVoices:()=>[],addEventListener(){},resume(){},cancel(){},speak(){}},configurable:true});` });

// sample data: a few weeks in, with a weight trend, so the screens look lived-in
const DAY = 86400000, now = Date.now();
const hist = [];
for (const [ago, name, secs, kcal, moves, level, day] of [[0, 'BEGINNER · DAY 8', 612, 38.4, 16, 0, 8], [1, 'BEGINNER · DAY 7', 540, 33.1, 15, 0, 7], [3, 'BEGINNER · DAY 5', 498, 30.2, 14, 0, 5], [4, 'PLANK CHALLENGE', 95, 6.3, 0], [5, 'BEGINNER · DAY 4', 471, 28.6, 14, 0, 4], [6, 'MORNING WARMUP', 252, 14.9, 10], [8, 'BEGINNER · DAY 3', 455, 27.7, 13, 0, 3]]) {
  const h = { ts: now - ago * DAY - 3600000, kind: name === 'PLANK CHALLENGE' ? 'challenge' : 'workout', name, secs, kcal, moves }; if (level !== undefined) { h.level = level; h.day = day; } hist.push(h);
}
const dk = d => { const x = new Date(now - d * DAY); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const weights = [[20, 72.4], [16, 72.0], [12, 71.5], [9, 71.3], [6, 70.8], [3, 70.6], [0, 70.2]].map(([d, kg]) => ({ date: dk(d), kg }));
const STATE = { v: 1, levelIndex: 0, progress: { 0: { done: { 1: now - 11 * DAY, 2: now - 10 * DAY, 3: now - 8 * DAY, 4: now - 5 * DAY, 5: now - 3 * DAY, 7: now - 1 * DAY, 8: now }, current: 9 } }, history: hist, best: { secs: 95, ts: now - 4 * DAY }, weights, heightCm: 175.3, settings: { wUnit: 'lb', hUnit: 'in' } };

async function load() { await cdp('Page.navigate', { url: URL0 + 'x.txt' }); await sleep(300); await ev(`localStorage.setItem('${KEY}', ${JSON.stringify(JSON.stringify(STATE))})`); await cdp('Page.navigate', { url: URL0 }); await sleep(900); }
async function tap(sel, text) {
  const r = await ev(`(() => { const e=[...document.querySelectorAll(${JSON.stringify(sel)})].filter(x=>${text ? `x.textContent.toLowerCase().includes(${JSON.stringify(text.toLowerCase())})` : 'true'})[0]; if(!e) return null; e.scrollIntoView({block:'center'}); const b=e.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}; })()`);
  if (!r) throw new Error('no element ' + sel + ' ' + text);
  await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] }); await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(260);
}
const act = (a, data = {}, text) => tap(`[data-act="${a}"]` + Object.entries(data).map(([k, v]) => `[data-${k}="${v}"]`).join(''), text);
async function shot(name) { await sleep(500); const r = await cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(RAW, name + '.png'), Buffer.from(r.result.data, 'base64')); console.log('shot', name); }

await load();
await shot('challenge');
await act('tab', {}, 'Library'); await shot('library');
await act('tab', {}, 'Plan'); await act('selday', { d: 9 }); await shot('plan');
await act('mvsheet', {}, 'Head tilt'); await shot('howto'); await act('dlgclose');
await act('planstart'); for (let i = 0; i < 7; i++) await act("wskip"); // through the warm-up to the first main move
await shot('workout'); await act('wskip'); await shot('rest');
await act('wquit'); await act('giveupquit');
await act('tab', {}, 'Reports'); await shot('reports');
await act('history'); await shot('history'); await act('back');
await act('tab', {}, 'Mine'); await shot('mine');

ws.close(); edge.kill(); server.close();

// downsize for the README: 390 px wide PNGs, plus a hero banner of four screens
const require = createRequire(path.join(ROOT, 'package.json')); const sharp = require('sharp');
const names = ['challenge', 'library', 'plan', 'howto', 'workout', 'rest', 'reports', 'history', 'mine'];
for (const n of names) await sharp(path.join(RAW, n + '.png')).resize(390).png({ palette: true, quality: 82, compressionLevel: 9 }).toFile(path.join(OUT, n + '.png'));
const pick = ['plan', 'workout', 'rest', 'reports'], W = 300, GAP = 36, PAD = 48;
const tiles = await Promise.all(pick.map(async n => {
  const b = await sharp(path.join(RAW, n + '.png')).resize(W).toBuffer(); const h = (await sharp(b).metadata()).height;
  const mask = Buffer.from(`<svg width="${W}" height="${h}"><rect width="${W}" height="${h}" rx="30" fill="#fff"/></svg>`);
  return { buf: await sharp(b).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer(), h };
}));
const H = tiles[0].h + PAD * 2, Wt = PAD * 2 + W * pick.length + GAP * (pick.length - 1);
await sharp({ create: { width: Wt, height: H, channels: 3, background: '#1B2A47' } })
  .composite(tiles.map((t, i) => ({ input: t.buf, left: PAD + i * (W + GAP), top: PAD }))).png({ palette: true, quality: 85, compressionLevel: 9 }).toFile(path.join(OUT, 'hero.png'));
console.log('done', fs.readdirSync(OUT).join(' '));
setTimeout(() => process.exit(0), 200);
