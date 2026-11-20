// Shared UI state + tiny router. Views are plain functions that return HTML; clicks go through data-act handlers.
export const ui = {
  tab: 'challenge',
  stack: [],          // overlay views on top of the tab: { v, ...params }
  dialog: null,       // { kind, ... } modal on top of everything
  sel: {},            // selected day per level index
  planTab: 'calendar',
  player: null, challenge: null,
  histMonth: null,
  toast: '',
};
export const acts = {};
export const views = {};
let renderFn = () => {};
export const setRender = fn => { renderFn = fn; };
export const render = () => renderFn();
export const go = (v, params = {}) => { ui.stack.push({ v, ...params }); render(); };
export const back = () => { ui.stack.pop(); render(); };
export const top = () => ui.stack[ui.stack.length - 1] || null;
export const openDialog = d => { ui.dialog = d; render(); };
export const closeDialog = () => { ui.dialog = null; render(); };
let toastTimer = 0;
export function toast(msg) { ui.toast = msg; render(); clearTimeout(toastTimer); toastTimer = setTimeout(() => { ui.toast = ''; render(); }, 2400); }
