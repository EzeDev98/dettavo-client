// The pause bar's figures and remembered choices (guide 8.5, 8.6).

const STORAGE_KEY = 'dettavo.pauseBar';
export const DEFAULT_PAUSE_THRESHOLD_MS = 1000;
export const DEFAULT_PAUSE_KEEP_MS = 300;

// 1000 -> "1s", 500 -> "0.5s", 300 -> "0.3s", as the prototype writes them.
export const formatSeconds = (milliseconds) => `${milliseconds / 1000}s`;

// Longer than and shorten to, kept in this browser so the next project opens with the same choices. Storage can be
// missing or full; the defaults are used then.
export function loadPauseChoices() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return {
      thresholdMs: Number.isFinite(saved.thresholdMs) ? saved.thresholdMs : DEFAULT_PAUSE_THRESHOLD_MS,
      keepMs: Number.isFinite(saved.keepMs) ? saved.keepMs : DEFAULT_PAUSE_KEEP_MS,
    };
  } catch {
    return { thresholdMs: DEFAULT_PAUSE_THRESHOLD_MS, keepMs: DEFAULT_PAUSE_KEEP_MS };
  }
}

export function savePauseChoices(choices) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choices));
  } catch {
    // Not remembered; the choice still applies until the editor closes.
  }
}
