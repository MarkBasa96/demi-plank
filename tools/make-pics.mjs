// Turns a generated picture sheet into app pictures: crops each cell, makes the white background transparent,
// fits it on a 640x480 (4:3) canvas and writes pics/<id>.webp.
// Usage: node tools/make-pics.mjs <sheet.png> <cols>x<rows> <id[>mirrorId] | -> ...   (row by row; "-" skips a cell)
//   e.g. node tools/make-pics.mjs grid.png 2x2 plank,knee-plank,side-plank-left>side-plank-right,-
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'pics');
const [, , file, dims, list] = process.argv;
const [cols, rows] = dims.split('x').map(Number), ids = list.split(',');
fs.mkdirSync(OUT, { recursive: true });
const meta = await sharp(file).metadata();
const cw = Math.floor(meta.width / cols), ch = Math.floor(meta.height / rows);
const W = 640, H = 480, FIT_W = 580, FIT_H = 400;

function whiteToAlpha(buf, w, h) { // flood fill from the border through near-white pixels
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
  // white pockets enclosed by the figure (under the torso, between limbs) are background too
  for (let i = 0; i < w * h; i++) if (near(i)) buf[i * 4 + 3] = 0;
  // soften the 1px fringe next to removed background so no white halo shows on tinted tiles
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x; if (buf[i * 4 + 3] === 0) continue;
    if (buf[(i - 1) * 4 + 3] === 0 || buf[(i + 1) * 4 + 3] === 0 || buf[(i - w) * 4 + 3] === 0 || buf[(i + w) * 4 + 3] === 0) {
      const lum = (buf[i * 4] + buf[i * 4 + 1] + buf[i * 4 + 2]) / 3; if (lum > 225) buf[i * 4 + 3] = Math.round(255 * (255 - lum) / 30);
    }
  }
}
// Label connected pieces on the whole sheet, then give each cell the pieces whose centre lies in it.
// (Cutting at fixed cell borders clips figures that reach across a border and picks up bits of neighbours.)
const full = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const FW = full.info.width, FH = full.info.height, buf = full.data;
whiteToAlpha(buf, FW, FH);
const lab = new Int32Array(FW * FH), comps = [];
for (let i0 = 0; i0 < FW * FH; i0++) {
  if (lab[i0] || buf[i0 * 4 + 3] === 0) continue;
  const id = comps.length + 1, st = [i0]; lab[i0] = id; let area = 0, sx = 0, sy = 0;
  while (st.length) { const i = st.pop(); area++; const x = i % FW, y = (i - x) / FW; sx += x; sy += y;
    for (const j of [x > 0 ? i - 1 : -1, x < FW - 1 ? i + 1 : -1, y > 0 ? i - FW : -1, y < FH - 1 ? i + FW : -1]) if (j >= 0 && !lab[j] && buf[j * 4 + 3] !== 0) { lab[j] = id; st.push(j); } }
  comps.push({ id, area, cx: sx / area, cy: sy / area });
}
let n = 0;
for (let k = 0; k < ids.length; k++) {
  if (ids[k] === '-') continue;
  const [id, mirror] = ids[k].split('>'), c0 = k % cols, r0 = Math.floor(k / cols);
  const mine = comps.filter(c => Math.floor(c.cx / cw) === c0 && Math.floor(c.cy / ch) === r0);
  if (!mine.length) { console.warn('no figure found for', id); continue; }
  const big = Math.max(...mine.map(c => c.area)), keep = new Set(mine.filter(c => c.area >= big * 0.03).map(c => c.id));
  const out = Buffer.alloc(FW * FH * 4);
  for (let i = 0; i < FW * FH; i++) if (keep.has(lab[i])) { out[i * 4] = buf[i * 4]; out[i * 4 + 1] = buf[i * 4 + 1]; out[i * 4 + 2] = buf[i * 4 + 2]; out[i * 4 + 3] = buf[i * 4 + 3]; }
  const trimmed = await sharp(out, { raw: { width: FW, height: FH, channels: 4 } }).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 }).png().toBuffer();
  const fitted = await sharp(trimmed).resize({ width: FIT_W, height: FIT_H, fit: 'inside' }).toBuffer();
  const make = async (img, name) => { await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: img, gravity: 'centre' }]).webp({ quality: 88, alphaQuality: 100 }).toFile(path.join(OUT, name + '.webp')); n++; };
  await make(fitted, id);
  if (mirror) await make(await sharp(fitted).flop().toBuffer(), mirror);
}
console.log(n, 'pictures written to', OUT);
