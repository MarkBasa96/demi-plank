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
  // soften the 1px fringe next to removed background so no white halo shows on tinted tiles
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x; if (buf[i * 4 + 3] === 0) continue;
    if (buf[(i - 1) * 4 + 3] === 0 || buf[(i + 1) * 4 + 3] === 0 || buf[(i - w) * 4 + 3] === 0 || buf[(i + w) * 4 + 3] === 0) {
      const lum = (buf[i * 4] + buf[i * 4 + 1] + buf[i * 4 + 2]) / 3; if (lum > 225) buf[i * 4 + 3] = Math.round(255 * (255 - lum) / 30);
    }
  }
}
let n = 0;
for (let k = 0; k < ids.length; k++) {
  if (ids[k] === '-') continue;
  const [id, mirror] = ids[k].split('>'), cx = k % cols, cy = Math.floor(k / cols);
  const { data, info } = await sharp(file).extract({ left: cx * cw, top: cy * ch, width: cw, height: ch }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  whiteToAlpha(data, info.width, info.height);
  const trimmed = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 }).png().toBuffer();
  const fitted = await sharp(trimmed).resize({ width: FIT_W, height: FIT_H, fit: 'inside' }).toBuffer();
  const make = async (img, name) => { await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: img, gravity: 'centre' }]).webp({ quality: 88, alphaQuality: 100 }).toFile(path.join(OUT, name + '.webp')); n++; console.log('wrote', name); };
  await make(fitted, id);
  if (mirror) await make(await sharp(fitted).flop().toBuffer(), mirror);
}
console.log(n, 'pictures written to', OUT);
