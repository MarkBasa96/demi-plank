// Contact sheets to eyeball frames: node tools/frames-contact.cjs <outDir>   (writes frames-contact-N.png, 30 moves each)
const sharp = require('sharp'), fs = require('fs'), path = require('path');
const out = process.argv[2];
const ids = fs.readdirSync('pics').filter(f => /-2\.webp$/.test(f)).map(f => f.replace(/-2\.webp$/, '')).filter(i => !/-right$|^right-|-right-/.test(i)).sort();
const TW = 160, TH = 120, PER = 30;
(async () => {
  for (let s = 0; s * PER < ids.length; s++) {
    const part = ids.slice(s * PER, (s + 1) * PER), comps = [];
    for (let k = 0; k < part.length; k++) {
      const id = part[k], x0 = (k % 3) * (TW * 3 + 12), y0 = Math.floor(k / 3) * (TH + 18);
      for (let f = 1; f <= 3; f++) {
        const p = f === 1 ? `pics/${id}.webp` : `pics/${id}-${f}.webp`;
        if (!fs.existsSync(p)) continue;
        comps.push({ input: await sharp(p).flatten({ background: '#ffffff' }).resize(TW, TH).png().toBuffer(), left: x0 + (f - 1) * TW, top: y0 + 14 });
      }
      comps.push({ input: Buffer.from(`<svg width="${TW * 3}" height="14" xmlns="http://www.w3.org/2000/svg"><text x="2" y="11" font-size="11" font-family="Arial" fill="#222">${id}</text></svg>`), left: x0, top: y0 });
    }
    await sharp({ create: { width: (TW * 3 + 12) * 3, height: Math.ceil(part.length / 3) * (TH + 18), channels: 3, background: '#d8d8d8' } }).composite(comps).png().toFile(path.join(out, `frames-contact-${s + 1}.png`));
  }
  console.log(ids.length, 'moves');
})();
