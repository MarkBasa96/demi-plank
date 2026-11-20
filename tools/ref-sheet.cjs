// Builds a reference sheet of existing stills for Flow. Usage: node tools/ref-sheet.cjs <out.png> <cols> <id1,id2,...>
const sharp = require('sharp');
const [, , out, colsArg, list] = process.argv;
const cols = Number(colsArg), ids = list.split(',');
(async () => {
  const W = 640, H = 480, rows = Math.ceil(ids.length / cols), comps = [];
  for (let i = 0; i < ids.length; i++) {
    const b = await sharp('pics/' + ids[i] + '.webp').flatten({ background: '#fff' }).png().toBuffer();
    comps.push({ input: b, left: (i % cols) * W, top: Math.floor(i / cols) * H });
  }
  await sharp({ create: { width: W * cols, height: H * rows, channels: 3, background: '#fff' } }).composite(comps).png().toFile(out);
  console.log('ok', ids.length, 'cells,', cols + 'x' + rows);
})();
