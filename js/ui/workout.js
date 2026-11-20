import { ui, acts, views, render, openDialog, closeDialog, toast } from './ctx.js';
import { esc, I, fig, demi, mmss, hms } from './common.js';
import { load, save, addHistory, markDone, progressOf } from '../store.js';
import { Player } from '../player.js';
import { moveName, moveDesc } from '../data/moves.js';
import { dayCount } from '../engine.js';

const WORD = { warm: 'WARM UP', main: "LET'S GO", cool: 'COOL DOWN', lib: 'GET READY' };

export function startWorkout(items, meta) {
  if (ui.player) ui.player.stop();
  ui.meta = meta; ui.done = null;
  ui.player = new Player(items, { kind: 'workout', onChange: () => render(), onTick: tickDom, onDone: r => finishWorkout(r) });
  ui.stack = [{ v: 'workout' }];
  render();
}
function finishWorkout(r) {
  const m = ui.meta, rec = { kind: 'workout', name: m.name.toUpperCase(), secs: r.secs, kcal: r.kcal, moves: r.moves };
  let levelDone = false;
  if (m.level !== undefined && m.level !== null) {
    rec.level = m.level; rec.day = m.day; markDone(m.level, m.day);
    levelDone = m.day >= dayCount(m.level); // the last day of every level is a training day
  }
  addHistory(rec);
  if (m.test) { const s = load(), t = r.hold || 0; /* test-day plank counts as a challenge record too */ if (t > 0 && (!s.best || t > s.best.secs)) { s.best = { secs: t, ts: Date.now() }; save(); } }
  ui.player = null; ui.done = { ...r, name: m.name, level: m.level, day: m.day, levelDone, test: m.test };
  ui.stack = [{ v: 'done' }]; render();
}
function tickDom() {
  const p = ui.player; if (!p) return;
  const n = document.getElementById('pn'); if (n) n.textContent = p.phase === 'move' && p.countUp ? mmss(p.elapsed) : String(p.remaining) + (p.phase === 'move' ? '"' : '');
  const f = document.getElementById('pf'); if (f) f.style.width = (p.fraction * 100).toFixed(1) + '%';
  const rg = document.getElementById('pring'); if (rg) rg.setAttribute('stroke-dashoffset', String(628 * (1 - (p.phaseLen ? Math.max(0, 1 - p.acc / p.phaseLen) : 0))));
}

const spk = () => load().settings.mute ? I.mute : I.spk;

views.workout = () => {
  const p = ui.player; if (!p) return '';
  const it = p.item, total = p.items.length;
  if (p.phase === 'ready') return `<div class="screen wk ready"><div class="wtop" style="width:100%;padding-top:calc(var(--sat) + 10px)"><button class="icon-btn" data-act="wquit" aria-label="Back">${I.back}</button><button class="icon-btn rnd" data-act="mute" aria-label="Sound">${spk()}</button></div>
    <div class="ghost">${fig(it.id, 330)}</div><div class="nm">${esc(moveName(it.id))}</div><div id="pn" class="num cond">${p.remaining}</div><div class="word cond">${WORD[it.section] || 'GET READY'}</div>
    <div style="flex:1"></div><div style="width:100%;padding:0 40px calc(var(--sab) + 40px)"><button class="pill grad" data-act="wskip" style="height:64px">SKIP</button></div></div>`;
  if (p.phase === 'rest') { const n = p.next; return `<div class="screen rest"><div class="wtop" style="padding-top:calc(var(--sat) + 10px)"><button class="icon-btn" data-act="wquit" aria-label="Back">${I.back}</button><button class="icon-btn rnd" data-act="mute" aria-label="Sound">${spk()}</button></div>
    <div class="tr">Take a rest</div><div class="ringw"><svg width="230" height="230" viewBox="0 0 230 230"><circle cx="115" cy="115" r="100" fill="none" stroke="#2A3A5C" stroke-width="12"/><circle id="pring" cx="115" cy="115" r="100" fill="none" stroke="#7283FF" stroke-width="12" stroke-linecap="round" stroke-dasharray="628" stroke-dashoffset="${628 * (1 - Math.max(0, 1 - p.acc / p.phaseLen))}"/></svg><div id="pn" class="c cond">${p.remaining}</div></div>
    <div class="restbtns"><button style="border:2px solid var(--ac)" data-act="wadd">+20s</button><button style="background:var(--ac)" data-act="wskip">SKIP</button></div>
    <div class="card nextcard"><div style="flex:1"><div style="font-size:18px;font-weight:700;color:var(--grey)">Next ${p.idx + 2}/${total}</div><div class="nn cond">${esc(moveName(n.id))}</div><div style="color:var(--grey);margin-top:6px;font-size:24px;font-weight:700">${n.secs ? mmss(n.secs) : 'Max hold'}</div></div><div class="thumb" style="width:140px;height:105px">${fig(n.id, 140)}</div></div></div>`; }
  // move
  const segs = p.items.map((_, i) => `<i class="${i < p.idx ? 'on' : i === p.idx ? 'cur' : ''}"></i>`).join('');
  const rated = load().ratings[it.id];
  const rateHtml = `<div class="rate"><button class="${rated === -1 ? 'on' : ''}" data-act="wrate" data-v="-1" aria-label="Thumbs down"><span style="transform:scaleY(-1);display:block;line-height:0">${I.up}</span></button><button class="${rated === 1 ? 'on' : ''}" data-act="wrate" data-v="1" aria-label="Thumbs up">${I.up}</button></div>`;
  const cu = p.countUp;
  return `<div class="screen light"><div class="prog">${segs}</div><div class="wtop"><button class="icon-btn" data-act="wquit" aria-label="Back" style="color:var(--ink)">${I.back}</button>
    <div class="row" style="gap:10px"><button class="icon-btn rnd" data-act="mute" aria-label="Sound">${spk()}</button><button class="icon-btn rnd" data-act="whow" aria-label="How to">?</button></div></div>
    <div class="stage2">${fig(it.id, 380, undefined, true)}</div>
    <div class="bignum"><span id="pn" class="s cond">${cu ? mmss(p.elapsed) : p.remaining + '"'}</span>${cu ? '' : `<span class="t cond">/${it.secs}"</span>`}${cu ? '' : rateHtml}</div>
    <div class="mvname cond ${p.paused ? 'paused' : ''}">${p.paused ? 'PAUSED' : esc(moveName(it.id))}</div>
    ${cu ? `<div class="slider" data-slider="test"><div class="lbl">Slide to complete</div><div class="knob">»</div></div>` : `<div class="cbar"><div id="pf" class="fill" style="width:${(p.fraction * 100).toFixed(1)}%"></div><button data-act="wprev" aria-label="Previous">${I.prev}</button><button class="main" data-act="wpause" aria-label="${p.paused ? 'Resume' : 'Pause'}">${p.paused ? I.play : I.pause}</button><button data-act="wskip" aria-label="Next">${I.next}</button></div>`}</div>`;
};
acts.wskip = () => ui.player?.skip();
acts.wpause = () => ui.player?.togglePause();
acts.wprev = () => ui.player?.prev();
acts.wadd = () => ui.player?.addRest();
acts.wquit = () => { if (ui.player && !ui.player.paused) ui.player.togglePause(); openDialog({ kind: 'giveup' }); };
acts.wrate = el => { const s = load(), id = ui.player.item.id, v = Number(el.dataset.v); if (s.ratings[id] === v) delete s.ratings[id]; else s.ratings[id] = v; save(); render(); };
acts.whow = () => { const p = ui.player; if (!p.paused) p.togglePause(); openDialog({ kind: 'sheet', id: p.item.id, secs: p.item.secs, resume: true }); };
acts.giveupstay = () => { closeDialog(); if (ui.player?.paused) ui.player.togglePause(); };
acts.giveupquit = () => { if (ui.player) { ui.player.stop(); ui.player = null; } ui.dialog = null; ui.stack = []; render(); };

export function workoutDialog() {
  const d = ui.dialog; if (!d || d.kind !== 'giveup') return '';
  return `<div class="dim" style="background:#1f1b4d"><div style="width:100%;max-width:420px;color:#fff;text-align:center"><h2 style="font-size:28px">Why give up?</h2><p style="color:#C9D0E4;margin:10px 0 22px;line-height:1.4">Quitting now means this workout is not saved.</p>
  <button class="pill" data-act="giveupstay">KEEP GOING</button><button class="pill quiet" style="color:#fff;margin-top:12px" data-act="giveupquit">Quit ›</button></div></div>`;
}

views.done = () => {
  const r = ui.done; if (!r) return '';
  const title = r.levelDone ? 'LEVEL COMPLETE' : 'WORKOUT COMPLETE';
  return `<div class="screen done"><div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;padding-top:var(--sat)">
    <div class="row" style="gap:14px;align-items:flex-start">${I.medal.replace('width="88" height="100"', 'width="130" height="140"')}<div style="background:#fff;border-radius:50%;width:64px;height:64px;display:grid;place-items:center;margin-top:60px">${demi(52)}</div></div>
    <div class="cond" style="font-size:34px;margin-top:20px;letter-spacing:.02em">${title}</div>
    <div style="color:var(--ok);font-weight:800;font-size:16px;letter-spacing:.1em;margin-top:6px">✓ ${esc(r.name.toUpperCase())}</div>
    <div class="stats3"><div><div class="n cond">${r.secs >= 3600 ? hms(r.secs) : mmss(r.secs)}</div><div class="l">TIME</div></div><div><div class="n cond">${r.kcal}</div><div class="l">KCAL</div></div><div><div class="n cond">${r.moves}</div><div class="l">MOVES</div></div></div></div>
    <div style="width:100%;padding:0 24px calc(var(--sab) + 40px)">${r.levelDone ? `<button class="pill" data-act="nextlevel">NEXT LEVEL</button><button class="pill quiet" style="color:var(--s2)" data-act="donefin">Done</button>` : `<button class="pill" data-act="donefin">DONE</button>`}</div></div>`;
};
acts.donefin = () => { const r = ui.done; ui.done = null; ui.stack = []; ui.tab = r && r.level !== undefined ? 'plan' : 'reports'; if (r && r.level !== undefined) ui.sel[r.level] = Math.min(progressOf(r.level).current, dayCount(r.level)); render(); };
acts.nextlevel = () => { const r = ui.done, s = load(); s.levelIndex = (r.level ?? s.levelIndex) + 1; save(); ui.done = null; ui.stack = []; ui.tab = 'plan'; render(); };
