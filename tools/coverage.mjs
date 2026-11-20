// Which moves still show the placeholder line figure? node tools/coverage.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { LIBRARY } from '../js/data/library.js'; import { getLevel } from '../js/engine.js'; import { WARM, COOL } from '../js/engine.js'; import { moveName } from '../js/data/moves.js';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'pics');
const have = new Set(fs.existsSync(root) ? fs.readdirSync(root).map(f => f.replace('.webp', '')) : []);
const used = new Map(); const add = (id, where) => { if (!used.has(id)) used.set(id, new Set()); used.get(id).add(where); };
for (const [id] of [...WARM, ...COOL]) add(id, 'warm/cool');
for (let i = 0; i < 6; i++) for (const d of getLevel(i).days) for (const [id] of d.main || []) add(id, 'plan');
for (const w of LIBRARY) for (const m of (w.moves || w.levels.flatMap(l => l.moves))) add(m[0], 'library');
const miss = [...used].filter(([id]) => !have.has(id));
console.log('moves used:', used.size, '| pictures:', used.size - miss.length, '| missing:', miss.length);
for (const where of ['warm/cool', 'plan', 'library']) { const l = miss.filter(([, s]) => s.has(where) && (where === 'library' ? s.size === 1 : true)).map(([id]) => id); if (l.length) console.log(`\n${where} (${l.length}):\n  ` + l.join(', ')); }
