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
  try { const raw = localStorage.getItem(KEY); state = raw ? merge(DEFAULTS(), JSON.parse(raw)) : DEFAULTS(); }
  catch { state = DEFAULTS(); }
  return state;
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
