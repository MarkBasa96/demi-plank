// All data lives on the phone (localStorage). Every read/write is wrapped: private windows can throw.
const KEY = 'demi-plank:v1';
const DEFAULTS = () => ({
  v: 1,
  settings: { mute: false, voice: true, tips: true, voiceURI: '', restMode: 'default', restSecs: 20, wUnit: 'lb', hUnit: 'in', warm: true, weighted: false },
  levelIndex: 0,
  progress: {},          // { [levelIndex]: { done: { [day]: ts }, current: 1 } }
  history: [],           // { ts, kind: 'workout'|'challenge', name, secs, kcal, moves, level, day }
  best: null,            // { secs, ts }
  weights: [],           // { date: 'YYYY-MM-DD', kg }
  heightCm: null,
  edits: {},             // { 'level-day': [[id, secs], ...] }
  custom: [],            // My Training: [[id, secs], ...]
  ratings: {},           // { moveId: 1 | -1 }
});
let state = null;
export function load() {
  if (state) return state;
  let raw = null;
  try { raw = localStorage.getItem(KEY); state = raw ? sanitize(merge(DEFAULTS(), JSON.parse(raw))) : DEFAULTS(); }
  catch { state = DEFAULTS(); if (raw) { try { localStorage.setItem(KEY + ':corrupt', raw); } catch { /* nothing more to do */ } } }
  return state;
}
// A tampered or damaged save must never crash a screen or become markup: force every field to the right shape.
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const num = (v, d, lo = -Infinity, hi = Infinity) => (typeof v === 'number' && isFinite(v) && v >= lo && v <= hi ? v : d);
const pair = x => Array.isArray(x) && typeof x[0] === 'string' && /^[a-z0-9-]+$/.test(x[0]) && typeof x[1] === 'number' && isFinite(x[1]) && x[1] >= 0 && x[1] <= 3600;
function sanitize(o) {
  const d = DEFAULTS(), s = o.settings;
  for (const k of ['mute', 'voice', 'tips', 'warm', 'weighted']) s[k] = typeof s[k] === 'boolean' ? s[k] : d.settings[k];
  s.voiceURI = typeof s.voiceURI === 'string' ? s.voiceURI.slice(0, 300) : '';
  s.restMode = s.restMode === 'custom' ? 'custom' : 'default';
  s.restSecs = num(s.restSecs, 20, 5, 120);
  s.wUnit = s.wUnit === 'kg' ? 'kg' : 'lb'; s.hUnit = s.hUnit === 'cm' ? 'cm' : 'in';
  o.levelIndex = Number.isInteger(o.levelIndex) && o.levelIndex >= 0 && o.levelIndex <= 500 ? o.levelIndex : 0;
  if (!isObj(o.progress)) o.progress = {};
  for (const k of Object.keys(o.progress)) { const p = o.progress[k]; if (!isObj(p) || !isObj(p.done)) delete o.progress[k]; else p.current = Number.isInteger(p.current) && p.current >= 1 && p.current <= 100 ? p.current : 1; }
  o.history = (Array.isArray(o.history) ? o.history : []).filter(h => isObj(h) && typeof h.name === 'string' && Number.isFinite(h.ts) && Number.isFinite(h.secs)).slice(0, 5000)
    .map(h => ({ ...h, name: h.name.slice(0, 80), kcal: num(h.kcal, 0), moves: num(h.moves, 0), secs: num(h.secs, 0) }));
  o.best = isObj(o.best) && Number.isFinite(o.best.secs) && Number.isFinite(o.best.ts) ? { secs: o.best.secs, ts: o.best.ts } : null;
  o.weights = (Array.isArray(o.weights) ? o.weights : []).filter(w => isObj(w) && typeof w.date === 'string' && /^\d{4}-\d\d-\d\d$/.test(w.date) && num(w.kg, 0, 20, 700) > 0);
  o.heightCm = num(o.heightCm, null, 80, 260);
  if (!isObj(o.edits)) o.edits = {};
  for (const k of Object.keys(o.edits)) if (!/^\d+-\d+$/.test(k) || !Array.isArray(o.edits[k]) || !o.edits[k].every(pair)) delete o.edits[k];
  o.custom = (Array.isArray(o.custom) ? o.custom : []).filter(pair);
  if (!isObj(o.ratings)) o.ratings = {};
  for (const k of Object.keys(o.ratings)) if (o.ratings[k] !== 1 && o.ratings[k] !== -1) delete o.ratings[k];
  return o;
}
function merge(base, saved) {
  const o = { ...base, ...saved };
  o.settings = { ...base.settings, ...(saved.settings || {}) };
  return o;
}
let timer = 0;
export function save() {
  clearTimeout(timer);
  timer = setTimeout(flush, 50);
}
export function flush() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage blocked: app still works this session */ }
}
export function resetProgress() { const s = load(); s.progress = {}; s.levelIndex = 0; s.history = []; s.best = null; s.edits = {}; flush(); }
export function wipeAll() { state = DEFAULTS(); flush(); }

export const progressOf = (lv) => { const s = load(); return (s.progress[lv] ||= { done: {}, current: 1 }); };
export function markDone(level, day) {
  const p = progressOf(level); p.done[day] = Date.now();
  p.current = Math.max(p.current, day + 1); save();
}
export function addHistory(entry) { const s = load(); s.history.unshift({ ts: Date.now(), ...entry }); save(); }
export const dayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const kgToLb = kg => kg * 2.20462;
export const lbToKg = lb => lb / 2.20462;
