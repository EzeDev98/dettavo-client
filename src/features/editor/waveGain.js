// How tall the timeline waveform is drawn: a view-only setting, remembered in this browser. It never touches the
// audio or the cuts.
const STORAGE_KEY = 'dettavo.waveGain';

export const WAVE_GAINS = [1, 2, 3, 4, 6, 8];

export function loadWaveGain() {
  try {
    const saved = Number(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    return WAVE_GAINS.includes(saved) ? saved : 1;
  } catch {
    return 1;
  }
}

export function saveWaveGain(gain) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gain));
  } catch {
    // Not remembered; the choice still applies until the editor closes.
  }
}
