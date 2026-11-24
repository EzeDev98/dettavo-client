import { soundMs } from '@core/edit/silences.js';

export function transcriptRows(tokens, spans, cutIds) {
  const rows = [];
  let index = 0;

  spans.forEach(({ clipId, ready }) => {
    rows.push({ key: `divider-${clipId}`, kind: 'divider', clipId });
    if (!ready) {
      rows.push({ key: `state-${clipId}`, kind: 'state', clipId });
      return;
    }

    const start = index;
    while (index < tokens.length && tokens[index].clipId === clipId) index += 1;
    const end = index - 1;
    let hasWords = false;
    for (let i = start; i <= end && !hasWords; i += 1) hasWords = tokens[i].kind === 'word';
    if (!hasWords) {
      rows.push({ key: `empty-${clipId}`, kind: 'noSpeech', clipId });
      return;
    }

    let shown = 0;
    let first = start;
    const pushParagraph = (last) => {
      const firstWord = tokens.slice(first, last + 1).find((token) => token.kind === 'word' && !cutIds.has(token.id));
      if (!firstWord) return;
      shown += 1;
      rows.push({
        key: `paragraph-${clipId}-${tokens[first].paragraphId ?? first}`,
        kind: 'paragraph',
        clipId,
        first,
        last,
        startMs: firstWord.timelineStartMs,
      });
    };
    for (let i = start + 1; i <= end; i += 1) {
      if (tokens[i].paragraphId !== tokens[i - 1].paragraphId) {
        pushParagraph(i - 1);
        first = i;
      }
    }
    pushParagraph(end);
    if (!shown) rows.push({ key: `all-cut-${clipId}`, kind: 'allCut', clipId });
  });

  return rows;
}

export function shortenedPauses(tokens, cuts) {
  const cutsByClip = new Map();
  cuts.forEach((cut) => {
    if (!cut.rangeCutIds?.length) return;
    if (!cutsByClip.has(cut.clipId)) cutsByClip.set(cut.clipId, []);
    cutsByClip.get(cut.clipId).push(cut);
  });
  const kept = new Map();
  if (!cutsByClip.size) return kept;
  tokens.forEach((token) => {
    if (token.kind !== 'pause') return;
    const clipCuts = cutsByClip.get(token.clipId);
    if (!clipCuts) return;
    let removedMs = 0;
    clipCuts.forEach((cut) => {
      removedMs += Math.max(0, Math.min(cut.endMs, token.endMs) - Math.max(cut.startMs, token.startMs));
    });
    const lengthMs = token.endMs - token.startMs;
    if (removedMs > 0 && removedMs < lengthMs) kept.set(token.id, lengthMs - removedMs);
  });
  return kept;
}

const SPEECH_MIN_MS = 200;
export function speechInPauses(tokens, media) {
  const found = new Map();
  tokens.forEach((token) => {
    if (token.kind !== 'pause') return;
    const clip = media.get(token.clipId);
    if (!clip?.levels) return;
    const ms = soundMs(clip.levels, clip.durationMs, token.startMs, token.endMs);
    if (ms >= SPEECH_MIN_MS) found.set(token.id, ms);
  });
  return found;
}
