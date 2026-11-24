import { timelineSpans } from './tokens.js';

export const MIN_KEEP_SEGMENT_MS = 20;

// The middle of a pause: the furthest a cut's padding may reach into a kept pause, so it never touches a kept word.
const midpoint = (token) => token.startMs + Math.floor((token.endMs - token.startMs) / 2);

function planClipCuts(tokens, removed, trims, padMs, durationMs) {
  const isRemoved = (index) => {
    const token = tokens[index];
    if (removed.has(token.id)) return true;
    return token.kind === 'pause' && index > 0 && index < tokens.length - 1
      && removed.has(tokens[index - 1].id) && removed.has(tokens[index + 1].id);
  };

  const cuts = [];
  let run = null;

  const closeRun = () => {
    if (!run) return;
    let { startMs, endMs } = run;
    if (run.hasWord) {
      startMs = run.before && run.firstIsWord ? Math.max(midpoint(run.before), startMs - padMs) : startMs + padMs;
      endMs = run.after && run.lastIsWord ? Math.min(midpoint(run.after), endMs + padMs) : endMs - padMs;
    }
    cuts.push({ startMs, endMs, kind: 'REMOVE', tokenIds: run.tokenIds, rangeCutIds: [] });
    run = null;
  };

  tokens.forEach((token, index) => {
    if (isRemoved(index)) {
      if (!run) {
        run = { startMs: token.startMs, hasWord: false, tokenIds: [], firstIsWord: token.kind === 'word', before: tokens[index - 1] };
      }
      run.endMs = token.endMs;
      run.hasWord = run.hasWord || token.kind === 'word';
      run.lastIsWord = token.kind === 'word';
      run.after = tokens[index + 1];
      run.tokenIds.push(token.id);
      return;
    }
    closeRun();
    const keepMs = token.kind === 'pause' ? trims.get(token.id) : undefined;
    if (keepMs !== undefined && token.endMs - token.startMs > keepMs) {
      // keepMs is split between the two sides; an odd millisecond stays after the cut.
      const before = Math.floor(keepMs / 2);
      cuts.push({ startMs: token.startMs + before, endMs: token.endMs - (keepMs - before), kind: 'TRIM', tokenIds: [token.id], rangeCutIds: [] });
    }
  });
  closeRun();

  return cuts
    .map((cut) => ({ ...cut, startMs: Math.max(0, cut.startMs), endMs: Math.min(durationMs, cut.endMs) }))
    .filter((cut) => cut.endMs > cut.startMs);
}

function planRangeCuts(rangeCuts, tokens, durationMs) {
  return rangeCuts
    .map((rangeCut) => ({ ...rangeCut, startMs: Math.max(0, rangeCut.startMs), endMs: Math.min(durationMs, rangeCut.endMs) }))
    .filter((rangeCut) => rangeCut.endMs > rangeCut.startMs)
    .map((rangeCut) => ({
      startMs: rangeCut.startMs,
      endMs: rangeCut.endMs,
      kind: rangeCut.kind,
      tokenIds: tokens.filter((token) => token.startMs >= rangeCut.startMs && token.endMs <= rangeCut.endMs).map((token) => token.id),
      rangeCutIds: [rangeCut.id],
    }));
}

function absorbTinyKeeps(cuts, durationMs) {
  const merged = [];
  [...cuts]
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs)
    .forEach((cut) => {
      const last = merged[merged.length - 1];
      if (last && cut.startMs - last.endMs < MIN_KEEP_SEGMENT_MS) {
        last.endMs = Math.max(last.endMs, cut.endMs);
        last.kind = last.kind === cut.kind ? last.kind : 'REMOVE';
        last.tokenIds = [...last.tokenIds, ...cut.tokenIds];
        last.rangeCutIds = [...last.rangeCutIds, ...cut.rangeCutIds];
      } else {
        merged.push({ ...cut, tokenIds: [...cut.tokenIds], rangeCutIds: [...cut.rangeCutIds] });
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

export function editPlan(tokens, timeline, clips, removed, trims, padMs, rangeCuts = []) {
  const removedIds = removed instanceof Set ? removed : new Set(removed);
  const trimsById = trims instanceof Map ? trims : new Map(trims.map((trim) => [trim.pauseId, trim.keepMs]));

  const tokensByClip = new Map();
  tokens.forEach((token) => {
    if (!tokensByClip.has(token.clipId)) tokensByClip.set(token.clipId, []);
    tokensByClip.get(token.clipId).push(token);
  });
  const rangeCutsByClip = new Map();
  rangeCuts.forEach((rangeCut) => {
    if (!rangeCutsByClip.has(rangeCut.clipId)) rangeCutsByClip.set(rangeCut.clipId, []);
    rangeCutsByClip.get(rangeCut.clipId).push(rangeCut);
  });

  const cuts = [];
  const keepSegments = [];
  let editedMs = 0;
  let timelineMs = 0;

  timelineSpans(clips, timeline).forEach(({ clipId, ready, durationMs, timelineStartMs }) => {
    const clipTokens = ready ? tokensByClip.get(clipId) ?? [] : [];
    const clipCuts = absorbTinyKeeps([
      ...planClipCuts(clipTokens, removedIds, trimsById, padMs, durationMs),
      ...planRangeCuts(rangeCutsByClip.get(clipId) ?? [], clipTokens, durationMs),
    ], durationMs);

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
        rangeCutIds: cut.rangeCutIds,
      });
      cursor = cut.endMs;
    });
    if (cursor < durationMs) keep(cursor, durationMs);
    timelineMs = timelineStartMs + durationMs;
  });

  return { cuts, keepSegments, editedMs, removedMs: timelineMs - editedMs, timelineMs };
}
