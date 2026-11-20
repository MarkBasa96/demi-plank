// Contact sheet of every picture on the app's tile colour, so style consistency can be judged at a glance.
import sharp from 'sharp'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'); const dir = path.join(root, 'pics');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.webp')).sort();
const cols = 6, w = 320, h = 240, pad = 6, per = 36;
for (let p = 0; p * per < files.length; p++) {
  const part = files.slice(p * per, (p + 1) * per), rows = Math.ceil(part.length / cols);
  const comps = [];
  for (let i = 0; i < part.length; i++) {
    const img = await sharp(path.join(dir, part[i])).resize(w, h).png().toBuffer();
    const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="22"><text x="6" y="16" font-family="Arial" font-size="13" fill="#252D4A">${part[i].replace('.webp', '')}</text></svg>`);
    const x = (i % cols) * (w + pad), y = Math.floor(i / cols) * (h + 22 + pad);
    comps.push({ input: img, left: x, top: y }, { input: label, left: x, top: y + h });
  }
  await sharp({ create: { width: cols * (w + pad), height: rows * (h + 22 + pad), channels: 3, background: '#EAF3FB' } }).composite(comps).png().toFile(path.join(root, `test-contact-${p + 1}.png`));
}
console.log(files.length, 'pictures');
