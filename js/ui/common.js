import { movePose } from '../data/moves.js';

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const I = {
  tro: '<svg viewBox="0 0 24 24"><path d="M8 4h8v6a4 4 0 0 1-8 0V4zM8 6H4v2a3 3 0 0 0 4 2.8M16 6h4v2a3 3 0 0 1-4 2.8M12 14v4M8 20h8"/></svg>',
  lib: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.5h6V4M9 10h6M9 14h6M9 18h4"/></svg>',
  plan: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>',
  rep: '<svg viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>',
  me: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  spk: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4zM16.5 8.5a5 5 0 0 1 0 7"/></svg>',
  mute: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4zM17 9l5 6M22 9l-5 6"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#B3BAC9" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  cup: '<svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 10h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-5zM16 11h2a2.5 2.5 0 0 1 0 5h-2M8 3c-1 1.2 1 2 0 3.2M12 3c-1 1.2 1 2 0 3.2"/></svg>',
  pause: '<svg viewBox="0 0 24 24" width="40" height="40" fill="#fff"><rect x="6" y="4.5" width="4.2" height="15" rx="1.2"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.2"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="40" height="40" fill="#fff"><path d="M7 4.5v15l12-7.5z"/></svg>',
  next: '<svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5l7 7-7 7M17 5v14"/></svg>',
  prev: '<svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 5l-7 7 7 7M7 5v14"/></svg>',
  up: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#9AA6C0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11v9H4v-9h3zM7 11l4-8c2 0 2.5 1.5 2 3.5L12.6 9H19a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.9 20H7"/></svg>',
  swap: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/></svg>',
  medal: '<svg width="88" height="100" viewBox="0 0 88 100"><path d="M12 56 L24 98 L44 84 L64 98 L76 56z" fill="#7283FF"/><polygon points="44,6 78,24 78,62 44,80 10,62 10,24" fill="#FFC233" stroke="#FFA000" stroke-width="4"/><polygon points="44,26 49,38 62,39 52,47 55,60 44,53 33,60 36,47 26,39 39,38" fill="#fff"/></svg>',
};

/** Placeholder line figure on a 4:3 canvas. A real picture at pics/<id>.webp replaces it automatically. */
export function fig(id, w = 120, poseOverride) {
  const pose = poseOverride || movePose(id), ink = '#252D4A', top = '#4AA3DF', mat = '#BFE3F7';
  const P = {
    plank: `<path d="M215 292 L215 372 L290 372" stroke="${ink}" fill="none"/><path d="M455 312 L565 372" stroke="${ink}" fill="none"/><path d="M205 288 L450 308" stroke="${top}" stroke-width="50" fill="none"/><circle cx="165" cy="272" r="26" fill="#fff" stroke="${ink}"/>`,
    side: `<path d="M300 220 L300 372" stroke="${ink}" fill="none"/><path d="M215 372 L300 372" stroke="${ink}" fill="none"/><path d="M235 262 L500 332" stroke="${top}" stroke-width="50" fill="none"/><path d="M500 332 L580 372" stroke="${ink}" fill="none"/><circle cx="190" cy="236" r="26" fill="#fff" stroke="${ink}"/>`,
    stretch: `<path d="M320 150 L320 300 L260 372 M320 300 L390 372" stroke="${ink}" fill="none"/><path d="M320 180 L260 130 M320 180 L385 130" stroke="${ink}" fill="none"/><path d="M320 175 L320 285" stroke="${top}" stroke-width="56" fill="none"/><circle cx="320" cy="118" r="26" fill="#fff" stroke="${ink}"/>`,
  };
  const h = Math.round(w * .75);
  return `<span class="figw" style="width:${w}px;height:${h}px"><svg class="fig" width="${w}" height="${h}" viewBox="0 0 640 480" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="320" cy="392" rx="270" ry="22" fill="${mat}" stroke="none"/>${P[pose] || P.stretch}</svg><img class="pic" src="pics/${esc(id)}.webp" width="${w}" height="${h}" alt="" decoding="async"></span>`;
}
export const demi = (w) => `<img src="icons/demi.png" width="${w}" height="${w}" alt="Demi" style="display:block;margin:0 auto;object-fit:contain">`;
export const q = '<button class="q" data-act="faq" aria-label="Common questions">?</button>';
export const mmss = secs => String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
export const hms = secs => String(Math.floor(secs / 3600)).padStart(2, '0') + ':' + mmss(secs % 3600);
