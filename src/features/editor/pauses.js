const STORAGE_KEY = 'dettavo.pauseBar';
export const DEFAULT_PAUSE_THRESHOLD_MS = 1000;
export const DEFAULT_PAUSE_KEEP_MS = 300;

export const formatSeconds = (milliseconds) => `${milliseconds / 1000}s`;

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
