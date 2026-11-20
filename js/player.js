// Workout state machine: ready -> move -> (rest) -> move ... -> done. Time comes from the clock, not from counting ticks,
// so a throttled timer never makes a hold shorter or longer.
import { moveName, kcalPerMin } from './data/moves.js';
import { say, tip, stopSpeaking } from './voice.js';
import { load } from './store.js';

export const READY_SECS = 7;

export class Player {
  /** items: [{id, secs, section}], opts: { onChange(), onTick(), onDone(), kind } */
  constructor(items, opts) {
    this.items = items; this.opts = opts; this.idx = 0; this.phase = 'ready'; this.paused = false;
    this.phaseLen = READY_SECS; this.acc = 0; this.last = performance.now();
    this.spent = 0; this.kcal = 0; this.movesDone = 0; this.cues = new Set(); this.finished = false;
    this.timer = setInterval(() => this.tick(), 200);
    this.wake();
    this.enterPhase('ready');
  }
  get item() { return this.items[this.idx]; }
  get next() { return this.items[this.idx + 1] || null; }
  get restSecs() { const s = load().settings; return s.restMode === 'custom' ? s.restSecs : 20; }
  get remaining() { return Math.max(0, Math.ceil(this.phaseLen - this.acc)); }
  get countUp() { return this.phase === 'move' && this.item.secs === 0; }
  get elapsed() { return Math.floor(this.acc); }
  get fraction() { return this.phaseLen > 0 ? Math.min(1, this.acc / this.phaseLen) : 0; }

  async wake() { try { this.lock = await navigator.wakeLock?.request('screen'); } catch { /* not available */ } }
  tick() {
    const now = performance.now(), dt = (now - this.last) / 1000; this.last = now;
    if (this.paused || this.finished) return;
    this.acc += dt;
    if (this.phase === 'move' && !this.countUp) this.spent += dt; else if (this.countUp) this.spent += dt;
    this.cue();
    if (!this.countUp && this.acc >= this.phaseLen) this.advance();
    else this.opts.onTick?.();
  }
  cue() {
    const r = this.remaining, key = (k) => { const id = this.idx + ':' + this.phase + ':' + k; if (this.cues.has(id)) return false; this.cues.add(id); return true; };
    if (this.phase === 'ready' && r <= 3 && r >= 1 && key('c' + r)) say(String(r));
    else if (this.phase === 'move' && !this.countUp) {
      const total = this.item.secs;
      if (r <= 3 && r >= 1 && key('c' + r)) say(String(r));
      else if (total >= 30 && Math.abs(this.acc - total / 2) < .35 && key('half')) say('Halfway');
      else if (total >= 25 && r === 10 && key('ten')) say('10 seconds left');
      else if (this.item.section === 'main' && total >= 40 && Math.abs(this.acc - total / 3) < .35 && key('tip')) say(tip(), 'tip');
    } else if (this.phase === 'rest' && r === 3 && key('c3')) say('Get ready');
    if (this.countUp && Math.floor(this.acc) > 0 && Math.floor(this.acc) % 30 === 0 && key('t' + Math.floor(this.acc))) say(Math.floor(this.acc / 60) + ' minutes ' + (Math.floor(this.acc) % 60) + ' seconds');
  }
  enterPhase(p, len) {
    this.phase = p; this.acc = 0; this.last = performance.now(); this.paused = false;
    if (p === 'ready') { this.phaseLen = READY_SECS; say('Get ready. ' + moveName(this.item.id)); }
    else if (p === 'move') { this.phaseLen = this.item.secs; say(moveName(this.item.id)); }
    else if (p === 'rest') { this.phaseLen = len; say('Take a rest. Next, ' + moveName(this.next.id)); }
    this.opts.onChange?.();
  }
  advance() { // phase finished naturally
    if (this.phase === 'ready') return this.enterPhase('move');
    if (this.phase === 'move') {
      this.credit();
      const n = this.next;
      if (!n) return this.finish();
      if (this.item.section === 'main' && n.section === 'main') { this.idx++; this.idx--; return this.toRest(); }
      this.idx++; return this.enterPhase('move');
    }
    if (this.phase === 'rest') { this.idx++; return this.enterPhase('move'); }
  }
  toRest() { this.enterPhase('rest', this.restSecs); }
  credit() { const s = this.countUp ? this.acc : this.item.secs; this.kcal += kcalPerMin(this.item.id) * s / 60; this.movesDone++; }
  // controls
  togglePause() { this.paused = !this.paused; this.last = performance.now(); if (this.paused) stopSpeaking(); this.opts.onChange?.(); }
  skip() {
    stopSpeaking();
    if (this.phase === 'ready') return this.enterPhase('move');
    if (this.phase === 'rest') { this.idx++; return this.enterPhase('move'); }
    if (this.phase === 'move') {
      const n = this.next; if (!n) return this.finish();
      if (this.item.section === 'main' && n.section === 'main') return this.toRest();
      this.idx++; return this.enterPhase('move');
    }
  }
  prev() { stopSpeaking(); if (this.idx > 0) { this.idx--; this.cues = new Set(); this.enterPhase('move'); } else this.enterPhase('move'); }
  addRest() { if (this.phase === 'rest') { this.phaseLen += 20; this.opts.onTick?.(); } }
  completeNow() { if (this.countUp) { this.credit(); this.finish(); } } // test-day max plank
  finish() {
    if (this.finished) return; this.finished = true; this.stop();
    say('Well done. Workout complete.');
    this.opts.onDone?.({ secs: Math.round(this.spent), kcal: Math.round(this.kcal * 10) / 10, moves: this.movesDone });
  }
  stop() { clearInterval(this.timer); try { this.lock?.release(); } catch { /* ignore */ } stopSpeaking(); }
}

/** Open-ended count-up used by the Challenge tab. target = 0 means unlimited. */
export class Challenge {
  constructor(target, opts) { this.target = target; this.opts = opts; this.acc = 0; this.last = performance.now(); this.paused = false; this.finished = false; this.said = new Set();
    this.timer = setInterval(() => this.tick(), 200); this.wake(); say('Challenge started. Hold as long as you can.'); }
  async wake() { try { this.lock = await navigator.wakeLock?.request('screen'); } catch { /* not available */ } }
  tick() {
    const now = performance.now(), dt = (now - this.last) / 1000; this.last = now;
    if (this.finished) return; this.acc += dt;
    const s = Math.floor(this.acc);
    if (s > 0 && s % 30 === 0 && !this.said.has(s)) { this.said.add(s); say(s >= 60 ? Math.floor(s / 60) + ' minute' + (s >= 120 ? 's' : '') + (s % 60 ? ' ' + (s % 60) + ' seconds' : '') : s + ' seconds'); }
    if (this.target && this.acc >= this.target) return this.finish();
    this.opts.onTick?.();
  }
  get secs() { return Math.floor(this.acc); }
  finish() { if (this.finished) return; this.finished = true; this.stop(); this.opts.onDone?.(this.secs); }
  stop() { clearInterval(this.timer); try { this.lock?.release(); } catch { /* ignore */ } stopSpeaking(); }
}
