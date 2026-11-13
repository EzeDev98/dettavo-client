// The pause bar's figures and remembered choices (guide 8.5, 8.6).

const STORAGE_KEY = 'dettavo.pauseBar';
export const DEFAULT_PAUSE_THRESHOLD_MS = 1000;
export const DEFAULT_PAUSE_KEEP_MS = 300;

// How long the pauses are in total as edited, and how many are longer than the threshold and still untouched. A
// removed pause counts nothing; a trimmed one counts what it keeps.
export function pauseSummary(tokens, removed, trims, thresholdMs) {
  let totalMs = 0;
  let overCount = 0;
  tokens.forEach((token) => {
    if (token.kind !== 'pause') return;
    const lengthMs = token.endMs - token.startMs;
    if (removed.has(token.id)) return;
    if (trims.has(token.id)) {
      totalMs += Math.min(lengthMs, trims.get(token.id));
      return;
    }
    totalMs += lengthMs;
    if (lengthMs > thresholdMs) overCount += 1;
  });
  return { totalMs, overCount };
}

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
