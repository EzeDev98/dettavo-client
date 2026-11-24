import { readTokenMs } from '@shared/utils/cssTime.js';

const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

export const isReducedMotion = () => reducedQuery.matches;

// 'fast' | 'base' | 'fly' | 'reveal' read --motion-<name>. A number is used as milliseconds.
const toMs = (duration) => (typeof duration === 'number' ? duration : readTokenMs(`--motion-${duration}`));

// 'standard' | 'out' read --ease-<name>. Anything else (for example 'linear') is passed through as written.
const toEasing = (ease) =>
  ease === 'standard' || ease === 'out'
    ? getComputedStyle(document.documentElement).getPropertyValue(`--ease-${ease}`).trim()
    : ease;

export function run(el, frames, { duration = 'base', ease = 'out', delay = 0, fill = 'none' } = {}) {
  let keyframes = frames;
  let ms = toMs(duration);
  let wait = delay;

  if (isReducedMotion()) {
    const from = frames[0].opacity ?? 1;
    const to = frames[frames.length - 1].opacity ?? 1;
    keyframes = [{ opacity: from }, { opacity: to }];
    ms = readTokenMs('--motion-reduced');
    wait = 0;
  }

  return el.animate(keyframes, { duration: ms, easing: toEasing(ease), delay: wait, fill }).finished.catch(() => {});
}
