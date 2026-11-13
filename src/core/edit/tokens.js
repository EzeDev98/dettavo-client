// Tokens (guide 4.9, Build Plan 12a). The editor works on one ordered list built from the timeline: for each
// timeline clip in order, its lead-in pause, then word, pause, word, pause and so on. A clip with n words gives
// 2n + 1 tokens; one with no words is a single pause from 0 to its end. Pauses are derived, never stored, and every
// id starts with its clip id. Pure, no React. EditPlanner in dettavo-server follows the same rules.

export const leadInId = (clipId) => `${clipId}/g:start`;
export const wordTokenId = (clipId, wordId) => `${clipId}/${wordId}`;
export const pauseTokenId = (clipId, wordId) => `${clipId}/g:${wordId}`;
export const clipIdOf = (tokenId) => tokenId.slice(0, tokenId.indexOf('/'));

// Rule 8: a timeline clip that is not READY has no tokens and is kept whole.
export const isReadyClip = (clip) => clip?.state === 'READY' && Boolean(clip.transcript);

// Where each timeline clip sits: [{ clipId, ready, durationMs, timelineStartMs, timelineEndMs }]. Each clip starts
// where the previous one ends, at its full unedited length. Ids of missing clips, and a clip's second appearance,
// are skipped (rules 7 and 8).
export function timelineSpans(clips, timeline) {
  const byId = new Map(clips.map((clip) => [clip.id, clip]));
  const spans = [];
  const seen = new Set();
  let offset = 0;
  timeline.forEach((clipId) => {
    const clip = byId.get(clipId);
    if (!clip || seen.has(clipId)) return;
    seen.add(clipId);
    const durationMs = Math.max(0, clip.source?.durationMs ?? 0);
    spans.push({ clipId, ready: isReadyClip(clip), durationMs, timelineStartMs: offset, timelineEndMs: offset + durationMs });
    offset += durationMs;
  });
  return spans;
}

// The paragraph id of each word, by index.
function paragraphIdsOf(transcript) {
  const words = transcript.words ?? [];
  const indexOf = new Map(words.map((word, index) => [word.id, index]));
  const ids = new Array(words.length).fill(null);
  (transcript.paragraphs ?? []).forEach((paragraph) => {
    const first = indexOf.get(paragraph.firstWordId);
    const last = indexOf.get(paragraph.lastWordId);
    if (first === undefined || last === undefined) return;
    for (let index = first; index <= last; index += 1) ids[index] = paragraph.id;
  });
  return ids;
}

// clips: the project's clips. timeline: clip ids in order. Each token: { index, id, clipId, kind ('word' or 'pause'),
// text (words only), startMs, endMs (clip time), timelineStartMs, timelineEndMs, paragraphId }. A pause belongs to
// the paragraph of the word before it; a lead-in to the clip's first paragraph.
export function buildTokens(clips, timeline) {
  const byId = new Map(clips.map((clip) => [clip.id, clip]));
  const tokens = [];

  timelineSpans(clips, timeline).forEach((span) => {
    if (!span.ready) return;
    const { clipId, durationMs, timelineStartMs } = span;
    const transcript = byId.get(clipId).transcript;
    const words = transcript.words ?? [];
    const paragraphIds = paragraphIdsOf(transcript);
    const push = (token) => tokens.push({
      index: tokens.length,
      clipId,
      ...token,
      timelineStartMs: timelineStartMs + token.startMs,
      timelineEndMs: timelineStartMs + token.endMs,
    });

    push({
      id: leadInId(clipId),
      kind: 'pause',
      startMs: 0,
      endMs: words.length ? Math.max(0, words[0].startMs) : durationMs,
      paragraphId: paragraphIds[0] ?? null,
    });
    words.forEach((word, index) => {
      push({ id: wordTokenId(clipId, word.id), kind: 'word', text: word.text, startMs: word.startMs, endMs: word.endMs, paragraphId: paragraphIds[index] });
      // The gap to the next word, or the tail to the clip's end after the last word.
      const nextStartMs = index + 1 < words.length ? words[index + 1].startMs : durationMs;
      push({ id: pauseTokenId(clipId, word.id), kind: 'pause', startMs: word.endMs, endMs: Math.max(word.endMs, nextStartMs), paragraphId: paragraphIds[index] });
    });
  });

  return tokens;
}
