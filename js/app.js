import { ui, acts, views, setRender, top, toast } from './ui/ctx.js';
import { tabHtml, dialogHtml } from './ui/tabs.js';
import { workoutDialog } from './ui/workout.js';
import { load, flush } from './store.js';
import { esc } from './ui/common.js';

const app = document.getElementById('app');
const SCROLL = new Map();
const scrollKey = () => ui.tab + '|' + ui.stack.map(s => s.v).join('>');
const SELS = ['.content', '.pbody', '#days'];

function render() {
  const k = scrollKey(), old = app.dataset.k;
  if (old) { const saved = {}; SELS.forEach(s => { const n = app.querySelector(s); if (n) saved[s] = [n.scrollTop, n.scrollLeft]; }); SCROLL.set(old, saved); }
  const t = top();
  let html;
  try { html = t && views[t.v] ? views[t.v]() : tabHtml(); } catch (e) { html = `<div class="screen"><div class="content"><h2 style="margin-top:80px">Something went wrong</h2><p style="margin:12px 0;color:#9AA6C0">${esc(e.message)}</p><button class="pill" data-act="tab" data-v="challenge">Go to start</button></div></div>`; console.error(e); }
  app.innerHTML = html + dialogHtml() + workoutDialog() + (ui.toast ? `<div class="toast">${esc(ui.toast)}</div>` : '');
  app.querySelectorAll('img.pic').forEach(i => { if (i.complete && i.naturalWidth) covered(i); });
  app.dataset.k = k;
  const prev = SCROLL.get(k);
  if (prev) SELS.forEach(s => { const n = app.querySelector(s); if (n && prev[s]) { n.scrollTop = prev[s][0]; n.scrollLeft = prev[s][1]; } });
  bindSliders();
}
setRender(render);

// one delegated click handler for the whole app
app.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = acts[el.dataset.act]; if (fn) { e.stopPropagation(); fn(el, e); }
});
// a placeholder figure is replaced by a real picture only when that picture loads; a missing one just disappears
document.addEventListener('error', e => { if (e.target?.classList?.contains('pic')) e.target.remove(); }, true);
const covered = img => { const f = img.previousElementSibling; if (f && f.classList.contains('fig')) f.style.visibility = 'hidden'; };
document.addEventListener('load', e => { if (e.target?.classList?.contains('pic')) covered(e.target); }, true);

function bindSliders() {
  app.querySelectorAll('[data-slider]').forEach(sl => {
    const knob = sl.querySelector('.knob'); let x0 = 0, drag = false;
    const max = () => sl.clientWidth - knob.clientWidth - 8;
    knob.addEventListener('pointerdown', e => { drag = true; x0 = e.clientX; knob.setPointerCapture(e.pointerId); });
    knob.addEventListener('pointermove', e => { if (drag) knob.style.transform = `translateX(${Math.max(0, Math.min(max(), e.clientX - x0))}px)`; });
    const end = e => { if (!drag) return; drag = false; const dx = Math.max(0, e.clientX - x0);
      if (dx > max() * .8) { if (sl.dataset.slider === 'chal') acts.chalslide(); else ui.player?.completeNow(); } else knob.style.transform = ''; };
    knob.addEventListener('pointerup', end); knob.addEventListener('pointercancel', end);
  });
}

// phone locked or app switched: pause the workout so the clock never runs while nobody is planking
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { flush(); if (ui.player && !ui.player.paused) { ui.player.togglePause(); } }
});
window.addEventListener('pagehide', flush);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { /* works fine without; only offline install needs it */ });

load();
// start on the plan tab if the user has progress, else the Challenge tab like the original
ui.tab = 'challenge';
render();
window.__demi = { ui, acts, render }; // handy for the tap-through test; harmless in the shipped app
