import { markInstalled } from './isPWAInstalled.js';

let state = { prompt: null, installed: false };
const listeners = new Set();

function update(next) {
  state = { ...state, ...next };
  window.__dettavoInstall = state;
  listeners.forEach((listener) => listener());
}

window.__dettavoInstall = state;

window.addEventListener('beforeinstallprompt', (event) => {
  // Keep the event for the Install screen and stop the browser's own mini-prompt.
  event.preventDefault();
  update({ prompt: event });
});

window.addEventListener('appinstalled', () => {
  markInstalled(); // the browser has just installed the app: this page now counts as installed
  update({ prompt: null, installed: true });
});

// { prompt: BeforeInstallPromptEvent | null, installed: boolean }. A new object on every change.
export const getInstallState = () => state;

// For useSyncExternalStore(subscribeInstall, getInstallState). Returns the unsubscribe function.
export function subscribeInstall(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// The browser allows one use of a captured prompt. Call this after prompt() has been shown.
export const clearInstallPrompt = () => update({ prompt: null });
