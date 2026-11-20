// The voice coach's script: what to say before a move (during Ready / Rest) and while holding it.
// Pure text and timing, no speaking here (voice.js speaks). Everything is our own wording.
import { moveName } from './data/moves.js';
import { moveSteps } from './data/steps.js';
import { moveAbout } from './data/about.js';
import { tip } from './voice.js';

/** rough seconds a line takes to say (about 2.8 words a second plus a breath) */
export const speechSecs = text => text.trim().split(/\s+/).length / 2.8 + 0.5;

export const MOTIVATION = [
  'You are stronger than you think.',
  'Stay with it. Every second counts.',
  'This is where it gets good.',
  'Breathe. You have got this.',
  'Strong body, strong mind.',
  'Do not quit now. You are closer than you think.',
  'One more breath. Then another.',
  'Think how good you will feel when this is done.',
  'Keep going, Joe. You are doing great.',
  'It is supposed to feel hard. That is how you get stronger.',
  'Stay focused. Nobody is doing this for you, and you are doing it.',
  'Shake it out later. Hold it now.',
  'Look at you go. Keep that form.',
  'Tough now, easy later.',
  'You showed up today. That is the hard part, and you did it.',
  'Slow breath in. Slow breath out. Stay calm.',
  'Almost there. Do not let go.',
  'Make this one count.',
  'Good form beats a long hold. Stay tidy.',
  'Your future self says thank you.',
];
let bag = [];
export function motivation() { if (!bag.length) bag = [...MOTIVATION].sort(() => Math.random() - .5); return bag.pop(); }

const GAP = 1.1; // quiet seconds between lines

/** What to say while a move is being held. Returns [{at (seconds into the hold), text, kind}] sorted by time.
 *  kind 'explain' = how-to lines (Explain exercises), 'tip' = motivation and form tips (Tips & motivation). */
export function holdPlan(id, secs, opts = {}) {
  const items = [], steps = moveSteps(id);
  const endless = !secs; // count-up test plank
  const horizon = endless ? 600 : secs;
  const reserve = endless ? 0 : horizon >= 40 ? 14 : 10; // room for "10 seconds left" and the 3-2-1
  const limit = horizon - reserve;
  let t = opts.skipIntro ? 2.2 : 3.2; // let the move name finish first
  const put = (text, kind) => { const d = speechSecs(text); if (t + d > limit) return false; items.push({ at: t, text, kind }); t += d + GAP; return true; };
  if (steps && opts.explain !== false) {
    const heard = Math.min(opts.heard || 0, steps.steps.length); let said = 0, early = horizon >= 40;
    for (let i = heard; i < steps.steps.length; i++) {
      if (!put((i === 0 ? 'Here is how. ' : heard && i === heard ? 'Then, ' : '') + steps.steps[i], 'explain')) break;
      if (early && ++said === 2) { early = false; put(motivation(), 'tip'); } // a word of encouragement early, not only at the end
    }
    put('Watch out. ' + steps.watch, 'explain');
  }
  // fill what is left with motivation and form tips, spread out so the coach is not nagging
  let flip = 0;
  const spacing = horizon >= 90 ? 14 : 4;
  while (true) {
    const text = flip++ % 2 === 0 ? motivation() : tip();
    t += (items.length ? spacing : 0);
    if (!put(text, 'tip')) break;
    if (endless && items.length > 40) break;
  }
  return items;
}

/** One line for the Rest phase: names the next move, then explains it as far as the rest time allows. */
export function restLine(nextId, restSecs, explain) {
  let text = `Take a rest. Next, ${moveName(nextId)}.`, heard = 0;
  if (!explain) return { text, heard };
  let used = speechSecs(text); const budget = restSecs - 3; // the last 3 seconds belong to "Get ready"
  const add = s => { const d = speechSecs(s); if (used + d > budget) return false; text += ' ' + s; used += d; return true; };
  const a = moveAbout(nextId); if (a) add(a);
  const st = moveSteps(nextId);
  if (st) for (let i = 0; i < st.steps.length; i++) { if (!add((i === 0 ? 'Here is how. ' : '') + st.steps[i])) break; heard++; }
  return { text, heard };
}

/** The opening line of a workout: how long to spend on it, and what to say. */
export function readyLine(id, explain) {
  const base = `Get ready. ${moveName(id)}.`;
  if (!explain) return { text: base, secs: 7, heard: 0 };
  let text = base, used = speechSecs(base), heard = 0; const budget = 24;
  const add = s => { const d = speechSecs(s); if (used + d > budget) return false; text += ' ' + s; used += d; return true; };
  const a = moveAbout(id); if (a) add(a);
  const st = moveSteps(id);
  if (st) for (let i = 0; i < st.steps.length; i++) { if (!add((i === 0 ? 'Here is how. ' : '') + st.steps[i])) break; heard++; }
  return { text, secs: Math.max(7, Math.min(30, Math.ceil(used + 3))), heard };
}
