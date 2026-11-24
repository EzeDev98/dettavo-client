import { waveformRange } from '@core/edit/silences.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function timelinePieces(spans, splits) {
  const byClip = new Map();
  splits.forEach(({ clipId, atMs }) => {
    if (!byClip.has(clipId)) byClip.set(clipId, []);
    byClip.get(clipId).push(atMs);
  });
  const pieces = [];
  spans.forEach(({ clipId, durationMs, timelineStartMs }) => {
    const points = [...new Set(byClip.get(clipId) ?? [])]
      .filter((atMs) => atMs > 0 && atMs < durationMs)
      .sort((a, b) => a - b);
    const edges = [0, ...points, durationMs];
    for (let index = 0; index + 1 < edges.length; index += 1) {
      const startMs = edges[index];
      const endMs = edges[index + 1];
      pieces.push({ clipId, startMs, endMs, timelineStartMs: timelineStartMs + startMs, timelineEndMs: timelineStartMs + endMs });
    }
  });
  return pieces;
}

export function drawnStretches(plan, spans, edited) {
  if (edited) {
    return plan.keepSegments.map((segment) => ({
      clipId: segment.clipId,
      startMs: segment.startMs,
      endMs: segment.endMs,
      axisStartMs: segment.editedStartMs,
    }));
  }
  return spans.map((span) => ({ clipId: span.clipId, startMs: 0, endMs: span.durationMs, axisStartMs: span.timelineStartMs }));
}

const cssNumber = (styles, name) => {
  const value = Number.parseFloat(styles.getPropertyValue(name));
  return Number.isFinite(value) ? value : 0;
};

// Draws every stretch that is in view. view: from useTimelineView (startMs, spanMs). media: from useTimelineMedia.
export function drawTimeline(canvas, view, stretches, media, gain = 1) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const ratio = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  if (!width || !height || !view.spanMs) return;

  const styles = getComputedStyle(canvas);
  const filmHeight = cssNumber(styles, '--timeline-film-height');
  const labelHeight = cssNumber(styles, '--timeline-label-height');
  const waveColor = styles.getPropertyValue('--color-waveform').trim();
  const bar = { width: cssNumber(styles, '--waveform-bar-width'), gap: cssNumber(styles, '--waveform-bar-gap') };
  const clipColor = styles.getPropertyValue('--color-clip').trim();
  const pxPerMs = width / view.spanMs;

  stretches.forEach((stretch) => {
    const x0 = (stretch.axisStartMs - view.startMs) * pxPerMs;
    const x1 = x0 + (stretch.endMs - stretch.startMs) * pxPerMs;
    if (x1 <= 0 || x0 >= width || x1 - x0 < 0.5) return;
    const clip = media.get(stretch.clipId);
    if (!clip) return;

    context.save();
    context.beginPath();
    context.rect(x0, 0, x1 - x0, height);
    context.clip();
    context.fillStyle = clipColor;
    context.fillRect(x0, 0, x1 - x0, height);

    const waveTop = clip.video ? filmHeight : labelHeight;
    if (clip.filmstrip && clip.image) drawFilmstrip(context, clip, stretch, x0, x1, width, filmHeight, pxPerMs);
    if (clip.levels?.length) {
      context.fillStyle = waveColor;
      drawWaveform(context, clip, stretch, x0, x1, width, waveTop, height, pxPerMs, bar, gain);
    }
    context.restore();
  });
}

// Tiles start at the stretch's left edge, each showing the frame at its middle.
function drawFilmstrip(context, clip, stretch, x0, x1, width, filmHeight, pxPerMs) {
  const { filmstrip, image } = clip;
  const tileWidth = (filmstrip.tileWidth * filmHeight) / filmstrip.tileHeight;
  const first = x0 + Math.max(0, Math.floor(-x0 / tileWidth)) * tileWidth;
  for (let x = first; x < Math.min(x1, width); x += tileWidth) {
    const atMs = stretch.startMs + (x - x0 + tileWidth / 2) / pxPerMs;
    const frame = clamp(Math.floor(atMs / filmstrip.intervalMs), 0, filmstrip.count - 1);
    const sourceX = (frame % filmstrip.columns) * filmstrip.tileWidth;
    const sourceY = Math.floor(frame / filmstrip.columns) * filmstrip.tileHeight;
    context.drawImage(image, sourceX, sourceY, filmstrip.tileWidth, filmstrip.tileHeight, x, 0, tileWidth, filmHeight);
  }
}

function drawWaveform(context, clip, stretch, x0, x1, width, top, bottom, pxPerMs, bar, gain) {
  const { levels, durationMs } = clip;
  if (!durationMs) return;
  const frameMs = durationMs / levels.length;
  const { base, top: loudest } = waveformRange(levels);
  const room = Math.max(0, bottom - top - 1);
  const step = Math.max(1, bar.width + bar.gap);
  const first = x0 + Math.max(0, Math.floor(-x0 / step)) * step;
  for (let x = first; x < Math.min(x1, width); x += step) {
    const fromMs = stretch.startMs + (x - x0) / pxPerMs;
    const toMs = fromMs + step / pxPerMs;
    const firstFrame = clamp(Math.floor(fromMs / frameMs), 0, levels.length - 1);
    const lastFrame = clamp(Math.ceil(toMs / frameMs), firstFrame + 1, levels.length);
    let peak = 0;
    for (let frame = firstFrame; frame < lastFrame; frame += 1) if (levels[frame] > peak) peak = levels[frame];
    if (peak <= base) continue;
    const barHeight = Math.max(1, Math.min(1, (peak - base) / (loudest - base)) * room);
    context.fillRect(x, bottom - barHeight, Math.max(1, bar.width), barHeight);
  }
}
