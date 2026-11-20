import assert from 'node:assert/strict';
import { getLevel, dayMinutes, sessionSeconds, SESSION_CAP, REST_DAYS, CAPS, getSession } from '../js/engine.js';
const mins = (l, d) => dayMinutes(l, d);
console.log('Original: B1', mins(0,1), 'B30', mins(0,30), 'I28', mins(1,28), 'A28', mins(2,28));
console.log('Expert d1/14/28', mins(3,1), mins(3,14), mins(3,28), '| Master d1/14/28', mins(4,1), mins(4,14), mins(4,28));
for (const c of [2, 5, 10, 30, 100]) console.log('cycle', c, 'd1', mins(c+3,1), 'd14', mins(c+3,14), 'd28', mins(c+3,28));
let checked = 0;
for (let i = 0; i < 140; i++) {
  const lv = getLevel(i);
  assert.equal(lv.days.length, i === 0 ? 30 : 28);
  for (const d of lv.days) {
    if (REST_DAYS.includes(d.day) && i > 0) { assert.ok(d.rest, `L${i} d${d.day} should rest`); continue; }
    if (d.rest) continue;
    if (i >= 3) {
      assert.ok(sessionSeconds(d) <= SESSION_CAP, `L${i} d${d.day} over 40 min: ${sessionSeconds(d)/60}`);
      for (const [id, s] of d.main) assert.ok(s <= 240 && s > 0, `L${i} d${d.day} ${id} ${s}`);
    }
    const ses = getSession(i, d.day); assert.ok(ses.items.length >= 13); checked++;
  }
}
// a test that discriminates: cycle 2+ day 1 is a test day, cycle 1 is not
assert.equal(getSession(4, 1).test, false); assert.equal(getSession(5, 1).test, true);
assert.equal(getSession(5, 1).items.find(m => m.id === 'max-plank-test').secs, 0);
// growth within a level and across cycles
assert.ok(mins(3, 28) > mins(3, 1)); assert.ok(mins(8, 28) >= mins(5, 28));
console.log('OK', checked, 'sessions checked across 140 levels');
