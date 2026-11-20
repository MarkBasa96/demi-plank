// Our own voice coach using the iPhone's built-in speech (works offline). No network, no downloads.
// Rules that keep it steady on iPhone:
//  - one voice at a time: a new line cuts the old one off (a queue made the countdown arrive late)
//  - a coach tip never talks over anything
//  - same voice every time: picked from a fixed ranked list, novelty voices (Bubbles, Zarvox...) never chosen
//  - speech is "unlocked" by your first tap, because iOS stays silent until a tap has happened
import { load } from './store.js';

const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Ralph|Kathy|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/i;
const RANK = ['Samantha', 'Ava', 'Allison', 'Susan', 'Zoe', 'Nicky', 'Daniel', 'Karen', 'Moira', 'Tessa', 'Serena', 'Oliver', 'Kate', 'Stephanie'];
const score = v => {
  const i = RANK.findIndex(n => v.name.toLowerCase().startsWith(n.toLowerCase()));
  return (i < 0 ? 50 : i) + (v.localService ? 0 : 100) + (/en-(US|GB)/i.test(v.lang) ? 0 : 20) - (/enhanced|premium/i.test(v.name) ? 5 : 0);
};
const ss = () => (typeof window !== 'undefined' ? window.speechSynthesis : undefined);

let voices = [];
function refresh() {
  try { voices = (ss()?.getVoices() || []).filter(v => /^en/i.test(v.lang) && !NOVELTY.test(v.name)).sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name)); }
  catch { voices = []; }
}
try { refresh(); ss()?.addEventListener?.('voiceschanged', refresh); } catch { /* no speech support */ }

export function listVoices() { refresh(); return voices.map(v => ({ uri: v.voiceURI, name: v.name, lang: v.lang, local: v.localService })); }
export function supported() { return typeof window !== 'undefined' && 'speechSynthesis' in window; }

function pick() {
  const s = load().settings;
  refresh();
  return voices.find(v => v.voiceURI === s.voiceURI) || voices[0] || null; // voices[0] is the best-ranked, so it is the same every time
}

// iOS keeps speech silent until a tap has started it once; a silent word on the first tap does that.
let unlocked = false;
function unlock() {
  if (unlocked || !supported()) return; unlocked = true;
  try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; ss().speak(u); } catch { /* ignore */ }
  for (const e of ['pointerdown', 'touchend', 'click']) document.removeEventListener(e, unlock, true);
}
try { for (const e of ['pointerdown', 'touchend', 'click']) document.addEventListener(e, unlock, { capture: true, passive: true }); } catch { /* ignore */ }

const live = new Set(); // keep references so the browser cannot drop an utterance mid-sentence
let timer = 0;

/** kind: 'guide' (counts, next move), 'explain' (how-to lines) or 'tip' (motivation and form tips). Respects Sound options. */
export function say(text, kind = 'guide', force = false) {
  if (!supported() || !text) return;
  const s = load().settings;
  if (!force && (s.mute || (kind === 'guide' && !s.voice) || (kind === 'tip' && !s.tips) || (kind === 'explain' && !s.explain))) return;
  try {
    const synth = ss(), busy = synth.speaking || synth.pending;
    if ((kind === 'tip' || kind === 'explain') && busy) return; // explanations and tips never talk over the coach
    const u = new SpeechSynthesisUtterance(text);
    const v = pick(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
    u.rate = 1.02; u.pitch = 1; u.volume = 1;
    live.add(u); u.onend = u.onerror = () => live.delete(u);
    clearTimeout(timer);
    const go = () => { try { synth.resume(); synth.speak(u); } catch { /* ignore */ } };
    if (busy) { synth.cancel(); timer = setTimeout(go, 60); } // Safari drops a line spoken in the same instant as a cancel
    else go();
  } catch { /* ignore */ }
}
export function isBusy() { try { const s = ss(); return !!s && (s.speaking || s.pending); } catch { return false; } }
export function stopSpeaking() { try { clearTimeout(timer); ss()?.cancel(); } catch { /* ignore */ } }

// Our own coach tips (short, plain, no hype). Picked at random during holds.
export const TIPS = [
  'Breathe slowly. In through the nose, out through the mouth.',
  'Squeeze your glutes. Your body is one straight line.',
  'Keep your belly tight, like someone is about to poke it.',
  'Eyes on the floor. Keep your neck long.',
  'Push the floor away. Stay tall through your shoulders.',
  'Do not let your hips sag. Lift a little higher.',
  'Relax your jaw. Strong body, calm face.',
  'Short on time? Quality beats time. Hold the shape.',
  'You are doing great. Stay with it.',
  'Tuck your tailbone slightly. Feel your abs switch on.',
];
export const tip = () => TIPS[Math.floor(Math.random() * TIPS.length)];
