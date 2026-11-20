// Cuts the Flow frame sheets (vault: 03-outputs/pictures/sheets/frames) into extra picture frames:
//   pics/<id>-2.webp, pics/<id>-3.webp  (640x480 transparent, same canvas as pics/<id>.webp)
// Each cell is resized to the 640x480 canvas (no trim, no re-fit), so the figure keeps the position Flow gave it
// and lines up with frame 1. Right-hand moves are mirrors of the left ones. Then F2/F3 are compared with their
// neighbours and frames that look the same as the previous one are dropped (a flip-book of copies is useless).
// Usage: node tools/make-frames.mjs [--keep-dups]
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PICS = path.join(ROOT, 'pics');
const SHEETS = 'PATH-TO-VAULT/03-projects/plank-workout/03-outputs/pictures/sheets/frames/';
const KEEP_DUPS = process.argv.includes('--keep-dups');
const W = 640, H = 480;

// [file, cols, rows, frame number, ids row by row ('-' = empty cell)]
const SHEETLIST = [
  ['sheet-01-f2-3x2.png', 3, 2, 2, 'knee-plank,straight-arm-knee-plank,straight-arm-plank,wide-arm-plank,modified-push-up-low-hold,long-lever-plank'],
  ['sheet-02-f2-4x3.png', 4, 3, 2, 'kneeling-side-plank-left,left-side-plank-with-arm-raised,leg-up-side-plank-left,side-plank-with-left-leg-raised,star-side-plank-left,kneeling-copenhagen-side-plank-left,copenhagen-side-plank-left,long-lever-single-leg-plank-left,leg-raised-plank-left,single-left-leg-plank,plank-with-left-arm-lift,plank-and-reach-left'],
  ['sheet-03-f2-4x3.png', 4, 3, 2, 'diagonal-plank-hold-left,single-arm-single-leg-plank-left,rkc-plank,weighted-plank,cobra-stretch,reverse-plank,reverse-plank-with-left-leg-raised,standing-biceps-stretch-left,left-quad-stretch-with-wall,calf-stretch-left,triceps-stretch-left,child-s-pose'],
  ['sheet-04-f2-4x3.png', 4, 3, 2, 'lying-butterfly-stretch,lying-twist-stretch-left,cross-leg-side-bend-left,open-chain-knee-extension-left,straight-leg-raise-left,pilates-clamshell-left,sitting-hamstring-stretch-left,standing-side-bend,triangle-pose-left,chest-stretch,hollow-body-hold,quarter-wall-squat'],
  ['sheet-05-f2-4x3.png', 4, 3, 2, 'plank-shoulder-taps,side-plank-hip-dips-left,plank-up-downs,spiderman-plank,body-saw,plank-to-pike,plank-jacks,plank-hip-dips,mountain-climber,mountain-climber-squat-thrust,fast-spider-lunges,bird-dog'],
  ['sheet-05-f3-4x3.png', 4, 3, 3, 'plank-shoulder-taps,side-plank-hip-dips-left,plank-up-downs,spiderman-plank,body-saw,plank-to-pike,plank-jacks,plank-hip-dips,mountain-climber,mountain-climber-squat-thrust,fast-spider-lunges,bird-dog'],
  ['sheet-06-f2-4x3.png', 4, 3, 2, 'downward-facing-dog,cat-cow-pose,abdominal-crunches,sit-ups,sit-up-twist,reverse-crunches,reverse-crunches-with-leg-raised,leg-raises,flutter-kicks,v-crunch,v-hold,alt-v-up'],
  ['sheet-06-f3-4x3.png', 4, 3, 3, 'downward-facing-dog,cat-cow-pose,abdominal-crunches,sit-ups,sit-up-twist,reverse-crunches,reverse-crunches-with-leg-raised,leg-raises,flutter-kicks,v-crunch,v-hold,alt-v-up'],
  ['sheet-07-f2-4x3.png', 4, 3, 2, 'x-man-crunch,crunch-kicks,heels-to-the-heavens,heel-touch,reclined-oblique-twist,russian-twist,alternating-hooks,one-down-two-ups,knee-to-elbow-crunches,bridge,butt-bridge,bicycle-crunches'],
  ['sheet-07-f3-4x3.png', 4, 3, 3, 'x-man-crunch,crunch-kicks,heels-to-the-heavens,heel-touch,reclined-oblique-twist,russian-twist,alternating-hooks,one-down-two-ups,knee-to-elbow-crunches,bridge,butt-bridge,bicycle-crunches'],
  ['sheet-08-f2-4x3.png', 4, 3, 2, 'jumping-jacks,star-jumps,jumping-squats,modified-burpees,x-burpees,high-stepping,butt-kicks,punches,backward-lunge,dynamic-chest,torso-twist,-'],
  ['sheet-08-f3-4x3.png', 4, 3, 3, 'jumping-jacks,star-jumps,jumping-squats,modified-burpees,x-burpees,high-stepping,butt-kicks,punches,backward-lunge,dynamic-chest,torso-twist,-'],
];
// single-image samples (1x1): [file, id, frame]
const SINGLES = [['plank-f2.jpg', 'plank', 2], ['side-plank-left-f2.jpg', 'side-plank-left', 2]];

function whiteToAlpha(buf, w, h) { // same rule as make-pics.mjs
  const seen = new Uint8Array(w * h), stack = [];
  const near = i => buf[i * 4] >= 238 && buf[i * 4 + 1] >= 238 && buf[i * 4 + 2] >= 238;
  const push = (x, y) => { const i = y * w + x; if (!seen[i] && near(i)) { seen[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const i = stack.pop(), x = i % w, y = (i - x) / w;
    buf[i * 4 + 3] = 0;
    if (x > 0) push(x - 1, y); if (x < w - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < h - 1) push(x, y + 1);
  }
  for (let i = 0; i < w * h; i++) if (near(i)) buf[i * 4 + 3] = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x; if (buf[i * 4 + 3] === 0) continue;
    if (buf[(i - 1) * 4 + 3] === 0 || buf[(i + 1) * 4 + 3] === 0 || buf[(i - w) * 4 + 3] === 0 || buf[(i + w) * 4 + 3] === 0) {
      const lum = (buf[i * 4] + buf[i * 4 + 1] + buf[i * 4 + 2]) / 3; if (lum > 225) buf[i * 4 + 3] = Math.round(255 * (255 - lum) / 30);
    }
  }
}
function dropStrays(buf, w, h) { // keep only figure pieces (drop bits of a neighbouring cell)
  const lab = new Int32Array(w * h), areas = [0];
  for (let i0 = 0; i0 < w * h; i0++) {
    if (lab[i0] || buf[i0 * 4 + 3] === 0) continue;
    const id = areas.length, st = [i0]; lab[i0] = id; let area = 0;
    while (st.length) { const i = st.pop(); area++; const x = i % w, y = (i - x) / w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (j >= 0 && !lab[j] && buf[j * 4 + 3] !== 0) { lab[j] = id; st.push(j); } }
    areas.push(area);
  }
  const big = Math.max(...areas);
  for (let i = 0; i < w * h; i++) if (lab[i] && areas[lab[i]] < big * 0.03) buf[i * 4 + 3] = 0;
}
async function cell(file, cols, rows, k) {
  const meta = await sharp(file).metadata();
  const cw = Math.floor(meta.width / cols), ch = Math.floor(meta.height / rows), c = k % cols, r = Math.floor(k / cols);
  const { data } = await sharp(file).extract({ left: c * cw, top: r * ch, width: cw, height: ch }).resize(W, H, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  whiteToAlpha(data, W, H); dropStrays(data, W, H);
  return data;
}
const toWebp = (data) => sharp(data, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 88, alphaQuality: 100 });
async function load(file) { return (await sharp(file).ensureAlpha().raw().toBuffer()); }
function diff(a, b) { // share of figure pixels (either picture) that differ in opacity or colour
  let u = 0, d = 0;
  for (let i = 0; i < W * H; i++) {
    const aa = a[i * 4 + 3] > 128, bb = b[i * 4 + 3] > 128;
    if (!aa && !bb) continue; u++;
    if (aa !== bb) { d++; continue; }
    if (Math.abs(a[i * 4] - b[i * 4]) + Math.abs(a[i * 4 + 1] - b[i * 4 + 1]) + Math.abs(a[i * 4 + 2] - b[i * 4 + 2]) > 90) d++;
  }
  return d / u;
}
const mirrorOf = id => { const m = id.replace(/left/, 'right'); return m !== id && fs.existsSync(path.join(PICS, m + '.webp')) ? m : null; };

const staged = {}; // id -> {2: Buffer, 3: Buffer}
for (const [f, cols, rows, fr, list] of SHEETLIST) {
  const ids = list.split(',');
  for (let k = 0; k < ids.length; k++) {
    if (ids[k] === '-') continue;
    (staged[ids[k]] ||= {})[fr] = await cell(SHEETS + f, cols, rows, k);
  }
}
for (const [f, id, fr] of SINGLES) {
  const { data } = await sharp(SHEETS + f).resize(W, H, { fit: 'contain', background: '#fff' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  whiteToAlpha(data, W, H); (staged[id] ||= {})[fr] = data;
}
// Moves whose generated frames look the same as frame 1 on the contact sheet (checked by eye, 2026-11-20): stay single pictures
for (const id of ['plank-jacks', 'plank-up-downs', 'one-down-two-ups', 'alt-v-up']) {
  delete staged[id];
  for (const n of [2, 3]) fs.rmSync(path.join(PICS, `${id}-${n}.webp`), { force: true });
}
// frames that are copies of another move's frame
if (staged.plank) staged['max-plank-test'] = { 2: staged.plank[2] };

const report = []; let written = 0;
for (const id of Object.keys(staged).sort()) {
  const f1 = await load(path.join(PICS, id + '.webp'));
  let f2 = staged[id][2], f3 = staged[id][3], note = '';
  const d12 = f2 ? diff(f1, f2) : null;
  if (f2 && d12 < 0.04 && !KEEP_DUPS) { note += `F2 same as F1 (${(d12 * 100).toFixed(1)}%) dropped; `; f2 = null; }
  const prev = f2 || f1, d3 = f3 ? diff(prev, f3) : null;
  if (f3 && d3 < 0.04 && !KEEP_DUPS) { note += `F3 same as previous (${(d3 * 100).toFixed(1)}%) dropped; `; f3 = null; }
  if (!f2 && f3) { f2 = f3; f3 = null; note += 'F3 promoted to F2; '; }
  const outs = [id, ...(mirrorOf(id) ? [mirrorOf(id)] : [])];
  for (const [n, data] of [[2, f2], [3, f3]]) {
    if (!data) { for (const o of outs) for (const nn of [n]) fs.rmSync(path.join(PICS, `${o}-${nn}.webp`), { force: true }); continue; }
    await toWebp(data).toFile(path.join(PICS, `${id}-${n}.webp`)); written++;
    if (outs[1]) { await sharp(await toWebp(data).toBuffer()).flop().webp({ quality: 88, alphaQuality: 100 }).toFile(path.join(PICS, `${outs[1]}-${n}.webp`)); written++; }
  }
  report.push(`${id}: ${f2 ? 'F2' : '-'} ${f3 ? 'F3' : '-'}  d12=${d12 === null ? 'n/a' : (d12 * 100).toFixed(1) + '%'} d23=${d3 === null ? 'n/a' : (d3 * 100).toFixed(1) + '%'} ${note}`);
}
fs.writeFileSync(path.join(ROOT, 'tools', 'frames-report.txt'), report.join('\n') + '\n');
console.log(written, 'frame files written;', report.length, 'moves. See tools/frames-report.txt');

// Frame list for the app: js/data/frames.js  { id: 'order' }  (order = which frame shows at each 0.6 s step)
//  '21' = hold (getting in, then in position) | '1232' = moving move | '1213' = side-to-side move (neutral beat between sides)
const ALT = new Set('plank-shoulder-taps mountain-climber bird-dog flutter-kicks high-stepping butt-kicks punches russian-twist reclined-oblique-twist sit-up-twist alternating-hooks heel-touch knee-to-elbow-crunches torso-twist alt-v-up bicycle-crunches spiderman-plank plank-hip-dips fast-spider-lunges quick-feet'.split(' '));
const files = new Set(fs.readdirSync(PICS));
const list = {};
for (const f of [...files].sort()) {
  const m = f.match(/^(.+)-2\.webp$/); if (!m || !files.has(m[1] + '.webp')) continue;
  const id = m[1], has3 = files.has(id + '-3.webp');
  list[id] = has3 ? (ALT.has(id) ? '1213' : '1232') : '21';
}
fs.writeFileSync(path.join(ROOT, 'js', 'data', 'frames.js'),
  '// GENERATED by tools/make-frames.mjs. Moves that have extra picture frames: id -> loop order (see css .fl-*).\n' +
  'export const FRAMES = ' + JSON.stringify(list, null, 1).replace(/\n\s*/g, ' ').replace(/^\{ /, '{\n ').replace(/ \}$/, '\n}') + ';\n');
console.log(Object.keys(list).length, 'moves in js/data/frames.js');
