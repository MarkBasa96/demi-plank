// Our own voice coach using the iPhone's built-in speech (works offline). No network, no downloads.
import { load } from './store.js';

let voices = [];
function refresh() { try { voices = (window.speechSynthesis?.getVoices() || []).filter(v => /^en/i.test(v.lang)); } catch { voices = []; } }
try { refresh(); window.speechSynthesis?.addEventListener?.('voiceschanged', refresh); } catch { /* no speech support */ }

export function listVoices() { refresh(); return voices.map(v => ({ uri: v.voiceURI, name: v.name, lang: v.lang, local: v.localService })); }
export function supported() { return typeof window !== 'undefined' && 'speechSynthesis' in window; }

function pick() {
  const s = load().settings;
  refresh();
  return voices.find(v => v.voiceURI === s.voiceURI) || voices.find(v => v.localService && /en-(US|GB)/i.test(v.lang)) || voices.find(v => v.localService) || voices[0] || null;
}

/** kind: 'guide' (counts, next move, rest) or 'tip' (coach tips). Respects Sound options. */
export function say(text, kind = 'guide', force = false) {
  if (!supported() || !text) return;
  const s = load().settings;
  if (!force && (s.mute || (kind === 'guide' && !s.voice) || (kind === 'tip' && !s.tips))) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    const v = pick(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
    u.rate = 1.02; u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}
export function stopSpeaking() { try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } }

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
