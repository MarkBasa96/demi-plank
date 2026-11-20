// Reads the project spec (plan-data.md) and writes js/data/original-plans.js and js/data/library.js.
// Run: node tools/build-data.mjs   (validates every day's move count against the spec's "Workouts" column)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SPEC = 'PATH-TO-VAULT/03-projects/plank-workout/02-process/plan-data.md';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'js', 'data');
const md = fs.readFileSync(SPEC, 'utf8').split(/\r?\n/);

const slug = s => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const secs = t => { const [m, s] = t.split(':').map(Number); return m * 60 + s; };

// abbreviation -> list of full names (pairs expand to two consecutive moves)
const AB = {
  SAP: ['Straight-arm plank'], P: ['Plank'], KP: ['Knee plank'], SAKP: ['Straight arm knee plank'], REV: ['Reverse plank'],
  WAP: ['Wide arm plank'], PUH: ['Push up hold'], MPU: ['Modified push-up low hold'],
  'KSP L/R': ['Kneeling side plank left', 'Kneeling side plank right'],
  'SP L/R': ['Side plank left', 'Side plank right'],
  'LRP L/R': ['Leg raised plank left', 'Leg raised plank right'],
  'LUSP L/R': ['Leg up side plank left', 'Leg up side plank right'],
  'REACH L/R': ['Plank and reach left', 'Plank and reach right'],
  'SLLP/SRLP': ['Single left leg plank', 'Single right leg plank'],
  'PLAL/PLAR': ['Plank with left arm lift', 'Plank with right arm lift'],
  'LSPAR/RSPAR': ['Left side plank with arm raised', 'Right side plank with arm raised'],
  REVLR: ['Reverse plank with left leg raised', 'Reverse plank with right leg raised'],
  SPLR: ['Side plank with left leg raised', 'Side plank with right leg raised'],
  DPH: ['Diagonal plank hold left', 'Diagonal plank hold right'],
  Cobra: ['Cobra stretch'], 'Cobra stretch': ['Cobra stretch'],
};
const TRIO = [['Cobra stretch', 30], ['Standing biceps stretch left', 30], ['Standing biceps stretch right', 30]];

function section(startRe) {
  const i = md.findIndex(l => startRe.test(l));
  if (i < 0) throw new Error('missing section ' + startRe);
  let j = i + 1; while (j < md.length && !/^(## |---)/.test(md[j])) j++;
  return md.slice(i, j);
}
function parseLevel(id, name, headRe, expectedDays, rest) {
  const lines = section(headRe).filter(l => /^\|\s*\d+\s*\|/.test(l));
  const days = [];
  for (const l of lines) {
    const c = l.split('|').map(s => s.trim());
    const day = Number(c[1]);
    if (/REST DAY/.test(l)) { days.push({ day, rest: true, main: [] }); continue; }
    const stated = Number(c[3]);
    const main = [];
    for (const tok of c[4].split(' / ')) {
      const t = tok.trim();
      if (t.startsWith('+')) { for (const [n, s] of TRIO) main.push([n, s]); continue; }
      const m = t.match(/^(.+?)\s+(\d+:\d\d)$/);
      if (!m) throw new Error(`${name} day ${day}: cannot parse "${t}"`);
      const names = AB[m[1]] || [m[1]];
      for (const n of names) main.push([n, secs(m[2])]);
    }
    const count = 6 + main.length + 6;
    if (count !== stated) console.warn(`WARN ${name} day ${day}: computed ${count} moves, spec says ${stated}`);
    days.push({ day, rest: false, main });
  }
  if (days.length !== expectedDays) throw new Error(`${name}: ${days.length} days, expected ${expectedDays}`);
  for (const r of rest) if (!days.find(d => d.day === r)?.rest) throw new Error(`${name}: day ${r} should be rest`);
  return { id, name, days };
}
const REST = [6, 13, 19, 26];
const levels = [
  parseLevel('beginner', 'Beginner', /^## Beginner/, 30, REST),
  parseLevel('intermediate', 'Intermediate', /^## Intermediate/, 28, REST),
  parseLevel('advanced', 'Advanced', /^## Advanced/, 28, REST),
];

// move names -> catalogue entries with ids
const names = new Set();
for (const lv of levels) for (const d of lv.days) for (const [n] of d.main) names.add(n);

// descriptions for the 33 Add-list moves
const desc = {};
for (const l of section(/^## Exercise library for/)) {
  const c = l.split('|').map(s => s.trim());
  if (/^\d+$/.test(c[1] || '')) desc[c[2]] = c[4];
}

const out = {
  levels: levels.map(lv => ({
    id: lv.id, name: lv.name,
    days: lv.days.map(d => d.rest ? { day: d.day, rest: true } : { day: d.day, main: d.main.map(([n, s]) => [slug(n), s]) }),
  })),
  moveNames: Object.fromEntries([...names].map(n => [slug(n), n])),
  moveDesc: Object.fromEntries(Object.entries(desc).map(([n, d]) => [slug(n), d])),
};

// library workouts (own parsing: "Name mm:ss" separated by " / ", "x2" = two entries, "left 0:30 / right" handled by the spec's wording)
function parseList(text) {
  const items = [];
  for (let tok of text.split(' / ')) {
    tok = tok.trim().replace(/\.$/, '');
    const x2 = /\sx2$/.test(tok); tok = tok.replace(/\sx2$/, '');
    let m = tok.match(/^(.+?)\s+(\d+:\d\d)$/);
    if (!m) { // "right 0:20" style: reuse previous name with left->right
      const m2 = tok.match(/^(left|right)\s+(\d+:\d\d)$/);
      if (m2 && items.length) {
        const prev = items[items.length - 1].name;
        const nm = prev.replace(/\bleft\b/, m2[1]);
        items.push({ name: nm === prev ? prev + ' ' + m2[1] : nm, secs: secs(m2[2]) }); continue;
      }
      console.warn('LIB skip: ' + tok); continue;
    }
    items.push({ name: m[1], secs: secs(m[2]) });
    if (x2) items.push({ name: m[1], secs: secs(m[2]) });
  }
  return items.map(i => [slug(i.name), i.secs, i.name]);
}
const grab = re => { const i = md.findIndex(l => re.test(l)); let j = i + 1; while (j < md.length && !md[j].trim()) j++; return md[j]; };
const lib = [
  ['morning-warmup', 'Morning Warmup', 'ROUTINE', 'Wake up with energy and prime your body.', 'stretch', grab(/^### Morning Warmup/)],
  ['sleepy-time-stretching', 'Sleepy Time Stretching', 'ROUTINE', 'Relax yourself and get a high-quality sleep.', 'stretch', grab(/^### Sleepy Time/)],
  ['knee-pain-relief', 'Knee Pain Relief', 'PAIN RELIEF', 'Relieve pain and strengthen weak knees.', 'stretch', grab(/^### Knee Pain/).replace(/Quarter wall squat \(time unclear, OCR read "01"\)/, 'Quarter wall squat 0:30').replace(/Quarter wall squat \(again, same unclear time\)/, 'Quarter wall squat 0:30').replace(/Cross leg side bend left 0:30 \/ right 0:30/, 'Cross leg side bend left 0:30 / Cross leg side bend right 0:30')],
  ['back-stretching', 'Back Stretching 7 Min', 'PAIN RELIEF', 'Relax back muscles and prevent back injuries.', 'stretch', grab(/^### Back Stretching/)],
].map(([id, name, group, blurb, pose, text]) => ({ id, name, group, blurb, pose, moves: parseList(text) }));
const hiit = [];
for (const lvl of ['Beginner', 'Intermediate', 'Advanced']) {
  const l = md.find(x => x.startsWith(`**${lvl} -`));
  const text = l.replace(/^\*\*[^:]*:\*\*\s*/, '');
  hiit.push({ id: 'hiit-' + lvl.toLowerCase(), name: lvl, moves: parseList(text) });
}
lib.push({ id: 'belly-fat-burner-hiit', name: 'Belly Fat Burner HIIT', group: 'HIIT', blurb: 'High intensity interval training, no equipment.', pose: 'side', levels: hiit });
for (const w of lib) for (const m of (w.moves || w.levels.flatMap(l => l.moves))) out.moveNames[m[0]] ||= m[2];

fs.writeFileSync(path.join(OUT, 'original-plans.js'), '// GENERATED by tools/build-data.mjs from the project spec. Do not edit by hand.\nexport const ORIGINAL = ' + JSON.stringify(out) + ';\n');
const libSlim = lib.map(w => w.levels ? { ...w, levels: w.levels.map(l => ({ ...l, moves: l.moves.map(m => [m[0], m[1]]) })) } : { ...w, moves: w.moves.map(m => [m[0], m[1]]) });
fs.writeFileSync(path.join(OUT, 'library.js'), '// GENERATED by tools/build-data.mjs. Do not edit by hand.\nexport const LIBRARY = ' + JSON.stringify(libSlim) + ';\n');
console.log('levels', levels.map(l => `${l.name}:${l.days.length}d`).join(' '), '| moves', Object.keys(out.moveNames).length, '| library', lib.map(w => w.name + ':' + (w.moves ? w.moves.length : w.levels.map(l => l.moves.length).join('/'))).join(', '));
