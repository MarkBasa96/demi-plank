import { ui, acts, views, go, back, render, openDialog, closeDialog, toast, top } from './ctx.js';
import { esc, I, fig, demi, q, mmss, hms } from './common.js';
import { load, save, flush, progressOf, dayKey, kgToLb, lbToKg, resetProgress, wipeAll, addHistory, markDone } from '../store.js';
import { getLevel, getSession, dayMinutes, dayCount, levelBlurb, REST_DAYS } from '../engine.js';
import { moveName, moveDesc, movePose, kcalPerMin } from '../data/moves.js';
import { LIBRARY } from '../data/library.js';
import { listVoices, say } from '../voice.js';
import { Challenge } from '../player.js';
import { startWorkout } from './workout.js';

const S = () => load().settings;
const tabBar = a => `<nav class="tabs">${[['tro', 'Challenge', 'challenge'], ['lib', 'Library', 'library'], ['plan', 'Plan', 'plan'], ['rep', 'Reports', 'reports'], ['me', 'Mine', 'mine']]
  .map(([i, l, k]) => `<button class="tab ${a === k ? 'on' : ''}" data-act="tab" data-v="${k}">${I[i]}<span>${l}</span></button>`).join('')}</nav>`;
const topbar = (t, right = q) => `<header class="top"><h1>${t}</h1>${right}</header>`;
const topback = (t, right = '') => `<header class="top"><button class="icon-btn" data-act="back" aria-label="Back">${I.back}</button><h1 style="font-size:20px;flex:1;margin-left:4px">${t}</h1>${right}</header>`;

acts.tab = el => { ui.tab = el.dataset.v; ui.stack = []; render(); };
acts.back = () => back();
acts.noop = () => {};

// ---------- Challenge ----------
const TARGETS = [[0, 'Unlimited'], [30, '0:30'], [60, '1:00'], [90, '1:30'], [120, '2:00'], [180, '3:00'], [300, '5:00']];
function challengeTab() {
  const b = load().best;
  return `<div class="screen">${topbar('Challenge')}<div class="content"><div class="card chal">
    <div class="medal">${I.medal}</div>
    <div class="kicker">${b ? 'BEST RECORD' : 'PLANK CHALLENGE'}</div>
    <div class="big cond">${mmss(b ? b.secs : 0)}</div>
    <div class="note">${b ? new Date(b.ts).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '◷&nbsp; No record at present.'}</div>
    <button class="pill" data-act="chalpick">${b ? 'GO!' : 'START'}</button></div></div>${tabBar('challenge')}</div>`;
}
acts.chalpick = () => { ui.target = ui.target || 0; go('chalpick'); };
views.chalpick = () => `<div class="screen">${topback('Plank Challenge')}<div class="content">
  <div class="card ruler"><div class="unl cond">${ui.target ? mmss(ui.target) : 'UNLIMITED'}</div>
  <div class="ticks">${TARGETS.map(([s, l]) => `<button class="${ui.target === s ? 'on' : ''}" data-act="target" data-s="${s}">${l}</button>`).join('')}</div>
  <p style="color:var(--grey);margin-top:6px">Challenge yourself and hold as long as you can.</p></div>
  <button class="pill" data-act="chalgo">CHALLENGE NOW</button></div></div>`;
acts.target = el => { ui.target = Number(el.dataset.s); render(); };
acts.chalgo = () => {
  ui.stack = [{ v: 'chalrun' }];
  ui.chalSecs = 0;
  ui.challenge = new Challenge(ui.target, { onTick: () => { const n = document.getElementById('cht'); if (n && ui.challenge) n.textContent = hms(ui.challenge.secs); }, onDone: s => finishChallenge(s) });
  render();
};
views.chalrun = () => `<div class="screen lav">
  <div class="wtop" style="padding-top:calc(var(--sat) + 10px)"><button class="icon-btn" data-act="chalquit" aria-label="Back" style="color:var(--ink)">${I.back}</button>
  <button class="icon-btn" data-act="mute" style="background:#fff;color:var(--ink)" aria-label="Sound">${S().mute ? I.mute : I.spk}</button></div>
  <div class="stage2" style="align-content:center;gap:14px"><div id="cht" class="cond" style="font-size:78px;line-height:1">${hms(ui.challenge ? ui.challenge.secs : 0)}</div>
  <div style="font-weight:800;letter-spacing:.14em;color:var(--act);font-size:17px;text-align:center">CHALLENGE YOURSELF!</div>
  <div style="margin-top:20px;text-align:center">${fig('plank', 360, 'plank')}</div></div>
  <div class="slider" data-slider="chal"><div class="lbl">Slide to complete</div><div class="knob">»</div></div></div>`;
acts.mute = () => { const s = load(); s.settings.mute = !s.settings.mute; save(); render(); };
acts.chalquit = () => openDialog({ kind: 'chalquit' });
function finishChallenge(secs) {
  if (ui.challenge) { ui.challenge.stop(); ui.challenge = null; }
  const s = load(); let rec = false;
  if (secs > 0) {
    addHistory({ kind: 'challenge', name: 'PLANK CHALLENGE', secs, kcal: Math.round(secs * 4 / 60 * 10) / 10, moves: 0 });
    if (!s.best || secs > s.best.secs) { s.best = { secs, ts: Date.now() }; rec = true; }
    save();
  }
  ui.stack = []; ui.dialog = null; ui.tab = 'challenge'; render();
  if (secs > 0) toast(rec ? 'New record: ' + mmss(secs) : 'Saved: ' + mmss(secs));
}
acts.chalcontinue = () => closeDialog();
acts.chalend = () => { const s = ui.challenge ? ui.challenge.secs : 0; ui.dialog = null; finishChallenge(s); };
acts.chalslide = () => { const s = ui.challenge ? ui.challenge.secs : 0; finishChallenge(s); };

// ---------- Library ----------
const COLORS = { 'morning-warmup': '#E6E3FA', 'sleepy-time-stretching': '#DDEBF8', 'belly-fat-burner-hiit': '#F8DDE6', 'knee-pain-relief': '#E4F3E8', 'back-stretching': '#FBEFD9' };
const COVER = { 'morning-warmup': 'jumping-jacks', 'sleepy-time-stretching': 'child-s-pose', 'belly-fat-burner-hiit': 'mountain-climber', 'knee-pain-relief': 'quarter-wall-squat', 'back-stretching': 'cat-cow-pose' };
const wsecs =w => (w.moves || w.levels[0].moves).reduce((a, m) => a + m[1], 0);
function libraryTab() {
  const groups = ['ROUTINE', 'HIIT', 'PAIN RELIEF'];
  return `<div class="screen">${topbar('Library')}<div class="content">${groups.map(g => `<div class="sech">${g}</div>${LIBRARY.filter(w => w.group === g).map(w => {
    const moves = w.moves || w.levels[0].moves;
    const meta = w.levels ? 'HIIT · 3 levels' : `${Math.round(wsecs(w) / 60)} mins · ${moves.length} workouts`;
    return `<button class="lcard" style="background:${COLORS[w.id]}" data-act="libopen" data-id="${w.id}"><h3>${esc(w.name.toUpperCase())}</h3><p>${esc(w.blurb)}</p><span class="chip">${meta}</span>${fig(COVER[w.id] || 'lib-' + w.id, 180, w.pose)}</button>`;
  }).join('')}`).join('')}<p style="color:var(--s2);font-size:14px;margin-top:6px">More exercises are on the way!</p></div>${tabBar('library')}</div>`;
}
acts.libopen = el => { const w = LIBRARY.find(x => x.id === el.dataset.id); go(w.levels ? 'hiitlevels' : 'libdetail', { id: w.id, lv: 0 }); };
views.hiitlevels = () => { const w = LIBRARY.find(x => x.id === top().id); return `<div class="screen">${topback(esc(w.name))}<div class="content">
  <p style="color:#C9D0E4;line-height:1.5;margin:6px 0 16px">HIIT alternates intense exercises with recovery. Combined with abs work it burns fat and keeps burning calories for hours afterwards.</p>
  ${w.levels.map((l, i) => `<button class="lcard" style="background:${['#F8DDE6', '#F3D2DD', '#EDC5D3'][i]};min-height:100px" data-act="libopen2" data-id="${w.id}" data-lv="${i}"><h3>${l.name.toUpperCase()}</h3><span class="chip" style="position:static;margin-top:10px;display:inline-flex">${Math.round(l.moves.reduce((a, m) => a + m[1], 0) / 60)} mins · ${l.moves.length} workouts</span></button>`).join('')}</div></div>`; };
acts.libopen2 = el => go('libdetail', { id: el.dataset.id, lv: Number(el.dataset.lv) });
const libMoves = (w, lv) => w.levels ? w.levels[lv].moves : w.moves;
views.libdetail = () => {
  const t = top(), w = LIBRARY.find(x => x.id === t.id), mv = libMoves(w, t.lv), secs = mv.reduce((a, m) => a + m[1], 0);
  const name = w.levels ? w.name + ' · ' + w.levels[t.lv].name : w.name;
  return `<div class="screen light"><div class="hero" style="background:${COLORS[w.id]}"><button class="icon-btn" data-act="back" aria-label="Back" style="margin-left:-10px">${I.back}</button>
  <div class="figw" style="width:0;height:0"></div>${fig(COVER[w.id] || 'lib-' + w.id, 260, w.pose)}<h2>${esc(name.toUpperCase())}</h2></div>
  <div class="content"><div class="row" style="gap:8px;margin:14px 0"><span class="chip">${Math.round(secs / 60)} mins</span><span class="chip">${mv.length} workouts</span></div>
  <p style="color:#4A5272;line-height:1.45;margin-bottom:12px"><b style="color:var(--ink);font-size:17px;display:block;margin-bottom:4px">Introduction</b>${esc(w.blurb)} Follow the voice coach. Move slowly and breathe.</p>
  <b style="font-size:17px">Exercise List</b>${mv.map(([id, s], i) => `<button class="exrow" data-act="mvsheet" data-id="${id}" data-s="${s}"><span class="thumb">${fig(id, 76)}</span><div><b>${esc(moveName(id))}</b><span>${mmss(s)}</span></div></button>`).join('')}</div>
  <div class="stickybtn"><button class="pill" data-act="libstart" data-id="${w.id}" data-lv="${t.lv}">START</button></div></div>`;
};
acts.libstart = el => { const w = LIBRARY.find(x => x.id === el.dataset.id), mv = libMoves(w, Number(el.dataset.lv)); startWorkout(mv.map(([id, s]) => ({ id, secs: s, section: 'lib' })), { name: w.levels ? w.name : w.name, back: 'libdetail' }); };

// ---------- Plan ----------
const lvIndex = () => load().levelIndex;
const selDay = li => { const p = progressOf(li), n = dayCount(li); return Math.min(ui.sel[li] || p.current, n); };
export function sessionFor(li, day) {
  const s = getSession(li, day, { warm: S().warm }); if (!s) return null;
  const ed = load().edits[li + '-' + day];
  if (ed && !s.test) { const warm = s.items.filter(x => x.section === 'warm'), cool = s.items.filter(x => x.section === 'cool'); s.items = [...warm, ...ed.map(([id, sc]) => ({ id, secs: sc, section: 'main' })), ...cool]; }
  return s;
}
function planTab() {
  const li = lvIndex(), lv = getLevel(li), p = progressOf(li), d = selDay(li), n = dayCount(li);
  const cards = lv.days.map(x => x.rest ? `<button class="dcard rest" data-act="selday" data-d="${x.day}" ${d === x.day ? 'style="outline:3px solid #3D5AFE;outline-offset:-3px"' : ''}>${I.cup}</button>`
    : `<button class="dcard ${d === x.day ? 'sel' : ''} ${p.done[x.day] ? 'done' : ''}" data-act="selday" data-d="${x.day}">${fig('plank', 170, x.day % 2 ? 'plank' : 'side')}<span class="dn cond">Day ${x.day}</span></button>`).join('')
    + `<button class="dcard more" data-act="levels">MORE<br>PLANS</button>`;
  const ses = sessionFor(li, d);
  let body;
  if (!ses) body = `<div class="restday"><div class="halo">${demi(120)}</div><h2 class="cond">REST DAY</h2><p>Your body and muscles need to get some rest</p></div>`;
  else {
    const wrm = ses.items.filter(x => x.section === 'warm'), main = ses.items.filter(x => x.section === 'main'), cool = ses.items.filter(x => x.section === 'cool');
    const rows = a => a.map(x => `<button class="exrow" data-act="mvsheet" data-id="${x.id}" data-s="${x.secs}"><span class="thumb">${fig(x.id, 76)}</span><div><b>${esc(moveName(x.id))}</b><span>${x.secs ? mmss(x.secs) : 'Max hold'}</span></div></button>`).join('');
    const secs = ses.items.reduce((a, x) => a + x.secs, 0) + Math.max(0, main.length - 1) * (S().restMode === 'custom' ? S().restSecs : 20);
    body = `<div class="daytitle"><h2 class="cond">Day ${d}</h2>${ses.test ? '' : `<button class="link" data-act="editday">✎ Edit</button>`}</div>
    <div style="color:#9AA6C0;font-size:14px;margin:2px 0 12px">${Math.round(secs / 60)} mins · ${ses.items.length} workouts${ses.test ? ' · test day: hold your plank as long as you can' : ''}</div>
    <div class="row spread" style="margin:10px 0 4px"><b style="font-size:16px">Warm up</b><button class="toggle ${S().warm ? 'on' : ''}" data-act="togglewarm" aria-label="Warm up"></button></div>${S().warm ? rows(wrm) : ''}
    <b style="font-size:16px;display:block;margin:12px 0 2px">Exercise</b>${rows(main)}
    <b style="font-size:16px;display:block;margin:12px 0 2px">Cool down</b>${rows(cool)}`;
  }
  return `<div class="screen plan"><div class="plantop"><h1 class="cond">${esc(lv.name)}</h1><button class="swapbtn" data-act="levels" aria-label="Change level">${I.swap}</button></div>
  <div class="days" id="days">${cards}</div><div class="pbody">${body}</div>
  ${ses ? `<div class="startfloat"><button class="pill grad" data-act="planstart">START</button></div>` : ''}${tabBar('plan')}</div>`;
}
acts.selday = el => { ui.sel[lvIndex()] = Number(el.dataset.d); render(); };
acts.togglewarm = () => { const s = load(); s.settings.warm = !s.settings.warm; save(); render(); };
acts.planstart = () => { const li = lvIndex(), d = selDay(li), ses = sessionFor(li, d); startWorkout(ses.items, { name: getLevel(li).name + ' · Day ' + d, level: li, day: d, test: ses.test, back: null }); };

// level chooser
views.levels = () => {
  const cur = lvIndex(), maxCycle = Math.max(cur, 4) + 1;
  const cards = [];
  for (let i = 0; i <= maxCycle && i <= Math.max(5, cur + 1); i++) { const l = getLevel(i); cards.push(`<button class="lvl ${cur === i ? 'on' : ''}" data-act="pick" data-i="${i}"><h3>${esc(l.name)}</h3><p>${esc(levelBlurb(i))}</p><div style="position:absolute;right:-16px;bottom:-4px">${fig('plank', 104, ['plank', 'side', 'plank', 'side', 'plank', 'side'][i % 6])}</div></button>`); }
  cards.push(`<button class="lvl" data-act="custom"><h3>My training</h3><p>Create your own training plan!</p></button>`);
  return `<div class="screen">${topback('Plank plan')}<div class="content"><div class="grid2">${cards.join('')}</div></div></div>`;
};
acts.levels = () => go('levels');
acts.pick = el => { const s = load(); s.levelIndex = Number(el.dataset.i); save(); ui.stack = []; ui.tab = 'plan'; render(); };
acts.custom = () => { go('custom'); };

// day edit + replace
const ALT = ['plank', 'straight-arm-plank', 'knee-plank', 'straight-arm-knee-plank', 'reverse-plank', 'side-plank-left', 'side-plank-right', 'kneeling-side-plank-left', 'kneeling-side-plank-right', 'left-side-plank-with-arm-raised', 'right-side-plank-with-arm-raised', 'leg-up-side-plank-left', 'leg-up-side-plank-right', 'wide-arm-plank', 'push-up-hold', 'plank-and-reach-left', 'plank-and-reach-right', 'leg-raised-plank-left', 'leg-raised-plank-right', 'diagonal-plank-hold-left', 'diagonal-plank-hold-right', 'plank-with-left-arm-lift', 'plank-with-right-arm-lift', 'single-left-leg-plank', 'single-right-leg-plank', 'modified-push-up-low-hold', 'reverse-plank-with-left-leg-raised', 'reverse-plank-with-right-leg-raised', 'side-plank-with-left-leg-raised', 'side-plank-with-right-leg-raised', 'cobra-stretch', 'standing-biceps-stretch-left', 'standing-biceps-stretch-right'];
const editList = () => ui.edit.list;
acts.editday = () => { const li = lvIndex(), d = selDay(li), ses = sessionFor(li, d); ui.edit = { kind: 'day', li, d, list: ses.items.filter(x => x.section === 'main').map(x => [x.id, x.secs]) }; go('edit'); };
views.edit = () => { const e = ui.edit, custom = e.kind === 'custom';
  return `<div class="screen light" style="background:var(--navy);color:#fff">${topback(custom ? 'My training' : 'Edit', custom ? '' : `<button class="link" data-act="editreset">Reset</button>`)}
  <div class="content">${e.list.length ? e.list.map(([id, s], i) => `<div class="edrow"><div class="mv"><button data-act="mvup" data-i="${i}" aria-label="Up">▲</button><button data-act="mvdn" data-i="${i}" aria-label="Down">▼</button></div>
   <span class="thumb">${fig(id, 76)}</span><button style="flex:1;text-align:left" data-act="mvsheet2" data-i="${i}"><b style="text-transform:uppercase;letter-spacing:.03em;font-size:14px">${esc(moveName(id))}</b><div style="color:#9AA6C0;font-size:14px">${mmss(s)}</div></button>
   <button class="icon-btn" data-act="mvrep" data-i="${i}" aria-label="Replace" style="background:rgba(255,255,255,.1)">⇄</button>${custom ? `<button class="icon-btn" data-act="mvdel" data-i="${i}" aria-label="Remove" style="color:var(--bad)">✕</button>` : ''}</div>`).join('') : '<p class="empty" style="color:#9AA6C0">Nothing here yet. Tap Add exercise.</p>'}
  ${custom ? `<button class="pill line" style="margin-top:16px" data-act="mvadd">+ ADD EXERCISE</button>` : ''}</div>
  <div class="stickybtn row" style="gap:12px">${custom && e.list.length ? `<button class="pill grad" data-act="customstart">START</button>` : ''}<button class="pill" data-act="editsave">SAVE</button></div></div>`; };
acts.mvup = el => { const i = Number(el.dataset.i), l = editList(); if (i > 0) { [l[i - 1], l[i]] = [l[i], l[i - 1]]; render(); } };
acts.mvdn = el => { const i = Number(el.dataset.i), l = editList(); if (i < l.length - 1) { [l[i + 1], l[i]] = [l[i], l[i + 1]]; render(); } };
acts.mvdel = el => { editList().splice(Number(el.dataset.i), 1); render(); };
acts.editreset = () => { const e = ui.edit, s = load(); delete s.edits[e.li + '-' + e.d]; save(); back(); toast('Day reset'); };
acts.editsave = () => { const e = ui.edit, s = load(); if (e.kind === 'custom') s.custom = e.list; else s.edits[e.li + '-' + e.d] = e.list; save(); back(); toast('Saved'); };
acts.mvrep = el => { ui.rep = { i: Number(el.dataset.i), add: false }; go('replace'); };
acts.mvadd = () => { ui.rep = { i: -1, add: true }; go('replace'); };
views.replace = () => { const e = ui.edit, r = ui.rep, cur = r.add ? null : e.list[r.i];
  return `<div class="screen">${topback(r.add ? 'Add exercise' : 'Replace exercise')}<div class="content">${cur ? `<div class="glabel">CURRENT</div><div class="exrow"><span class="thumb">${fig(cur[0], 76)}</span><div><b>${esc(moveName(cur[0]))}</b><span>${mmss(cur[1])}</span></div></div><div class="glabel">REPLACE WITH</div>` : ''}
  ${ALT.filter(id => !cur || id !== cur[0]).map(id => `<button class="exrow" data-act="mvchoose" data-id="${id}"><span class="thumb">${fig(id, 76)}</span><div><b>${esc(moveName(id))}</b><span>${cur ? mmss(cur[1]) : '00:30'}</span></div></button>`).join('')}</div></div>`; };
acts.mvchoose = el => { const e = ui.edit, r = ui.rep, id = el.dataset.id; if (r.add) e.list.push([id, 30]); else e.list[r.i] = [id, e.list[r.i][1]]; back(); };
acts.mvsheet2 = el => { const e = ui.edit, [id, s] = e.list[Number(el.dataset.i)]; openDialog({ kind: 'sheet', id, secs: s, editIdx: Number(el.dataset.i) }); };
acts.custom = () => { ui.edit = { kind: 'custom', list: load().custom.map(x => [...x]) }; go('edit'); };
acts.customstart = () => { const l = ui.edit.list; const s = load(); s.custom = l; save(); startWorkout(l.map(([id, sc]) => ({ id, secs: sc, section: 'main' })), { name: 'My training', back: null }); };

// exercise bottom sheet (shared)
acts.mvsheet = el => openDialog({ kind: 'sheet', id: el.dataset.id, secs: Number(el.dataset.s) });
acts.secdn = () => { const d = ui.dialog; d.secs = Math.max(5, d.secs - 5); render(); };
acts.secup = () => { const d = ui.dialog; d.secs = Math.min(600, d.secs + 5); render(); };
acts.sheetsave = () => { const d = ui.dialog; if (d.editIdx !== undefined) ui.edit.list[d.editIdx][1] = d.secs; closeDialog(); };

// ---------- Reports ----------
const histStats = () => { const h = load().history; return { n: h.filter(x => x.kind === 'workout').length, kcal: h.reduce((a, x) => a + (x.kcal || 0), 0), secs: h.reduce((a, x) => a + x.secs, 0) }; };
const daysWithActivity = () => new Set(load().history.map(h => dayKey(new Date(h.ts))));
function reportsTab() {
  const st = histStats(), act = daysWithActivity(), now = new Date(), sun = new Date(now); sun.setDate(now.getDate() - now.getDay());
  const week = [...Array(7)].map((_, i) => { const d = new Date(sun); d.setDate(sun.getDate() + i); return d; });
  const data = ui.planTab === 'data';
  const w = load().weights, u = S().wUnit, last = w[w.length - 1];
  const wtxt = last ? (u === 'kg' ? last.kg.toFixed(1) : kgToLb(last.kg).toFixed(1)) : null;
  const h = load().heightCm, bmi = last && h ? last.kg / ((h / 100) ** 2) : null;
  return `<div class="screen">${topbar('Reports')}<div class="rtabs"><button class="${data ? '' : 'on'}" data-act="rtab" data-v="calendar">Calendar</button><button class="${data ? 'on' : ''}" data-act="rtab" data-v="data">Data</button></div>
  <div class="content" style="padding-top:14px">
  ${data ? '' : `<div class="card stats"><div><div class="n cond">${st.n}</div><div class="l">WORKOUT</div></div><div><div class="n cond">${st.kcal.toFixed(1)}</div><div class="l">KCAL</div></div><div><div class="n cond">${mmss(st.secs)}</div><div class="l">DURATION</div></div></div>
  <div class="card rcard"><div class="row spread"><b>This week</b><button style="color:var(--act);font-weight:700;font-size:14px" data-act="history">History ›</button></div>
  <div class="week">${week.map((d, i) => { const on = act.has(dayKey(d)), t = dayKey(d) === dayKey(now); return `<div class="dot ${on ? 'on' : ''} ${t ? 'today' : ''}">${'SMTWTFS'[i]}<i>${on ? '✓' : d.getDate()}</i></div>`; }).join('')}</div></div>
  ${st.n + load().history.length === 0 ? `<div class="card rcard empty">${demi(96)}<div>Finish a workout and it shows up here.</div></div>` : ''}`}
  <div class="card rcard"><div class="row spread"><b>Weight (${u})</b><button class="small-pill" data-act="weightdlg">INPUT TODAY’S WEIGHT</button></div>${wtxt ? `<div class="row" style="margin-top:8px;color:var(--grey)">Latest <b class="cond" style="font-size:24px;color:var(--ink);margin-left:8px">${wtxt}</b></div>${w.length > 1 ? weightChart(w, u) : ''}` : ''}</div>
  <div class="card rcard"><div class="row spread"><b>BMI (kg/m²)</b><button class="small-pill" data-act="bmidlg">INPUT YOUR DATA</button></div>${bmi ? `<div style="margin-top:8px"><b class="cond" style="font-size:28px">${bmi.toFixed(1)}</b> <span style="color:var(--grey)">${bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy range' : bmi < 30 ? 'Overweight' : 'Obese'}</span></div>` : ''}</div>
  <div class="card rcard"><div class="row spread"><b>Height (${S().hUnit})</b><button class="small-pill" data-act="heightdlg">INPUT YOUR HEIGHT</button></div>${h ? `<div style="margin-top:8px;color:var(--grey)">${S().hUnit === 'cm' ? Math.round(h) + ' cm' : Math.floor(h / 2.54 / 12) + ' ft ' + (h / 2.54 % 12).toFixed(1) + ' in'}</div>` : ''}</div>
  </div>${tabBar('reports')}</div>`;
}
function weightChart(w, u) {
  const pts = w.slice(-14).map(x => u === 'kg' ? x.kg : kgToLb(x.kg)), mn = Math.min(...pts) - 1, mx = Math.max(...pts) + 1, W = 300, H = 120;
  const xy = pts.map((v, i) => [10 + i * (W - 20) / Math.max(1, pts.length - 1), H - 10 - (v - mn) / (mx - mn) * (H - 20)]);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline fill="none" stroke="#7283FF" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${xy.map(p => p.join(',')).join(' ')}"/>${xy.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#5565F0"/>`).join('')}</svg>`;
}
acts.rtab = el => { ui.planTab = el.dataset.v; render(); };
acts.weightdlg = () => { const w = load().weights, last = w[w.length - 1], u = S().wUnit; openDialog({ kind: 'weight', val: last ? (u === 'kg' ? last.kg : kgToLb(last.kg)).toFixed(1) : '', unit: u }); };
acts.heightdlg = () => { const h = load().heightCm, u = S().hUnit; openDialog({ kind: 'height', unit: u, cm: h ? Math.round(h) : '', ft: h ? Math.floor(h / 2.54 / 12) : '', inch: h ? (h / 2.54 % 12).toFixed(1) : '' }); };
acts.bmidlg = () => { if (!load().heightCm) { toast('Enter your height first'); return acts.heightdlg(); } if (!load().weights.length) { toast('Enter your weight first'); return acts.weightdlg(); } toast('BMI is worked out from your latest weight and height'); };
acts.history = () => { const n = new Date(); ui.histMonth = new Date(n.getFullYear(), n.getMonth(), 1); go('history'); };
acts.hmonth = el => { const m = ui.histMonth; ui.histMonth = new Date(m.getFullYear(), m.getMonth() + Number(el.dataset.d), 1); render(); };
views.history = () => {
  const m = ui.histMonth, y = m.getFullYear(), mo = m.getMonth(), first = new Date(y, mo, 1).getDay(), dim = new Date(y, mo + 1, 0).getDate(), act = daysWithActivity(), td = dayKey();
  const hist = load().history.filter(h => { const d = new Date(h.ts); return d.getFullYear() === y && d.getMonth() === mo; });
  const cells = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(x => `<div class="h">${x}</div>`).join('') + '<div class="d blank"></div>'.repeat(first) + [...Array(dim)].map((_, i) => { const k = dayKey(new Date(y, mo, i + 1)); return `<div class="d ${act.has(k) ? 'on' : ''} ${k === td ? 'today' : ''}">${i + 1}</div>`; }).join('');
  return `<div class="screen">${topback('History')}<div class="content"><div class="card rcard"><div class="row spread"><button class="icon-btn" style="color:var(--ink)" data-act="hmonth" data-d="-1">‹</button><b>${m.toLocaleString([], { month: 'short', year: 'numeric' })}</b><button class="icon-btn" style="color:var(--ink)" data-act="hmonth" data-d="1">›</button></div><div class="cal">${cells}</div></div>
  <div class="glabel" style="color:#fff">${m.toLocaleString([], { month: 'long' }).toUpperCase()}</div><div class="card rcard" style="padding:4px 16px">${hist.length ? hist.map(h => `<div class="entry"><div class="tile">🏅</div><div style="flex:1"><b>${esc(h.name)}</b><small>${mmss(h.secs)} · ${h.kcal} Kcal</small></div><small>${new Date(h.ts).toLocaleDateString([], { month: 'short', day: 'numeric' })}</small></div>`).join('') : '<div class="empty">No workouts this month.</div>'}</div></div></div>`;
};

// ---------- Mine ----------
const row = (c, t, sub, act, extra = '') => `<button class="mrow ${extra}" data-act="${act}"><span class="ic" style="background:${c}"></span><span class="t">${t}${sub ? `<small>${sub}</small>` : ''}</span>${I.chev}</button>`;
function mineTab() {
  const s = S(), vs = listVoices(), vname = (vs.find(v => v.uri === s.voiceURI) || {}).name || 'Default';
  return `<div class="screen">${topbar('Mine')}<div class="content"><div class="glabel" style="margin-top:4px">WORKOUT</div><div class="group">
  ${row('#35C487', 'Sound options', '', 'sounddlg')}${row('#4F8EF7', 'Coach voice', esc(vname), 'coach')}${row('#9B6BF2', 'Training rest', s.restMode === 'custom' ? s.restSecs + ' s' : 'Default', 'restdlg')}</div>
  <div class="glabel">SETTINGS</div><div class="group">${row('#2DB5C8', 'Metric &amp; imperial units', 'Weight: ' + s.wUnit + ' · Height: ' + s.hUnit, 'unitsdlg')}${row('#EAECF3', 'Restart progress', '', 'restartdlg', 'red')}${row('#EAECF3', 'Delete all data', '', 'wipedlg', 'red')}</div>
  <div class="glabel">SUPPORT</div><div class="group">${row('#7283FF', 'Common questions', '', 'faq')}</div>
  <div class="ver">Demi Plank · all data stays on this phone</div></div>${tabBar('mine')}</div>`;
}
acts.sounddlg = () => openDialog({ kind: 'sound' });
acts.toggleopt = el => { const s = load(); s.settings[el.dataset.k] = !s.settings[el.dataset.k]; save(); render(); };
acts.restdlg = () => openDialog({ kind: 'rest', mode: S().restMode, secs: S().restSecs });
acts.unitsdlg = () => openDialog({ kind: 'units' });
acts.restartdlg = () => openDialog({ kind: 'confirm', title: 'Restart progress?', text: 'Your levels, days and history go back to the start. Your weight and settings stay.', act: 'restartgo', label: 'RESTART' });
acts.wipedlg = () => openDialog({ kind: 'confirm', title: 'Delete all data?', text: 'Everything is erased from this phone: progress, history, weight, settings. This cannot be undone.', act: 'wipego', label: 'DELETE' });
acts.restartgo = () => { resetProgress(); ui.sel = {}; closeDialog(); toast('Progress restarted'); };
acts.wipego = () => { wipeAll(); ui.sel = {}; closeDialog(); toast('All data deleted'); };
acts.coach = () => go('coach');
views.coach = () => { const vs = listVoices(), cur = S().voiceURI;
  return `<div class="screen">${topback('Coach voice')}<div class="content"><p style="color:#C9D0E4;margin:6px 0 14px">Tap to listen and choose your favourite voice. These are the voices already on your iPhone, so they work offline.</p><div class="group">
  <button class="mrow" data-act="setvoice" data-u=""><span class="t">Default</span><span class="radio ${!cur ? 'on' : ''}"></span></button>
  ${vs.map(v => `<button class="mrow" data-act="setvoice" data-u="${esc(v.uri)}"><span class="t">${esc(v.name)}<small>${esc(v.lang)}${v.local ? '' : ' · needs internet'}</small></span><span class="radio ${cur === v.uri ? 'on' : ''}"></span></button>`).join('')}</div>
  ${vs.length ? '' : '<p class="empty" style="color:#9AA6C0">No English voices found on this device. The default voice will be used.</p>'}
  <p style="color:#9AA6C0;font-size:13px;margin-top:14px">Want a better voice? On iPhone: Settings → Accessibility → Spoken Content → Voices, download one, then come back here.</p></div></div>`; };
acts.setvoice = el => { const s = load(); s.settings.voiceURI = el.dataset.u; save(); render(); say('Hello Joe. Let us get planking.', 'guide', true); };
const FAQ = [
  ['How often should I exercise?', 'Beginners: once a day, two or three times a week to start. Experienced: once a day or more. Rest days are part of the plan; muscles grow while you rest.'],
  ['Can I exercise after a meal?', 'Wait about an hour after a big meal. A light snack is fine.'],
  ["I can't see the results", 'Keep going for four to six weeks. Pair planks with sleep and steady eating. Log your weight in Reports to see the trend.'],
  ['It’s too easy for me', 'Switch to a harder level in the Plan tab, or use Edit to lengthen the holds.'],
  ['It’s too hard for me', 'Drop one level, or use Edit to shorten a hold. A shorter hold with good form beats a long one that sags.'],
  ['I finished all the levels. What now?', 'Master cycles never end. Each cycle is a little tougher, and sessions stay under 40 minutes at the normal rest, because past that more time adds risk, not strength.'],
  ['Where is my data?', 'Only on this phone. There are no accounts and no ads. If you delete the app from your home screen, the data goes with it.'],
  ['Stop if it hurts', 'If you feel sharp pain, or you are injured or ill, stop and ask a doctor. Planks should feel like effort, not pain.'],
];
acts.faq = () => go('faq');
views.faq = () => `<div class="screen">${topback('Common questions')}<div class="content"><div class="card" style="padding:4px 16px">${FAQ.map((f, i) => `<button class="faq" data-act="faqopen" data-i="${i}"><b>${esc(f[0])}<span>${ui.faqOpen === i ? '−' : '+'}</span></b>${ui.faqOpen === i ? `<p>${esc(f[1])}</p>` : ''}</button>`).join('')}</div></div></div>`;
acts.faqopen = el => { const i = Number(el.dataset.i); ui.faqOpen = ui.faqOpen === i ? -1 : i; render(); };

// ---------- dialogs ----------
const opt = (act, label, on, data = '') => `<button class="opt" data-act="${act}" ${data}>${label}<span class="radio ${on ? 'on' : ''}"></span></button>`;
export function dialogHtml() {
  const d = ui.dialog; if (!d) return '';
  const s = S();
  const wrap = h => `<div class="dim" data-act="dimclose">${h}</div>`;
  if (d.kind === 'chalquit') return wrap(`<div class="dialog" data-stop style="text-align:center"><h3>You've gotten this far, just keep going!</h3><div style="margin:24px 0 8px"><button class="pill" data-act="chalcontinue">CONTINUE</button></div><button class="pill quiet" style="color:var(--bad);font-weight:800" data-act="chalend">QUIT</button></div>`);
  if (d.kind === 'sound') return wrap(`<div class="dialog" data-stop><h3>Sound options</h3>${[['mute', 'Mute'], ['voice', 'Voice guide'], ['tips', 'Coach tips']].map(([k, l]) => `<div class="opt">${l}<button class="toggle ${s[k] ? 'on' : ''}" data-act="toggleopt" data-k="${k}" aria-label="${l}"></button></div>`).join('')}<div class="btns"><button data-act="dlgclose">OK</button></div></div>`);
  if (d.kind === 'rest') return wrap(`<div class="dialog" data-stop><h3>Training rest</h3>${opt('restmode', 'Default <small style="color:var(--grey);font-weight:500">· 20 seconds between moves</small>', d.mode === 'default', 'data-m="default"')}${opt('restmode', 'Set duration on my own', d.mode === 'custom', 'data-m="custom"')}
    ${d.mode === 'custom' ? `<div class="stepper" style="justify-content:center;margin:8px 0"><button data-act="restdn">−</button><b class="cond" style="font-size:30px;min-width:90px;text-align:center">${d.secs} s</b><button data-act="restup">+</button></div>` : ''}<div class="btns"><button data-act="dlgclose">CANCEL</button><button data-act="restsave">SAVE</button></div></div>`);
  if (d.kind === 'units') return wrap(`<div class="dialog" data-stop><h3>Units</h3><div class="opt">Weight<span class="seg"><button class="${s.wUnit === 'lb' ? 'on' : ''}" data-act="unit" data-k="wUnit" data-v="lb">lb</button><button class="${s.wUnit === 'kg' ? 'on' : ''}" data-act="unit" data-k="wUnit" data-v="kg">kg</button></span></div>
    <div class="opt">Height<span class="seg"><button class="${s.hUnit === 'in' ? 'on' : ''}" data-act="unit" data-k="hUnit" data-v="in">in</button><button class="${s.hUnit === 'cm' ? 'on' : ''}" data-act="unit" data-k="hUnit" data-v="cm">cm</button></span></div><div class="btns"><button data-act="dlgclose">OK</button></div></div>`);
  if (d.kind === 'confirm') return wrap(`<div class="dialog" data-stop><h3>${esc(d.title)}</h3><p style="margin:10px 0;color:#4A5272;line-height:1.45">${esc(d.text)}</p><div class="btns"><button data-act="dlgclose">CANCEL</button><button class="bad" data-act="${d.act}">${d.label}</button></div></div>`);
  if (d.kind === 'weight') return wrap(`<div class="dialog" data-stop><h3>Today’s weight</h3><div class="row" style="margin:14px 0"><input class="field" id="wval" inputmode="decimal" value="${esc(d.val)}" placeholder="0.0" aria-label="Weight"><span class="seg"><button class="${d.unit === 'lb' ? 'on' : ''}" data-act="wunit" data-v="lb">LB</button><button class="${d.unit === 'kg' ? 'on' : ''}" data-act="wunit" data-v="kg">KG</button></span></div><div class="btns"><button data-act="dlgclose">CANCEL</button><button data-act="weightsave">SAVE</button></div></div>`);
  if (d.kind === 'height') return wrap(`<div class="dialog" data-stop><h3>Your height</h3><div class="row" style="margin:14px 0">${d.unit === 'cm' ? `<input class="field" id="hcm" inputmode="decimal" value="${esc(d.cm)}" placeholder="cm" aria-label="Height in centimetres">` : `<input class="field" id="hft" inputmode="numeric" value="${esc(d.ft)}" placeholder="ft" aria-label="Feet"><input class="field" id="hin" inputmode="decimal" value="${esc(d.inch)}" placeholder="in" aria-label="Inches">`}</div><div class="btns"><button data-act="dlgclose">CANCEL</button><button data-act="heightsave">SAVE</button></div></div>`);
  if (d.kind === 'sheet') return `<div class="dim bottom" data-act="dimclose"><div class="sheet" data-stop><div class="grab"></div><div class="stage">${fig(d.id, 300)}</div><h2 class="cond" style="font-size:30px;margin-top:14px;text-transform:uppercase">${esc(moveName(d.id))}</h2>
    <div class="row spread" style="margin-top:10px"><b>Duration</b>${d.editIdx !== undefined ? `<div class="stepper"><button data-act="secdn">−</button><b class="cond" style="font-size:24px">${mmss(d.secs)}</b><button data-act="secup">+</button></div>` : `<b class="cond" style="font-size:24px">${d.secs ? mmss(d.secs) : 'Max hold'}</b>`}</div>
    <p style="margin-top:12px;font-size:15px;line-height:1.45;color:var(--grey)">${esc(moveDesc(d.id))}</p><div class="btns" style="margin-top:16px;display:flex;justify-content:flex-end;gap:8px"><button style="padding:14px 24px;font-weight:800;color:var(--grey);border:2px solid #D5D9E3;border-radius:999px" data-act="dlgclose">${d.editIdx !== undefined ? 'CANCEL' : 'CLOSE'}</button>${d.editIdx !== undefined ? `<button class="pill" style="width:140px;height:56px" data-act="sheetsave">SAVE</button>` : ''}</div></div></div>`;
  return '';
}
acts.dimclose = (el, ev) => { if (ev.target === el) acts.dlgclose(); };
acts.dlgclose = () => { const d = ui.dialog; closeDialog(); if (d && d.resume && ui.player && ui.player.paused) ui.player.togglePause(); };
acts.restmode = el => { ui.dialog.mode = el.dataset.m; render(); };
acts.restdn = () => { ui.dialog.secs = Math.max(5, ui.dialog.secs - 5); render(); };
acts.restup = () => { ui.dialog.secs = Math.min(120, ui.dialog.secs + 5); render(); };
acts.restsave = () => { const s = load(); s.settings.restMode = ui.dialog.mode; s.settings.restSecs = ui.dialog.secs; save(); closeDialog(); };
acts.unit = el => { const s = load(); s.settings[el.dataset.k] = el.dataset.v; save(); render(); };
acts.wunit = el => { const d = ui.dialog, n = parseFloat(document.getElementById('wval')?.value); if (!isNaN(n) && n > 0) d.val = (d.unit === 'kg' ? (el.dataset.v === 'lb' ? kgToLb(n) : n) : (el.dataset.v === 'kg' ? lbToKg(n) : n)).toFixed(1); d.unit = el.dataset.v; render(); };
acts.weightsave = () => { const d = ui.dialog, n = parseFloat(document.getElementById('wval')?.value); if (!(n > 20 && n < 700)) return toast('Enter a real weight'); const kg = d.unit === 'kg' ? n : lbToKg(n), s = load(), k = dayKey(); s.weights = s.weights.filter(x => x.date !== k); s.weights.push({ date: k, kg }); s.weights.sort((a, b) => a.date < b.date ? -1 : 1); s.settings.wUnit = d.unit; save(); closeDialog(); };
acts.heightsave = () => { const d = ui.dialog; let cm; if (d.unit === 'cm') cm = parseFloat(document.getElementById('hcm')?.value); else cm = ((parseFloat(document.getElementById('hft')?.value) || 0) * 12 + (parseFloat(document.getElementById('hin')?.value) || 0)) * 2.54; if (!(cm > 80 && cm < 260)) return toast('Enter a real height'); const s = load(); s.heightCm = cm; save(); closeDialog(); };

export function tabHtml() {
  return { challenge: challengeTab, library: libraryTab, plan: planTab, reports: reportsTab, mine: mineTab }[ui.tab]();
}
