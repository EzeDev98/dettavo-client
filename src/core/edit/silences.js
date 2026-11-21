// Silences found in the audio itself (a clip's levels from GET .../media/levels), not in the gaps between whisper's
// words: whisper often stretches a word over the silence after it, so a long silence can show as a short pause. Pure,
// no React. The silences become SILENCE range cuts (rule 9), so export cuts exactly what the preview skips.

// Levels are 0 (-60 dB) to 255 (0 dB): one dB is 255 / 60 steps.
const STEPS_PER_DB = 255 / 60;
// The quiet threshold sits this share of the way from the noise floor (10th percentile) to speech (90th percentile),
// and at least MIN_MARGIN_DB above the floor, so a quiet room is never taken for speech.
const FLOOR_PERCENTILE = 0.1;
const SPEECH_PERCENTILE = 0.9;
const QUIET_SHARE = 0.3;
const MIN_MARGIN_DB = 6;
// A sound shorter than this inside a silence (a click, a breath) does not end it.
const MIN_SOUND_MS = 60;

// The level at a percentile (0 to 1), from a histogram of the 256 possible levels.
function percentile(levels, fraction) {
  const counts = new Uint32Array(256);
  levels.forEach((level) => {
    counts[level] += 1;
  });
  const target = fraction * (levels.length - 1);
  let seen = 0;
  for (let level = 0; level < 256; level += 1) {
    seen += counts[level];
    if (seen > target) return level;
  }
  return 255;
}

// Thresholds already worked out, per levels array: the timeline asks on every redraw.
const thresholds = new WeakMap();
const waveRanges = new WeakMap();

// The waveform's range: base sits just above the noise floor, so every sound louder than the room gets a bar (soft
// words and word endings too) while true silence stays flat; top is the clip's loudest frame, so its loudest moment
// fills the height whatever the recording's volume. Drawing only, not silence finding: that keeps quietThreshold.
const WAVE_MARGIN_DB = 3;
export function waveformRange(levels) {
  if (!waveRanges.has(levels)) {
    const base = Math.min(254, percentile(levels, FLOOR_PERCENTILE) + WAVE_MARGIN_DB * STEPS_PER_DB);
    const top = Math.max(base + 1, percentile(levels, 1));
    waveRanges.set(levels, { base, top });
  }
  return waveRanges.get(levels);
}

// The level below which a frame counts as quiet. The waveform draws nothing below it, and silences are found under it.
export function quietThreshold(levels) {
  if (!thresholds.has(levels)) {
    const floor = percentile(levels, FLOOR_PERCENTILE);
    const speech = percentile(levels, SPEECH_PERCENTILE);
    thresholds.set(levels, Math.max(floor + MIN_MARGIN_DB * STEPS_PER_DB, floor + (speech - floor) * QUIET_SHARE));
  }
  return thresholds.get(levels);
}

// Every quiet stretch of one clip, in clip time: [{ startMs, endMs }]. levels spread evenly over durationMs.
export function quietStretches(levels, durationMs) {
  if (!levels?.length || !durationMs) return [];
  const frameMs = durationMs / levels.length;
  const minSoundFrames = Math.max(1, Math.round(MIN_SOUND_MS / frameMs));
  const threshold = quietThreshold(levels);
  const stretches = [];
  let quietStart = -1;
  let soundStart = -1;

  for (let frame = 0; frame < levels.length; frame += 1) {
    if (levels[frame] < threshold) {
      if (quietStart < 0) quietStart = frame;
      soundStart = -1;
    } else if (quietStart >= 0) {
      if (soundStart < 0) soundStart = frame;
      if (frame - soundStart + 1 >= minSoundFrames) {
        stretches.push({ startMs: quietStart * frameMs, endMs: soundStart * frameMs });
        quietStart = -1;
        soundStart = -1;
      }
    }
  }
  if (quietStart >= 0) stretches.push({ startMs: quietStart * frameMs, endMs: durationMs });
  return stretches;
}

// The silences of every timeline clip whose levels have arrived. spans from timelineSpans; media from
// useTimelineMedia. A silence longer than longerThanMs is shortened to keepMs, centred like a trimmed pause (rule 3):
// keepMs is split between its two sides, an odd millisecond after the cut. Returns { cuts: [{ clipId, startMs,
// endMs }], silentMs (all silence, cut or not), count (silences over longerThanMs), ready (every clip's levels are in) }.
export function silenceCuts(spans, media, longerThanMs, keepMs) {
  const cuts = [];
  let silentMs = 0;
  let ready = true;
  spans.forEach(({ clipId }) => {
    const clip = media.get(clipId);
    if (!clip?.levels) {
      ready = false;
      return;
    }
    quietStretches(clip.levels, clip.durationMs).forEach(({ startMs, endMs }) => {
      silentMs += endMs - startMs;
      if (endMs - startMs <= longerThanMs) return;
      const before = Math.floor(keepMs / 2);
      cuts.push({ clipId, startMs: Math.round(startMs + before), endMs: Math.round(endMs - (keepMs - before)) });
    });
  });
  const kept = cuts.filter((cut) => cut.endMs > cut.startMs);
  return { cuts: kept, silentMs, count: kept.length, ready };
}

// Whether the SILENCE range cuts are exactly these cuts, so applying them again would change nothing.
export function silencesApplied(rangeCuts, cuts) {
  const applied = rangeCuts.filter((rangeCut) => rangeCut.kind === 'SILENCE');
  if (applied.length !== cuts.length) return false;
  const keys = new Set(applied.map((rangeCut) => `${rangeCut.clipId}:${rangeCut.startMs}:${rangeCut.endMs}`));
  return cuts.every((cut) => keys.has(`${cut.clipId}:${cut.startMs}:${cut.endMs}`));
}

// Sound frames worked out per levels array: prefix[i] is how many frames before frame i are sound, counting only runs
// of at least MIN_SOUND_MS at or over the quiet threshold, so a click is not sound.
const soundPrefixes = new WeakMap();
function soundPrefix(levels, frameMs) {
  if (!soundPrefixes.has(levels)) {
    const threshold = quietThreshold(levels);
    const minRun = Math.max(1, Math.round(MIN_SOUND_MS / frameMs));
    const sound = new Uint8Array(levels.length);
    let runStart = -1;
    for (let frame = 0; frame <= levels.length; frame += 1) {
      const loud = frame < levels.length && levels[frame] >= threshold;
      if (loud && runStart < 0) runStart = frame;
      if (!loud && runStart >= 0) {
        if (frame - runStart >= minRun) sound.fill(1, runStart, frame);
        runStart = -1;
      }
    }
    const prefix = new Uint32Array(levels.length + 1);
    for (let frame = 0; frame < levels.length; frame += 1) prefix[frame + 1] = prefix[frame] + sound[frame];
    soundPrefixes.set(levels, prefix);
  }
  return soundPrefixes.get(levels);
}

// How many milliseconds of sound a clip has between startMs and endMs (clip time). levels spread evenly over durationMs.
export function soundMs(levels, durationMs, startMs, endMs) {
  if (!levels?.length || !durationMs || endMs <= startMs) return 0;
  const frameMs = durationMs / levels.length;
  const prefix = soundPrefix(levels, frameMs);
  const first = Math.min(levels.length, Math.max(0, Math.floor(startMs / frameMs)));
  const last = Math.min(levels.length, Math.max(first, Math.ceil(endMs / frameMs)));
  return (prefix[last] - prefix[first]) * frameMs;
}
