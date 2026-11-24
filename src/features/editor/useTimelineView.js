import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const MAX_PIXELS_PER_SECOND = 300;

export default function useTimelineView(timelineMs) {
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState({ pixelsPerSecond: 0, startMs: 0 }); // 0 means Fit
  const observer = useRef(null);
  const element = useRef(null);

  const trackRef = useCallback((node) => {
    observer.current?.disconnect();
    element.current = node;
    if (!node) return;
    observer.current = new ResizeObserver(() => setWidth(node.clientWidth));
    observer.current.observe(node);
    setWidth(node.clientWidth);
  }, []);

  useEffect(() => () => observer.current?.disconnect(), []);

  const totalMs = Math.max(timelineMs, 1);
  const fitPps = width ? width / (totalMs / 1000) : 1;

  const clampStart = useCallback((startMs, pixelsPerSecond) => {
    const spanMs = ((width || 1) / pixelsPerSecond) * 1000;
    return spanMs >= totalMs ? 0 : Math.min(Math.max(0, startMs), totalMs - spanMs);
  }, [width, totalMs]);

  const pixelsPerSecond = zoom.pixelsPerSecond || fitPps;
  const spanMs = ((width || 1) / pixelsPerSecond) * 1000;
  const startMs = zoom.pixelsPerSecond ? clampStart(zoom.startMs, pixelsPerSecond) : 0;

  // nextPps around atMs, which stays at fraction (0 to 1) of the width. At or below Fit the view is Fit again.
  const zoomTo = useCallback((nextPps, atMs, fraction) => {
    const limited = Math.min(MAX_PIXELS_PER_SECOND, Math.max(fitPps, nextPps));
    if (limited <= fitPps * 1.0001) {
      setZoom({ pixelsPerSecond: 0, startMs: 0 });
      return;
    }
    const nextSpanMs = ((width || 1) / limited) * 1000;
    setZoom({ pixelsPerSecond: limited, startMs: clampStart(atMs - fraction * nextSpanMs, limited) });
  }, [fitPps, width, clampStart]);

  const panBy = useCallback((deltaMs) => {
    setZoom((current) => (current.pixelsPerSecond
      ? { ...current, startMs: clampStart(current.startMs + deltaMs, current.pixelsPerSecond) }
      : current));
  }, [clampStart]);

  // Brings a moment into view when zoomed: 'page' puts it 10 % from the left (playback), 'centre' in the middle.
  const reveal = useCallback((atMs, placement) => {
    setZoom((current) => {
      if (!current.pixelsPerSecond) return current;
      const currentSpanMs = ((width || 1) / current.pixelsPerSecond) * 1000;
      const offset = placement === 'page' ? 0.1 * currentSpanMs : currentSpanMs / 2;
      return { ...current, startMs: clampStart(atMs - offset, current.pixelsPerSecond) };
    });
  }, [width, clampStart]);

  return useMemo(() => ({
    trackRef,
    element,
    width,
    fit: !zoom.pixelsPerSecond,
    fitPixelsPerSecond: fitPps,
    pixelsPerSecond,
    startMs,
    spanMs,
    percentAt: (ms) => ((ms - startMs) / spanMs) * 100,
    timeAt: (clientX) => {
      const box = element.current?.getBoundingClientRect();
      if (!box?.width) return 0;
      return startMs + Math.min(1, Math.max(0, (clientX - box.left) / box.width)) * spanMs;
    },
    zoomTo,
    panBy,
    reveal,
  }), [trackRef, width, zoom.pixelsPerSecond, fitPps, pixelsPerSecond, startMs, spanMs, zoomTo, panBy, reveal]);
}
