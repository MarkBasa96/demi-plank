// Tap-through test for Demi Plank. Drives headless Edge at iPhone size (390x844) with real touch taps.
// Every check reads saved values (localStorage) or visible text, not just "no error".
// Usage: node tools/tap-test.mjs        (OUT=<folder> for screenshots)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT || path.join(process.env.TEMP || '.', 'demi-shots');
const PORT = 5199, DBG = 9344, URL0 = `http://127.0.0.1:${PORT}/`;
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
fs.mkdirSync(OUT, { recursive: true });
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
let server;
function startServer() {
  return new Promise(res => {
    server = http.createServer((req, rs) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404); return rs.end('nf'); } rs.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' }); rs.end(d); });
    }).listen(PORT, '127.0.0.1', res);
  });
}
const stopServer = () => new Promise(res => { server.closeAllConnections?.(); server.close(res); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const profile = fs.mkdtempSync(path.join(process.env.TEMP, 'demi-edge-'));
await startServer();
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', '--disable-extensions', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });

let ws, id = 0; const pending = new Map();
const problems = [], reqs = [], bad = [];
async function connect() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json();
      const page = list.find(t => t.type === 'page' && !t.url.startsWith('chrome-extension'));
      if (page) {
        ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => (ws.onopen = r));
        ws.onmessage = m => {
          const d = JSON.parse(m.data);
          if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
          const p = d.params;
          if (d.method === 'Runtime.exceptionThrown') problems.push('EXCEPTION ' + (p.exceptionDetails.exception?.description || p.exceptionDetails.text).slice(0, 300));
          if (d.method === 'Runtime.consoleAPICalled' && p.type === 'error') problems.push('console.error ' + p.args.map(a => a.value ?? a.description).join(' ').slice(0, 300));
          if (d.method === 'Network.requestWillBeSent') reqs.push(p.request.url);
          if (d.method === 'Network.responseReceived' && p.response.status >= 400 && !/neutral.txt|favicon.ico/.test(p.response.url)) bad.push(p.response.status + ' ' + p.response.url);
        };
        return;
      }
    } catch { /* wait */ }
    await sleep(250);
  }
  throw new Error('edge did not start');
}
const cdp = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error('eval: ' + r.result.exceptionDetails.exception?.description?.slice(0, 200)); return r.result?.result?.value; };

let pass = 0, fail = 0; const failures = [];
function check(name, ok, detail = '') { if (ok) pass++; else { fail++; failures.push(name + (detail ? '  [' + detail + ']' : '')); } console.log((ok ? 'PASS ' : 'FAIL ') + name + (!ok && detail ? '  -> ' + detail : '')); }
const KEY = 'demi-plank:v1';
const state = async () => { await sleep(130); return JSON.parse(await ev(`localStorage.getItem('${KEY}')`) || 'null'); };
const text = () => ev(`document.getElementById('app').innerText`);
const q = s => ev(`document.querySelector(${JSON.stringify(s)})?.innerText?.trim() ?? null`);
const count = s => ev(`document.querySelectorAll(${JSON.stringify(s)}).length`);
const exists = s => ev(`!!document.querySelector(${JSON.stringify(s)})`);
async function shot(name) { await sleep(500); const r = await cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.result.data, 'base64')); }
async function waitFor(expr, ms = 4000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr)) return true; await sleep(100); } return false; }
const small = [];

// a real touch tap at the centre of an element; fails loudly if something else is on top of it
async function tap(sel, { text: tx, nth = 0, label } = {}) {
  const info = await ev(`(() => { const els=[...document.querySelectorAll(${JSON.stringify(sel)})].filter(e=>${tx ? `e.textContent.trim().toLowerCase().includes(${JSON.stringify(tx.toLowerCase())})` : 'true'});
    const el=els[${nth}]; if(!el) return {missing:true,n:els.length};
    el.scrollIntoView({block:'center',inline:'center'}); const r=el.getBoundingClientRect(); const x=r.left+r.width/2, y=r.top+r.height/2; const hit=document.elementFromPoint(x,y);
    return {x,y,w:r.width,h:r.height,ok:!!hit&&(el.contains(hit)||hit.contains(el)),cover:hit?hit.className||hit.tagName:null}; })()`);
  if (info.missing) { check('tap target exists: ' + (label || sel + (tx ? ' "' + tx + '"' : '')), false, 'found ' + info.n); return false; }
  if (!info.ok) { check('tap target not covered: ' + (label || sel), false, 'covered by ' + info.cover); return false; }
  if (Math.min(info.w, info.h) < 36) small.push(`${label || sel} ${Math.round(info.w)}x${Math.round(info.h)}`);
  await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: info.x, y: info.y }] });
  await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(140); return true;
}
const act = (a, o = {}) => { const d = o.data ? Object.entries(o.data).map(([k, v]) => `[data-${k}="${v}"]`).join('') : ''; return tap(`[data-act="${a}"]${d}`, { ...o, label: 'act:' + a + (o.text ? ' ' + o.text : '') + (o.data ? JSON.stringify(o.data) : '') }); };
async function typeInto(sel, val) { await ev(`(() => { const e=document.querySelector(${JSON.stringify(sel)}); e.focus(); e.select(); })()`); await cdp('Input.insertText', { text: String(val) }); await sleep(60); }
async function reload() { await cdp('Page.reload'); await sleep(500); await waitFor(`!!document.querySelector('.tabs')`, 5000); }
const NEUTRAL = URL0 + 'neutral.txt';
async function inject(jsBody) { await cdp('Page.navigate', { url: NEUTRAL }); await sleep(500); await ev(jsBody); await cdp('Page.navigate', { url: URL0 }); await sleep(600); await waitFor(`!!document.querySelector('.tabs')`, 5000); }
async function setState(patch) { await inject(`(() => { const s=JSON.parse(localStorage.getItem('${KEY}')||'null')||{}; Object.assign(s, ${JSON.stringify(patch)}); localStorage.setItem('${KEY}', JSON.stringify(s)); })()`); }
const noOverflow = async name => { const w = await ev(`Math.max(document.documentElement.scrollWidth, ...[...document.querySelectorAll('.screen')].map(s=>s.scrollWidth))`); check('no sideways scroll: ' + name, w <= 390, 'width ' + w); };
const imp = (mod, expr) => ev(`import('/js/${mod}').then(m => ${expr})`);

await connect();
for (const m of ['Page.enable', 'Runtime.enable', 'Network.enable']) await cdp(m);
await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await cdp('Page.navigate', { url: URL0 }); await sleep(900);

try {
  // ---------------- 0. first load, service worker ----------------
  check('app renders five tabs', (await count('.tab')) === 5);
  check('starts on Challenge tab with no record', (await text()).includes('No record at present'));
  const swOk = await ev(`navigator.serviceWorker.ready.then(r => !!r.active)`);
  check('service worker active', swOk === true);
  await sleep(1500);
  const cached = await ev(`caches.keys().then(async ks => { const c = await caches.open(ks[0]); return (await c.keys()).length; })`);
  const files = (await (await fetch(URL0 + 'sw.js')).text()).match(/const FILES = (\[.*?\]);/s);
  const nFiles = JSON.parse(files[1]).length;
  check('every listed file is in the offline cache', cached === nFiles, `cached ${cached} of ${nFiles}`);

  // ---------------- 1. five tabs ----------------
  for (const [t, h] of [['Library', 'Library'], ['Plan', null], ['Reports', 'Reports'], ['Mine', 'Mine'], ['Challenge', 'Challenge']]) {
    await act('tab', { text: t }); await sleep(120);
    check(`tab "${t}" becomes active`, (await q('.tab.on')) === t);
    if (h) check(`tab "${t}" shows its title`, (await q('.top h1')) === h);
    await noOverflow(t); await shot('tab-' + t.toLowerCase());
  }

  // ---------------- 2. Challenge ----------------
  await act('chalpick'); check('Challenge: target screen', (await q('.unl')) === 'UNLIMITED');
  await act('target', { data: { s: 60 } }); check('Challenge: pick 1:00 target', (await q('.unl')) === '01:00' && (await q('.ticks .on')) === '1:00', await q('.unl'));
  await act('target', { data: { s: 0 } });
  await act('chalgo'); await sleep(3300);
  const c1 = await q('#cht'); check('Challenge: counts up in real time', /^00:00:0[2-4]$/.test(c1), c1);
  await shot('challenge-run');
  await act('chalquit'); check('Challenge: back button asks first', (await text()).includes('just keep going'));
  await act('chalcontinue'); check('Challenge: CONTINUE keeps it running', (await exists('#cht')) && !(await text()).includes('just keep going'));
  const before = await q('#cht'); await sleep(1200); check('Challenge: still counting after dialog', (await q('#cht')) !== before);
  await act('chalquit'); await act('chalend');
  let st = await state(); const first = st.best?.secs;
  check('Challenge: QUIT saves record', first >= 4 && st.history[0].kind === 'challenge' && st.history[0].secs === first, JSON.stringify(st.best));
  check('Challenge tab shows the record', /^00:0[4-6]$/.test(await q('.chal .big')), await q('.chal .big'));
  await act('chalpick'); await act('chalgo'); await sleep(1300); await act('chalquit'); await act('chalend');
  st = await state(); check('Challenge: shorter run does NOT replace best', st.best.secs === first && st.history.length === 2, `best ${st.best.secs} hist ${st.history.length}`);

  // ---------------- 3. Library ----------------
  await act('tab', { text: 'Library' });
  const lib = await imp('data/library.js', `JSON.stringify(m.LIBRARY.map(w => ({id: w.id, name: w.name, n: (w.moves || w.levels[0].moves).length, lv: w.levels?.map(l => l.moves.length)})))`).then(JSON.parse);
  check('Library: shows every workout', (await count('.lcard')) === lib.length, `${await count('.lcard')} vs ${lib.length}`);
  for (const w of lib) {
    await act('libopen', { data: { id: w.id } });
    if (w.lv) { check(`Library ${w.id}: shows levels`, (await count('[data-act="libopen2"]')) === w.lv.length); await act('libopen2', { data: { lv: 2 } }); }
    const expect = w.lv ? w.lv[2] : w.n;
    check(`Library ${w.id}: exercise list is complete`, (await count('.exrow')) === expect, `${await count('.exrow')} vs ${expect}`);
    await act('back'); if (w.lv) await act('back');
    check(`Library ${w.id}: back returns to list`, (await count('.lcard')) === lib.length);
  }
  await act('libopen', { data: { id: 'morning-warmup' } }); await act('mvsheet', { nth: 0 });
  check('Library: tapping a move opens its sheet', (await exists('.sheet')) && (await q('.sheet h2')) !== null);
  await shot('library-sheet'); await act('dlgclose'); check('Library: sheet closes', !(await exists('.sheet')));
  const firstName = await imp('data/moves.js', `m.moveName(${JSON.stringify(await imp('data/library.js', `m.LIBRARY.find(w=>w.id==='morning-warmup').moves[0][0]`))})`);
  await act('libstart', { data: { id: 'morning-warmup' } });
  check('Library START: ready screen shows first move', (await q('.ready .nm')).toLowerCase() === firstName.toLowerCase(), (await q('.ready .nm')) + ' vs ' + firstName);
  const r1 = await q('#pn'); await sleep(2100); const r2 = await q('#pn'); check('Ready countdown ticks (7 -> down)', Number(r1) - Number(r2) >= 1 && Number(r1) <= 7, `${r1} -> ${r2}`);
  await act('wquit'); check('Workout back: asks "Why give up?"', (await text()).includes('Why give up'));
  const frozen = await q('#pn'); await sleep(1300); check('Workout: clock stops while the quit question is open', (await q('#pn')) === frozen, frozen + ' -> ' + (await q('#pn')));
  await act('giveupstay'); check('Workout: KEEP GOING returns to the workout', (await exists('.ready')) && !(await text()).includes('Why give up'));
  await act('wquit'); await act('giveupquit');
  st = await state(); check('Workout: quitting does not save anything', st.history.length === 2, 'history ' + st.history.length);
  check('Workout: quit lands on Library tab', (await q('.tab.on')) === 'Library');

  // ---------------- 4. Mine settings ----------------
  await act('tab', { text: 'Mine' }); await noOverflow('Mine'); await shot('mine');
  await act('sounddlg'); await act('toggleopt', { data: { k: 'mute' } });
  st = await state(); check('Sound: Mute saved', st.settings.mute === true);
  await shot('mine-sound'); await act('toggleopt', { data: { k: 'mute' } }); await act('dlgclose');
  st = await state(); check('Sound: Mute toggles back off', st.settings.mute === false && !(await exists('.dialog')));
  await act('restdlg'); await act('restmode', { data: { m: 'custom' } }); for (let i = 0; i < 3; i++) await act('restdn');
  check('Rest dialog: shows 5 s', (await text()).includes('5 s')); await act('restsave');
  st = await state(); check('Rest time: custom 5 s saved', st.settings.restMode === 'custom' && st.settings.restSecs === 5, JSON.stringify(st.settings));
  check('Mine row shows "5 s"', (await text()).includes('5 s'));
  await act('unitsdlg'); await act('unit', { data: { k: 'wUnit', v: 'kg' } }); await act('unit', { data: { k: 'hUnit', v: 'cm' } });
  st = await state(); check('Units: kg and cm saved', st.settings.wUnit === 'kg' && st.settings.hUnit === 'cm');
  await act('unit', { data: { k: 'wUnit', v: 'lb' } }); await act('unit', { data: { k: 'hUnit', v: 'in' } }); await act('dlgclose');
  st = await state(); check('Units: back to lb and in', st.settings.wUnit === 'lb' && st.settings.hUnit === 'in');
  await act('coach'); check('Coach voice page opens', (await q('.top h1')) === 'Coach voice'); await shot('mine-coach'); await act('back');
  await act('faq'); await act('faqopen', { data: { i: 0 } }); check('FAQ opens an answer', (await count('.faq p')) === 1); await act('faqopen', { data: { i: 0 } }); check('FAQ closes it again', (await count('.faq p')) === 0); await act('back');

  // ---------------- 5. Plan ----------------
  await act('tab', { text: 'Plan' }); await noOverflow('Plan'); await shot('plan');
  const lv0 = await imp('engine.js', `JSON.stringify({name: m.getLevel(0).name, n: m.getLevel(0).days.length, rest: m.getLevel(0).days.filter(d => d.rest).map(d => d.day)})`).then(JSON.parse);
  check('Plan: starts on Beginner', (await q('.plantop h1')).toLowerCase() === lv0.name.toLowerCase(), await q('.plantop h1'));
  check('Plan: a card for every day plus MORE PLANS', (await count('.dcard')) === lv0.n + 1, `${await count('.dcard')}`);
  await act('selday', { data: { d: 3 } }); check('Plan: select day 3', (await q('.daytitle h2')) === 'Day 3');
  if (lv0.rest.length) { await act('selday', { data: { d: lv0.rest[0] } }); check('Plan: rest day shows REST DAY and no START', (await exists('.restday')) && !(await exists('[data-act="planstart"]'))); await shot('plan-restday'); }
  else console.log('INFO Beginner has no rest days; rest day tested on Intermediate below');
  await act('selday', { data: { d: 3 } });
  const mainBefore = await imp('engine.js', `JSON.stringify(m.getSession(0, 3, {warm: true}).items.filter(x => x.section === 'main'))`).then(JSON.parse);
  await act('editday'); check('Edit: lists the day\'s exercises', (await count('.edrow')) === mainBefore.length, `${await count('.edrow')} vs ${mainBefore.length}`); await shot('edit');
  const nm = async i => ev(`document.querySelectorAll('.edrow b')[${i}].innerText.trim()`);
  const a0 = await nm(0), a1 = await nm(1);
  await act('mvdn', { data: { i: 0 } }); check('Edit: move down swaps the first two', (await nm(0)) === a1 && (await nm(1)) === a0);
  await act('mvup', { data: { i: 1 } }); check('Edit: move up swaps back', (await nm(0)) === a0);
  await act('mvdn', { data: { i: 0 } });
  await act('mvrep', { data: { i: 2 } }); check('Edit: replace screen lists options', (await count('[data-act="mvchoose"]')) > 10);
  const choice = await ev(`document.querySelector('[data-act="mvchoose"]').dataset.id`); await act('mvchoose', { nth: 0 });
  await act('mvsheet2', { data: { i: 1 } }); const secBefore = (await q('.sheet .stepper b'));
  await act('secup'); await act('secup'); check('Edit: duration stepper adds 10 s', (await q('.sheet .stepper b')) !== secBefore, secBefore + ' -> ' + (await q('.sheet .stepper b')));
  await act('sheetsave');
  await act('editsave'); st = await state(); const ed = st.edits['0-3'];
  check('Edit: SAVE stores the new order, replacement and duration', ed && ed.length === mainBefore.length && ed[0][0] === mainBefore[1].id && ed[1][0] === mainBefore[0].id && ed[2][0] === choice && ed[1][1] === mainBefore[0].secs + 10, JSON.stringify(ed?.slice(0, 3)));
  check('Plan shows the edited day', (await text()).includes(a1.toUpperCase()) || (await text()).toLowerCase().includes(a1.toLowerCase()));
  await act('editday'); await act('editreset'); st = await state(); check('Edit: Reset removes the saved edit', !st.edits['0-3']);
  await act('levels', { nth: 0 }); const nl = await count('.lvl'); check('Level chooser: 6 levels + My training', nl === 7, 'cards ' + nl); await shot('levels');
  await act('pick', { data: { i: 1 } }); st = await state(); check('Level chooser: Intermediate saved', st.levelIndex === 1 && /intermediate/i.test(await q('.plantop h1')), await q('.plantop h1'));
  const lv1rest = await imp('engine.js', `m.getLevel(1).days.find(d => d.rest)?.day`);
  if (lv1rest) { await act('selday', { data: { d: lv1rest } }); check('Plan: Intermediate rest day has no START', (await exists('.restday')) && !(await exists('[data-act="planstart"]'))); }
  await act('levels', { nth: 0 }); await act('pick', { data: { i: 0 } });

  // My Training with 5 s holds, then a full natural run
  await act('levels', { nth: 0 }); await act('custom'); check('My training: starts empty', (await text()).includes('Nothing here yet'));
  await act('mvadd'); await act('mvchoose', { nth: 0 }); await act('mvadd'); await act('mvchoose', { nth: 1 });
  check('My training: two exercises added', (await count('.edrow')) === 2);
  for (const i of [0, 1]) { await act('mvsheet2', { data: { i } }); for (let k = 0; k < 5; k++) await act('secdn'); await act('sheetsave'); }
  check('My training: both set to 5 s', (await ev(`[...document.querySelectorAll('.edrow')].map(r => r.innerText).every(t => t.includes('00:05'))`)));
  await act('editsave'); st = await state(); check('My training: saved to the phone', st.custom.length === 2 && st.custom.every(x => x[1] === 5), JSON.stringify(st.custom));
  check('My training: SAVE returns to the level chooser', (await count('.lvl')) === 7); await act('custom'); check('My training: reopens with saved list', (await count('.edrow')) === 2);
  const names = await ev(`[...document.querySelectorAll('.edrow b')].map(b => b.innerText.trim())`);
  await act('customstart');
  check('My training: START opens ready screen', (await q('.ready .word')) === 'LET\'S GO' || (await q('.ready .word')) !== null, await q('.ready .word'));
  await sleep(7300); check('Ready ends by itself after 7 s -> move', (await exists('.screen.light')) && (await q('.bignum .s')) !== null, await q('.bignum'));
  await act('wrate', { data: { v: 1 } }); st = await state(); const rid = Object.keys(st.ratings)[0]; check('Thumbs up saved', st.ratings[rid] === 1, JSON.stringify(st.ratings));
  await act('wrate', { data: { v: 1 } }); st = await state(); check('Thumbs up toggles off', Object.keys(st.ratings).length === 0);
  await act('whow'); check('? opens the how-to sheet and pauses', (await exists('.sheet')) && (await q('.mvname')) === 'PAUSED', await q('.mvname'));
  await ev(`document.querySelector('.dim.bottom').dispatchEvent(new MouseEvent('click',{bubbles:true}))`); await sleep(150); check('Tapping outside the sheet also resumes the workout', (await q('.mvname')) !== 'PAUSED' && !(await exists('.sheet')), await q('.mvname'));
  await act('whow'); await act('dlgclose'); check('Closing the sheet resumes the workout', (await q('.mvname')) !== 'PAUSED', await q('.mvname'));
  await sleep(5100); check('Move ends by itself -> rest screen', (await q('.tr')) === 'Take a rest', await q('.tr')); await shot('workout-rest');
  const rr = Number(await q('#pn')); check('Rest uses the custom 5 s', rr >= 3 && rr <= 5, 'rest ' + rr);
  await act('wadd'); const rr2 = Number(await q('#pn')); check('+20s adds 20 seconds', rr2 - rr >= 18, `${rr} -> ${rr2}`);
  await act('wskip'); check('Rest SKIP -> second exercise', (await q('.mvname')) === names[1].toUpperCase() || (await q('.mvname')).toLowerCase() === names[1].toLowerCase(), await q('.mvname'));
  await act('wprev'); check('Previous goes back to the first exercise', (await q('.mvname')).toLowerCase() === names[0].toLowerCase(), await q('.mvname'));
  await act('wskip'); await act('wskip'); check('Next then SKIP reaches the second exercise again', (await q('.mvname')).toLowerCase() === names[1].toLowerCase(), await q('.mvname'));
  await shot('workout-move');
  await act('wpause'); check('Pause shows PAUSED', (await q('.mvname')) === 'PAUSED'); const p1 = await q('#pn'); await sleep(1800); check('Paused clock does not move', (await q('#pn')) === p1, p1 + ' -> ' + (await q('#pn')));
  await act('wpause'); check('Resume', (await q('.mvname')) !== 'PAUSED');
  await sleep(5600);
  check('Last move ends -> WORKOUT COMPLETE', (await text()).includes('WORKOUT COMPLETE'), (await text()).slice(0, 80)); await shot('workout-done');
  const dn = await ev(`[...document.querySelectorAll('.stats3 .n')].map(n => n.innerText)`);
  await act('donefin'); st = await state(); const h0 = st.history[0];
  check('Done: history entry saved', h0.kind === 'workout' && h0.name === 'MY TRAINING' && h0.secs >= 4 && h0.secs <= 14 && h0.kcal > 0, JSON.stringify(h0));
  console.log('INFO done stats', dn.join(' | '), 'moves credited', h0.moves);
  check('Done (no level) -> Reports tab', (await q('.tab.on')) === 'Reports');

  // plan day, all skipped
  await act('tab', { text: 'Plan' }); await act('selday', { data: { d: 1 } }); await act('planstart');
  check('Plan START: warm-up first', (await q('.ready .word')) === 'WARM UP', await q('.ready .word'));
  let n = 0; while (!(await exists('.screen.done')) && n++ < 120) { if (!(await act('wskip'))) break; }
  check('Skipping through a full day reaches the end', await exists('.screen.done'), 'taps ' + n);
  await act('donefin'); st = await state();
  check('Plan day: Day 1 marked done, Day 2 is next', st.progress[0].done[1] > 0 && st.progress[0].current === 2, JSON.stringify(st.progress));
  check('Plan: now on Day 2 and Day 1 card is ticked', (await q('.daytitle h2')) === 'Day 2' && (await exists('.dcard.done')));

  // level complete -> next level
  await setState({ progress: { 0: { done: {}, current: lv0.n } } });
  await act('tab', { text: 'Plan' }); check('Last day selected', (await q('.daytitle h2')) === 'Day ' + lv0.n, await q('.daytitle h2'));
  await act('planstart'); n = 0; while (!(await exists('.screen.done')) && n++ < 120) { if (!(await act('wskip'))) break; }
  check('LEVEL COMPLETE shown on the last day', (await text()).includes('LEVEL COMPLETE'));
  await act('nextlevel'); st = await state(); check('NEXT LEVEL moves to level 2', st.levelIndex === 1 && /intermediate/i.test(await q('.plantop h1')), await q('.plantop h1'));

  // test day at Master cycle 2
  await setState({ levelIndex: 5 }); await act('tab', { text: 'Plan' });
  check('Master cycle 2 selected', /master cycle 2/i.test(await q('.plantop h1')), await q('.plantop h1'));
  check('Cycle 2 day 1 is a test day: Max hold, no Edit', (await text()).includes('Max hold') && (await text()).includes('test day') && !(await exists('[data-act="editday"]')));
  await shot('plan-testday');
  await act('planstart'); n = 0; while (!(await exists('.slider')) && n++ < 20) await act('wskip');
  check('Test day: reaches the count-up plank with slider', await exists('.slider') && /^\d\d:\d\d$/.test(await q('#pn')), await q('#pn'));
  await sleep(2400); const cu = await q('#pn'); check('Test day: counts UP in real time', /^00:0[2-4]$/.test(cu), cu); await shot('workout-testday');
  const kn = await ev(`(() => { const k=document.querySelector('.knob'); const r=k.getBoundingClientRect(); const s=document.querySelector('.slider').getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2, to:s.right-10}; })()`);
  await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: kn.x, y: kn.y }] });
  for (let i = 1; i <= 10; i++) { await cdp('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: kn.x + (kn.to - kn.x) * i / 10, y: kn.y }] }); await sleep(30); }
  await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(300);
  const afterSlide = await q('.tr') || await q('.mvname');
  check('Test day: sliding moves on to the next exercise (not the end of the day)', !(await text()).includes('WORKOUT COMPLETE') && !!afterSlide, afterSlide);
  n = 0; while (!(await exists('.screen.done')) && n++ < 40) { if (!(await act('wskip'))) break; }
  check('Test day: the rest of the day plays through to the end', await exists('.screen.done'));
  st = await state(); const tdh = st.history[0];
  console.log('INFO test-day result:', JSON.stringify({ secs: tdh.secs, moves: tdh.moves, best: st.best }));
  check('Test day: best = the plank hold only (2-6 s), not the whole session', st.best && st.best.secs >= 2 && st.best.secs <= 6, JSON.stringify(st.best));
  await act('donefin');

  // ---------------- 6. Reports ----------------
  await act('tab', { text: 'Reports' }); await noOverflow('Reports'); await shot('reports');
  const rs = await ev(`[...document.querySelectorAll('.stats .n')].map(n => n.innerText)`);
  st = await state(); check('Reports: workout count matches history', rs[0] === String(st.history.filter(h => h.kind === 'workout').length), rs.join('|'));
  await act('rtab', { data: { v: 'data' } }); check('Reports: Data tab hides the calendar stats', !(await exists('.stats'))); await act('rtab', { data: { v: 'calendar' } });
  await act('weightdlg'); await typeInto('#wval', '5'); await act('weightsave'); st = await state(); check('Weight: 5 is refused', st.weights.length === 0 && (await exists('.dialog')));
  await typeInto('#wval', '150'); await act('weightsave'); st = await state();
  check('Weight: 150 lb saved as ~68.04 kg', st.weights.length === 1 && Math.abs(st.weights[0].kg - 68.04) < 0.05, JSON.stringify(st.weights));
  check('Weight: card shows 150.0', (await text()).includes('150.0'));
  await act('bmidlg'); check('BMI without height asks for height', await exists('#hft'));
  await typeInto('#hft', '5'); await typeInto('#hin', '10'); await act('heightsave'); st = await state();
  check('Height: 5 ft 10 in saved as 177.8 cm', Math.abs(st.heightCm - 177.8) < 0.1, String(st.heightCm));
  check('BMI worked out: 21.5 Healthy range', (await text()).includes('21.5') && (await text()).includes('Healthy'), (await text()).match(/BMI[\s\S]{0,80}/)?.[0]);
  await shot('reports-filled');
  await act('weightdlg'); await act('wunit', { data: { v: 'kg' } }); check('Weight dialog: lb -> kg converts the number', Math.abs(Number(await ev(`document.getElementById('wval').value`)) - 68) < 0.2, await ev(`document.getElementById('wval').value`));
  await act('dlgclose');
  await act('history'); const mlab = await q('.rcard b'); check('History: shows this month', !!mlab, mlab); const days = await count('.cal .d.on'); check('History: days with workouts are marked', days >= 1, 'marked ' + days);
  check('History: entries listed', (await count('.entry')) >= 3, 'entries ' + await count('.entry')); await shot('history');
  await act('hmonth', { data: { d: -1 } }); check('History: last month is empty', (await text()).includes('No workouts this month')); await act('hmonth', { data: { d: 1 } }); check('History: next month returns', (await count('.entry')) >= 3); await act('back');
  // weight chart needs two weights
  await inject(`(() => { const s=JSON.parse(localStorage.getItem('${KEY}')); s.weights.unshift({date:'2026-11-01',kg:70}); localStorage.setItem('${KEY}', JSON.stringify(s)); })()`); await act('tab', { text: 'Reports' });
  check('Weight chart appears with two weights', await exists('svg.chart'));

  // ---------------- 7. reload keeps everything, pagehide flush ----------------
  const stBefore = JSON.stringify(await state()); await reload(); check('State survives a reload unchanged', JSON.stringify(await state()) === stBefore);
  await act('tab', { text: 'Mine' }); await act('unitsdlg'); await ev(`(() => { document.querySelector('[data-act="unit"][data-k="wUnit"][data-v="kg"]').click(); window.dispatchEvent(new Event('pagehide')); })()`);
  st = JSON.parse(await ev(`localStorage.getItem('${KEY}')`)); check('pagehide writes immediately (no 50 ms wait)', st.settings.wUnit === 'kg'); await act('unit', { data: { k: 'wUnit', v: 'lb' } });

  // ---------------- 8. bad / blocked storage ----------------
  await inject(`localStorage.setItem('${KEY}', '{broken json')`);
  check('Corrupt saved data: app still opens with defaults', (await count('.tab')) === 5 && (await text()).includes('No record at present'));
  await inject(`localStorage.setItem('${KEY}', JSON.stringify({levelIndex: 3, settings: {restMode:'custom'}}))`);
  await act('tab', { text: 'Plan' }); check('Partial saved data: missing fields filled in', /expert/i.test(await q('.plantop h1')) && (await count('.dcard')) > 10, await q('.plantop h1'));
  await inject(`localStorage.setItem('${KEY}', JSON.stringify({history: 'oops', weights: [{date:'x', kg:'<b>'}], levelIndex: -5, edits: {'0-3': [['plank','NaN']]}, custom: [['<img src=x>', 30]], settings: {wUnit: '<i>', restSecs: 'abc'}, best: {secs: '9'}}))`);
  await act('tab', { text: 'Reports' }); check('Tampered save: Reports opens, nothing injected', !(await text()).includes('Something went wrong') && (await count('#app img[src="x"]')) === 0);
  await act('tab', { text: 'Plan' }); check('Tampered save: bad level/edits ignored, Plan opens on Beginner', /beginner/i.test(await q('.plantop h1')) && (await count('.dcard')) > 20, await q('.plantop h1'));
  await inject(`localStorage.setItem('${KEY}', '{broken json')`); await sleep(200);
  check('Corrupt save: unreadable original kept as a backup copy', (await ev(`localStorage.getItem('${KEY}:corrupt')`)) === '{broken json');
  const sid = (await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})` })).result.identifier;
  await cdp('Page.reload'); await sleep(900);
  check('Blocked storage (private window): app still works', (await count('.tab')) === 5);
  await act('tab', { text: 'Reports' }); await act('weightdlg'); await typeInto('#wval', '160'); await act('weightsave');
  check('Blocked storage: no crash when saving', (await count('.tab')) === 5 && !(await text()).includes('Something went wrong'));
  await cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: sid });
  await inject(`localStorage.removeItem('${KEY}')`);

  // ---------------- 9. Mine destructive ----------------
  await setState({ progress: { 0: { done: { 1: 1 }, current: 2 } }, history: [{ ts: Date.now(), kind: 'workout', name: 'X', secs: 60, kcal: 3, moves: 2 }], weights: [{ date: '2026-11-01', kg: 70 }], levelIndex: 2, best: { secs: 40, ts: 1 } });
  await act('tab', { text: 'Mine' }); await act('restartdlg'); await act('dlgclose'); st = await state(); check('Restart: CANCEL changes nothing', st.history.length === 1);
  await act('restartdlg'); await act('restartgo'); st = await state();
  check('Restart progress: progress, history, record cleared; weight kept', Object.keys(st.progress).length === 0 && st.history.length === 0 && st.best === null && st.levelIndex === 0 && st.weights.length === 1, JSON.stringify({ p: st.progress, h: st.history.length, w: st.weights.length }));
  await act('wipedlg'); await act('wipego'); st = await state(); check('Delete all data: everything cleared incl. weight', st.weights.length === 0 && st.settings.restMode === 'default');
  await act('tab', { text: 'Challenge' }); check('After wipe, Challenge shows no record', (await text()).includes('No record at present'));

  // ---------------- 10. offline ----------------
  await act('tab', { text: 'Library' });
  const picOk = await waitFor(`[...document.querySelectorAll('img.pic')].some(i => i.complete && i.naturalWidth > 0)`, 3000); check('Library pictures load (online)', picOk);
  const ext = reqs.filter(u => !u.startsWith(URL0) && !u.startsWith('data:') && !u.startsWith('blob:') && !u.startsWith('chrome-extension:'));
  check('No request ever left the app (only 127.0.0.1)', ext.length === 0, ext.slice(0, 3).join(', '));
  check('No missing files (404) during the whole run', bad.length === 0, bad.slice(0, 5).join(', '));
  await stopServer(); await sleep(300);
  await cdp('Page.reload'); await sleep(1500);
  check('OFFLINE: app opens with the server stopped', (await count('.tab')) === 5 && (await text()).includes('Challenge'));
  await act('tab', { text: 'Library' }); const picOff = await waitFor(`[...document.querySelectorAll('img.pic')].some(i => i.complete && i.naturalWidth > 0)`, 3000); check('OFFLINE: pictures still load', picOff);
  await act('libopen', { data: { id: 'back-stretching' } }); check('OFFLINE: workout detail opens', (await count('.exrow')) > 3);
  await act('libstart', { data: { id: 'back-stretching' } }); check('OFFLINE: workout starts', await exists('.ready'));
  await shot('offline-workout'); await act('wquit'); await act('giveupquit');
} catch (e) {
  fail++; failures.push('SCRIPT CRASH: ' + e.message); console.log('CRASH', e.stack);
}

console.log('\n==== ' + pass + ' passed, ' + fail + ' failed ====');
failures.forEach(f => console.log(' - ' + f));
if (problems.length) console.log('Page errors:', [...new Set(problems)].slice(0, 10));
if (small.length) console.log('Taps smaller than 36 px:', [...new Set(small)]);
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ pass, fail, failures, problems: [...new Set(problems)], small: [...new Set(small)] }, null, 1));
try { ws.close(); } catch { /* ignore */ }
edge.kill(); try { server.close(); } catch { /* ignore */ }
setTimeout(() => process.exit(fail ? 1 : 0), 300);
