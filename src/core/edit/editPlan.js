// The edit plan (guide 4.9 rules 1 to 8, Build Plan 12b): which parts of each timeline clip are cut and which are
// kept. Pure, no React. EditPlanner in dettavo-server implements the same numbered rules; change both together.
import { timelineSpans } from './tokens.js';

// Rule 5, app.edit.min-keep-segment-ms on the server.
export const MIN_KEEP_SEGMENT_MS = 20;

// Rules 2 to 5 for one clip, on its own source time. Consecutive removed tokens merge into one cut (rule 2); a
// trimmed pause longer than keepMs gets a cut centred in it that never merges with its neighbours (rule 3); a cut
// holding a word shrinks by padMs at both ends (rule 4); cuts are clamped to the clip (rule 5).
function planClipCuts(tokens, removed, trims, padMs, durationMs) {
  const cuts = [];
  let run = null;

  const closeRun = () => {
    if (!run) return;
    const pad = run.hasWord ? padMs : 0;
    cuts.push({ startMs: run.startMs + pad, endMs: run.endMs - pad, kind: 'REMOVE', tokenIds: run.tokenIds });
    run = null;
  };

  tokens.forEach((token) => {
    if (removed.has(token.id)) {
      if (!run) run = { startMs: token.startMs, endMs: token.endMs, hasWord: false, tokenIds: [] };
      run.endMs = token.endMs;
      run.hasWord = run.hasWord || token.kind === 'word';
      run.tokenIds.push(token.id);
      return;
    }
    closeRun();
    const keepMs = token.kind === 'pause' ? trims.get(token.id) : undefined;
    if (keepMs !== undefined && token.endMs - token.startMs > keepMs) {
      // keepMs is split between the two sides; an odd millisecond stays after the cut.
      const before = Math.floor(keepMs / 2);
      cuts.push({ startMs: token.startMs + before, endMs: token.endMs - (keepMs - before), kind: 'TRIM', tokenIds: [token.id] });
    }
  });
  closeRun();

  return cuts
    .map((cut) => ({ ...cut, startMs: Math.max(0, cut.startMs), endMs: Math.min(durationMs, cut.endMs) }))
    .filter((cut) => cut.endMs > cut.startMs);
}

// Rule 5: a keep segment shorter than MIN_KEEP_SEGMENT_MS is absorbed into the cut next to it. Between two cuts the
// two become one; at the clip's start or end the cut grows to the edge.
function absorbTinyKeeps(cuts, durationMs) {
  const merged = [];
  [...cuts]
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs)
    .forEach((cut) => {
      const last = merged[merged.length - 1];
      if (last && cut.startMs - last.endMs < MIN_KEEP_SEGMENT_MS) {
        last.endMs = Math.max(last.endMs, cut.endMs);
        last.kind = last.kind === 'TRIM' && cut.kind === 'TRIM' ? 'TRIM' : 'REMOVE';
        last.tokenIds = [...last.tokenIds, ...cut.tokenIds];
      } else {
        merged.push({ ...cut, tokenIds: [...cut.tokenIds] });
      }
    });

  if (merged.length) {
    const first = merged[0];
    const last = merged[merged.length - 1];
    if (first.startMs < MIN_KEEP_SEGMENT_MS) first.startMs = 0;
    if (durationMs - last.endMs < MIN_KEEP_SEGMENT_MS) last.endMs = durationMs;
  }
  return merged;
}

// tokens: from buildTokens. timeline: clip ids in order. clips: the project's clips. removed: a Set or array of token
// ids. trims: a Map of pause id to keepMs, or [{ pauseId, keepMs }]. padMs: the project's padding.
// Returns { cuts, keepSegments, editedMs, removedMs, timelineMs }:
//   cut          { clipId, startMs, endMs, timelineStartMs, timelineEndMs, kind ('REMOVE' or 'TRIM'), tokenIds }
//   keep segment { clipId, startMs, endMs, timelineStartMs, editedStartMs }
// Times without a prefix are the clip's own; timeline times are unedited; both lists are in timeline order (rule 6).
export function editPlan(tokens, timeline, clips, removed, trims, padMs) {
  const removedIds = removed instanceof Set ? removed : new Set(removed);
  const trimsById = trims instanceof Map ? trims : new Map(trims.map((trim) => [trim.pauseId, trim.keepMs]));

  const tokensByClip = new Map();
  tokens.forEach((token) => {
    if (!tokensByClip.has(token.clipId)) tokensByClip.set(token.clipId, []);
    tokensByClip.get(token.clipId).push(token);
  });

  const cuts = [];
  const keepSegments = [];
  let editedMs = 0;
  let timelineMs = 0;

  timelineSpans(clips, timeline).forEach(({ clipId, ready, durationMs, timelineStartMs }) => {
    // Rule 8: a clip that is not READY is kept whole.
    const clipCuts = ready
      ? absorbTinyKeeps(planClipCuts(tokensByClip.get(clipId) ?? [], removedIds, trimsById, padMs, durationMs), durationMs)
      : [];

    const keep = (startMs, endMs) => {
      keepSegments.push({ clipId, startMs, endMs, timelineStartMs: timelineStartMs + startMs, editedStartMs: editedMs });
      editedMs += endMs - startMs;
    };

    let cursor = 0;
    clipCuts.forEach((cut) => {
      if (cut.startMs > cursor) keep(cursor, cut.startMs);
      cuts.push({
        clipId,
        startMs: cut.startMs,
        endMs: cut.endMs,
        timelineStartMs: timelineStartMs + cut.startMs,
        timelineEndMs: timelineStartMs + cut.endMs,
        kind: cut.kind,
        tokenIds: cut.tokenIds,
      });
      cursor = cut.endMs;
    });
    if (cursor < durationMs) keep(cursor, durationMs);
    timelineMs = timelineStartMs + durationMs;
  });

  return { cuts, keepSegments, editedMs, removedMs: timelineMs - editedMs, timelineMs };
}
