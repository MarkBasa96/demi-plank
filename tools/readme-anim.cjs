// Makes docs/screenshots/animated-moves.gif: three moves looping, so the README can show the flip-book.  node tools/readme-anim.cjs
const sharp = require('sharp'), fs = require('fs');
const moves = [['plank', [2, 1, 2, 1]], ['jumping-jacks', [1, 2, 3, 2]], ['sit-ups', [1, 2, 3, 2]]];
const S = 3 * 252 + 12, Hh = 180 + 24, DELAY = 600;
(async () => {
  const cache = {};
  for (const [id] of moves) for (const n of [1, 2, 3]) { const p = `pics/${id}${n === 1 ? '' : '-' + n}.webp`; if (fs.existsSync(p)) cache[id + n] = await sharp(p).resize(240, 180).flatten({ background: '#F4F6FB' }).png().toBuffer(); }
  const frames = [];
  for (let k = 0; k < 4; k++) {
    const comps = moves.map(([id, seq], i) => ({ input: cache[id + seq[k]], left: 12 + i * 252, top: 12 }));
    frames.push(await sharp({ create: { width: S, height: Hh, channels: 3, background: '#F4F6FB' } }).composite(comps).png().toBuffer());
  }
  await sharp(frames, { join: { animated: true } }).gif({ delay: [DELAY, DELAY, DELAY, DELAY], loop: 0 }).toFile('docs/screenshots/animated-moves.gif');
  console.log('ok', fs.statSync('docs/screenshots/animated-moves.gif').size);
})();
