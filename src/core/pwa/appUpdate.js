import { useSyncExternalStore } from 'react';
import { queryClient } from '@core/data/queryClient.js';

// Finds out when a newer build than the one running is being served, and resets this browser's app files to load it.
// The running build id is baked into the bundle (__APP_BUILD_ID__); /version.json always holds the newest build.
export const CHECK_EVERY_MS = 3 * 60_000;
export const RUNNING_BUILD = typeof __APP_BUILD_ID__ === 'string' ? __APP_BUILD_ID__ : null;

// The build this browser last fully reset for. Kept apart from the running bundle on purpose: page loads are network-first,
// so a plain reload runs the newest bundle even though the old service worker and its caches still serve old files
// (fonts, icons). Without this marker the browser would look up to date and never be offered the reset.
const APPLIED_KEY = 'dettavo.applied.build';

const readApplied = () => {
  try {
    return localStorage.getItem(APPLIED_KEY);
  } catch {
    return null;
  }
};
const writeApplied = (buildId) => {
  try {
    if (buildId) localStorage.setItem(APPLIED_KEY, buildId);
  } catch {
    // Storage unavailable: the next check simply offers the update again.
  }
};

let state = { latest: null }; // the build id to install, or null when this browser is current
const listeners = new Set();
const setState = (next) => {
  state = next;
  listeners.forEach((listener) => listener());
};

export const appUpdate = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => state,

  // One look at the served build id. Silent on any failure (the client stopped): the next round tries again.
  async check() {
    if (!import.meta.env.PROD || !RUNNING_BUILD) return;
    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const { buildId } = await response.json();
      if (typeof buildId !== 'string') return;
      if (buildId !== RUNNING_BUILD || buildId !== readApplied()) setState({ latest: buildId });
    } catch {
      // Try again next round.
    }
  },

  // Checks now, every 3 minutes, and whenever the app comes back to the foreground. Call once.
  start() {
    // A browser with no worker yet has nothing stale, so it starts out current.
    if (readApplied() === null && !navigator.serviceWorker?.controller) writeApplied(RUNNING_BUILD);
    appUpdate.check();
    setInterval(appUpdate.check, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') appUpdate.check();
    });
  },

  // Full reset of the client's own files: removes the service worker, every cache, sessionStorage and localStorage, then
  // reloads into the new build. Projects and edits live in dettavo-server, and the pairing cookie is HttpOnly (scripts
  // cannot clear it), so nothing is lost and the browser stays paired. Each step is best effort.
  async install() {
    const target = state.latest ?? RUNNING_BUILD;
    const attempt = async (step) => {
      try {
        await step();
      } catch {
        // Carry on with the rest.
      }
    };
    // The worker goes first, so nothing can refill a cache that is about to be deleted.
    await attempt(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    });
    await attempt(async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    });
    await attempt(async () => sessionStorage.clear());
    await attempt(async () => localStorage.clear());
    // The wipe removed the marker, so write it back or the next check offers the same update again.
    writeApplied(target);
    await attempt(async () => queryClient.clear());
    // The query string makes the reload a new address, so no HTTP cache can answer it.
    window.location.replace(`/?updated=${Date.now()}`);
  },
};

export const useAppUpdate = () => useSyncExternalStore(appUpdate.subscribe, appUpdate.getSnapshot);
