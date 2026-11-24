const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Timeline time to { clipId, clipMs }, or null for an empty timeline. The very end belongs to the last clip.
export function timelineToClip(spans, timelineMs) {
  if (!spans.length) return null;
  const time = clamp(timelineMs, 0, spans[spans.length - 1].timelineEndMs);
  const span = spans.find((candidate) => time < candidate.timelineEndMs) ?? spans[spans.length - 1];
  return { clipId: span.clipId, clipMs: time - span.timelineStartMs };
}

// Clip time to timeline time, or null if the clip is not on the timeline.
export function clipToTimeline(spans, clipId, clipMs) {
  const span = spans.find((candidate) => candidate.clipId === clipId);
  return span ? span.timelineStartMs + clamp(clipMs, 0, span.durationMs) : null;
}

// Timeline time to edited time: the length of every cut before it, in its clip and in every earlier timeline clip,
// is taken off. A time inside a cut maps to the point where the cut joins.
export function timelineToEdited(plan, timelineMs) {
  const time = clamp(timelineMs, 0, plan.timelineMs);
  let cutBefore = 0;
  for (const cut of plan.cuts) {
    if (cut.timelineStartMs >= time) break;
    cutBefore += Math.min(time, cut.timelineEndMs) - cut.timelineStartMs;
  }
  return time - cutBefore;
}

// Source (clip) time to edited time, or null if the clip is not on the timeline.
export function clipToEdited(plan, spans, clipId, clipMs) {
  const timelineMs = clipToTimeline(spans, clipId, clipMs);
  return timelineMs === null ? null : timelineToEdited(plan, timelineMs);
}

// The token playing at a timeline time: its index, or -1 past the end. Tokens are in timeline order, so a binary
// search.
export function tokenIndexAt(tokens, timelineMs) {
  let low = 0;
  let high = tokens.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const token = tokens[middle];
    if (timelineMs < token.timelineStartMs) high = middle - 1;
    else if (timelineMs >= token.timelineEndMs) low = middle + 1;
    else return middle;
  }
  return -1;
}

// The time the timeline is drawn in. With Skip cuts on it is edited time: cut parts take no space, so the timeline is
// as long as what plays and exports. With Skip cuts off it is timeline time, with the cuts drawn over it.
// Returns { edited, totalMs, toAxis(timelineMs), fromAxis(axisMs) -> timelineMs }. fromAxis never lands inside a cut.
export function timelineAxis(plan, skipCuts) {
  if (!skipCuts) {
    return { edited: false, totalMs: plan.timelineMs, toAxis: (timelineMs) => timelineMs, fromAxis: (axisMs) => axisMs };
  }
  return {
    edited: true,
    totalMs: plan.editedMs,
    toAxis: (timelineMs) => timelineToEdited(plan, timelineMs),
    fromAxis: (axisMs) => editedToTimeline(plan, axisMs)?.timelineMs ?? 0,
  };
}

// Edited time back to { clipId, clipMs, timelineMs }: always a kept moment, never inside a cut. null when nothing is
// kept. The very end belongs to the last keep segment.
export function editedToTimeline(plan, editedMs) {
  const segments = plan.keepSegments;
  if (!segments.length) return null;
  const time = clamp(editedMs, 0, plan.editedMs);
  const segment = segments.find((candidate) => time < candidate.editedStartMs + (candidate.endMs - candidate.startMs))
    ?? segments[segments.length - 1];
  const clipMs = segment.startMs + (time - segment.editedStartMs);
  return { clipId: segment.clipId, clipMs, timelineMs: segment.timelineStartMs + (clipMs - segment.startMs) };
}
