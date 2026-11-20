// Plan engine: levels 1-3 are the original data; Expert, Master and endless Master cycles are generated (see plan-engine.md).
import { ORIGINAL } from './data/original-plans.js';
import { moveName } from './data/moves.js';

export const REST_DAYS = [6, 13, 19, 26];
export const SESSION_CAP = 40 * 60;
export const CAPS = { big: 240, side: 90, rkc: 45 };

export const WARM = [['head-tilt', 20], ['wrists-and-ankles-stretch-left', 20], ['wrists-and-ankles-stretch-right', 20], ['bent-arm-circles', 30], ['dynamic-chest', 30], ['knee-to-elbow-crunches', 30]];
export const COOL = [['cobra-stretch', 20], ['cat-cow-pose', 30], ['shoulder-stretch', 20], ['triceps-stretch-left', 20], ['triceps-stretch-right', 20], ['clasp-hands-behind-back', 20]];
const TRIO = [['cobra-stretch', 30], ['standing-biceps-stretch-left', 30], ['standing-biceps-stretch-right', 30]];

const round5 = s => Math.round(s / 5) * 5;
const round10 = s => Math.round(s / 10) * 10;
const lerp = (a, b, p) => a + (b - a) * p;

// item: { m: id | [idLeft, idRight], a: start secs, b: end secs, cap: 'big'|'side'|'rkc', rounds?: [start, end] }
const EXPERT = [
  [{ m: 'long-lever-plank', a: 60, b: 150, cap: 'big' }, { m: 'plank-shoulder-taps', a: 40, b: 70, cap: 'side' }, { m: ['side-plank-hip-dips-left', 'side-plank-hip-dips-right'], a: 30, b: 60, cap: 'side' }, { m: ['star-side-plank-left', 'star-side-plank-right'], a: 20, b: 60, cap: 'side' }, { m: 'plank', a: 100, b: 180, cap: 'big' }, { m: 'plank-up-downs', a: 30, b: 60, cap: 'side' }, { m: 'hollow-body-hold', a: 30, b: 70, cap: 'side' }],
  [{ m: 'straight-arm-plank', a: 100, b: 180, cap: 'big' }, { m: 'plank-up-downs', a: 30, b: 70, cap: 'side' }, { m: ['kneeling-copenhagen-side-plank-left', 'kneeling-copenhagen-side-plank-right'], a: 20, b: 50, cap: 'side' }, { m: 'hollow-body-hold', a: 30, b: 80, cap: 'side' }, { m: 'spiderman-plank', a: 30, b: 60, cap: 'side' }, { m: 'long-lever-plank', a: 60, b: 150, cap: 'big' }, { m: ['star-side-plank-left', 'star-side-plank-right'], a: 20, b: 50, cap: 'side' }],
  [{ m: 'long-lever-plank', a: 60, b: 150, cap: 'big' }, { m: ['star-side-plank-left', 'star-side-plank-right'], a: 20, b: 60, cap: 'side' }, { m: ['kneeling-copenhagen-side-plank-left', 'kneeling-copenhagen-side-plank-right'], a: 20, b: 50, cap: 'side' }, { m: 'plank-shoulder-taps', a: 40, b: 70, cap: 'side' }, { m: 'hollow-body-hold', a: 30, b: 80, cap: 'side' }, { m: 'straight-arm-plank', a: 120, b: 210, cap: 'big' }, { m: 'spiderman-plank', a: 30, b: 60, cap: 'side' }],
];
const MASTER = [
  [{ m: 'rkc-plank', a: 20, b: 45, cap: 'rkc', rounds: [3, 4] }, { m: ['single-arm-single-leg-plank-left', 'single-arm-single-leg-plank-right'], a: 30, b: 60, cap: 'side' }, { m: ['copenhagen-side-plank-left', 'copenhagen-side-plank-right'], a: 20, b: 50, cap: 'side' }, { m: 'body-saw', a: 40, b: 80, cap: 'side' }, { m: 'long-lever-plank', a: 100, b: 180, cap: 'big', hard: true }, { m: ['long-lever-single-leg-plank-left', 'long-lever-single-leg-plank-right'], a: 30, b: 60, cap: 'side' }, { m: 'plank-to-pike', a: 40, b: 60, cap: 'side' }],
  [{ m: 'plank-to-pike', a: 40, b: 60, cap: 'side' }, { m: ['long-lever-single-leg-plank-left', 'long-lever-single-leg-plank-right'], a: 30, b: 60, cap: 'side' }, { m: ['copenhagen-side-plank-left', 'copenhagen-side-plank-right'], a: 20, b: 50, cap: 'side' }, { m: 'rkc-plank', a: 20, b: 45, cap: 'rkc', rounds: [3, 4] }, { m: 'long-lever-plank', a: 100, b: 180, cap: 'big', hard: true }, { m: 'body-saw', a: 40, b: 80, cap: 'side' }, { m: ['copenhagen-side-plank-left', 'copenhagen-side-plank-right'], a: 20, b: 50, cap: 'side' }],
  [{ m: ['single-arm-single-leg-plank-left', 'single-arm-single-leg-plank-right'], a: 30, b: 60, cap: 'side' }, { m: 'body-saw', a: 40, b: 80, cap: 'side' }, { m: ['long-lever-single-leg-plank-left', 'long-lever-single-leg-plank-right'], a: 30, b: 60, cap: 'side' }, { m: 'plank-to-pike', a: 40, b: 60, cap: 'side' }, { m: 'long-lever-plank', a: 100, b: 180, cap: 'big', hard: true }, { m: 'rkc-plank', a: 20, b: 45, cap: 'rkc', rounds: [3, 4] }],
];
const SCALE = { expert: 1.55, master: 1.75 };
const BIG_VARIANTS = ['long-lever-plank', 'plank', 'straight-arm-plank', 'wide-arm-plank'];

function trainingIndex(day) { return day - REST_DAYS.filter(r => r < day).length - 1; } // 0..23 for a 28-day level
function buildDay(patterns, day, cycle, scale = 1) {
  const t = trainingIndex(day), p = Math.min(1, t / 23), pat = patterns[t % patterns.length];
  const mult = scale * (1 + 0.06 * (cycle - 1));
  let main = [], allCapped = true, hard = null;
  for (const it of pat) {
    const cap = CAPS[it.cap];
    let s = lerp(it.a, it.b, p) * mult;
    s = it.cap === 'rkc' ? round5(s) : round10(s);
    if (s < cap) allCapped = false; else s = cap;
    const rounds = it.rounds ? Math.round(lerp(it.rounds[0], it.rounds[1], p)) : 1;
    const ids = Array.isArray(it.m) ? it.m : [it.m];
    for (let r = 0; r < rounds; r++) for (const id of ids) main.push([id, s]);
    if (it.hard) hard = [it.m, s];
  }
  let extra = 0;
  if (cycle > 1 && allCapped && hard && sessionSeconds({ main: [...main, hard] }) <= SESSION_CAP) { main.push(hard); extra = 1; }
  // maxed: everything capped and no room for an extra round -> rotate variety inside the same family
  if (cycle > 1 && allCapped && !extra) {
    const alt = BIG_VARIANTS[(cycle + t) % BIG_VARIANTS.length];
    main = main.map(([id, s]) => id === 'long-lever-plank' ? [alt, s] : [id, s]);
  }
  while (sessionSeconds({ main }) > SESSION_CAP) { // hard guarantee: never over 40 minutes
    let i = main.findIndex(([id]) => /plank|hold/.test(id)); let big = 0;
    main.forEach(([, s], k) => { if (s > main[big][1]) big = k; });
    main[big] = [main[big][0], Math.max(10, main[big][1] - 10)]; if (i < 0) break;
  }
  main.push(...TRIO);
  return { day, main, test: cycle > 1 && day === 1 };
}

const ORIG = ORIGINAL.levels.map(l => ({ id: l.id, name: l.name, days: l.days }));
const GEN = {};
function generated(key, patterns, cycle, name, id) {
  if (!GEN[key]) {
    const days = [];
    for (let d = 1; d <= 28; d++) days.push(REST_DAYS.includes(d) ? { day: d, rest: true } : buildDay(patterns, d, cycle, SCALE[patterns === EXPERT ? 'expert' : 'master']));
    GEN[key] = { id, name, days };
  }
  return GEN[key];
}

export const FIXED_LEVELS = 5; // Beginner, Intermediate, Advanced, Expert, Master. Index 5+ = Master cycle 2, 3, ...
export function getLevel(index) {
  if (index < 3) return { ...ORIG[index], index };
  if (index === 3) return { ...generated('expert', EXPERT, 1, 'Expert', 'expert'), index };
  if (index === 4) return { ...generated('master1', MASTER, 1, 'Master', 'master'), index };
  const cycle = index - 3; // index 5 -> cycle 2
  return { ...generated('master' + cycle, MASTER, cycle, 'Master cycle ' + cycle, 'master-' + cycle), index };
}
export function levelBlurb(index) {
  return ['Avg 7 mins & begin with 3 mins', 'Avg 11 mins & begin with 5 mins', 'Avg 16 mins & begin with 9 mins', 'Harder moves, longer levers', 'The hardest holds. Then it keeps going.'][index] || 'Tougher each cycle, 40 min cap';
}

/** Full session for a day: warm, main, cool, each as {id, secs, section}. */
export function getSession(levelIndex, dayNum, opts = {}) {
  const lv = getLevel(levelIndex), d = lv.days.find(x => x.day === dayNum);
  if (!d || d.rest) return null;
  let main = d.main.map(([id, s]) => ({ id, secs: s, section: 'main' }));
  if (d.test) { // test day: max-hold plank in challenge mode (secs 0 = count up, you decide when to stop)
    const trio = main.slice(-3); main = [{ id: 'max-plank-test', secs: 0, section: 'main' }, ...trio];
  }
  if (opts.noWeighted) main = main.filter(m => m.id !== 'weighted-plank');
  const warm = opts.warm === false ? [] : WARM.map(([id, s]) => ({ id, secs: s, section: 'warm' }));
  const cool = COOL.map(([id, s]) => ({ id, secs: s, section: 'cool' }));
  return { level: lv, day: dayNum, test: !!d.test, items: [...warm, ...main, ...cool] };
}
export function sessionSeconds(day, restSecs = 20) {
  const main = day.main || [];
  return WARM.reduce((a, [, s]) => a + s, 0) + COOL.reduce((a, [, s]) => a + s, 0) + main.reduce((a, [, s]) => a + s, 0) + Math.max(0, main.length - 1) * restSecs;
}
export function dayMinutes(levelIndex, dayNum, restSecs = 20) {
  const d = getLevel(levelIndex).days.find(x => x.day === dayNum);
  return d && !d.rest ? Math.round(sessionSeconds(d, restSecs) / 60) : 0;
}
export function dayCount(levelIndex) { return getLevel(levelIndex).days.length; }
export function fmt(secs) { const m = Math.floor(secs / 60), s = secs % 60; return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); }
export { moveName };
