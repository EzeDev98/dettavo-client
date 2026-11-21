import { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '@shared/utils/classNames.js';
import { formatClock, formatTimecode } from '@shared/utils/formatting.js';
import { clipName } from './clipStatus.js';
import { currentClipDrag, endClipDrag, startClipDrag } from './clipDrag.js';
import { useEditor } from './editorContext.js';
import { usePlayer, usePlayerClock } from './playerContext.js';
import { drawnStretches, drawTimeline, timelinePieces } from './timelineDrawing.js';
import useTimelineMedia from './timelineMediaApi.js';

// Ruler steps (guide 8.8): labels stay at least 64 px apart; minor ticks use the next smaller step when 6 px apart.
const RULER_STEPS_MS = [100, 500, 1000, 5000, 10_000, 30_000, 60_000, 300_000];
const LABEL_SPACING_PX = 64;
const TICK_SPACING_PX = 6;
// Zooming with ⌘-scroll or a pinch: how much one wheel unit zooms (prototype).
const WHEEL_ZOOM = 0.01;

// The ruler (Build Plan 16c, prototype ruler()): a minor tick each step, a major tick with a label each larger step.
function TimelineRuler({ view, hidden }) {
  const ticks = useMemo(() => {
    const { pixelsPerSecond, startMs, spanMs } = view;
    const pxPerMs = pixelsPerSecond / 1000;
    const major = RULER_STEPS_MS.find((step) => step * pxPerMs >= LABEL_SPACING_PX) ?? RULER_STEPS_MS[RULER_STEPS_MS.length - 1];
    const minor = RULER_STEPS_MS[RULER_STEPS_MS.indexOf(major) - 1];
    const endMs = startMs + spanMs;
    const list = [];
    const add = (step, isMajor) => {
      for (let value = Math.ceil(startMs / step) * step; value <= endMs; value += step) {
        if (!isMajor && value % major === 0) continue;
        list.push({ value, major: isMajor });
      }
    };
    if (minor && minor * pxPerMs >= TICK_SPACING_PX) add(minor, false);
    add(major, true);
    return { list, labelOf: (value) => (major < 1000 ? formatTimecode(value) : formatClock(value)) };
  }, [view]);

  return (
    <div className={cx('timeline-ruler', hidden && 'timeline-ruler--hidden')} aria-hidden="true">
      {ticks.list.map(({ value, major }) => (
        <span key={`${major ? 'major' : 'minor'}-${value}`}>
          <i
            className={cx('timeline-ruler__tick', major && 'timeline-ruler__tick--major')}
            style={{ left: `${view.percentAt(value)}%` }}
          />
          {major && (
            <b className="timeline-ruler__label" style={{ left: `${view.percentAt(value)}%` }}>{ticks.labelOf(value)}</b>
          )}
        </span>
      ))}
    </div>
  );
}

// The timeline (Build Plan 16a, 16b, 16d, 16f; prototype 5b and 5c, laid out like CapCut): the ruler, then one block
// per timeline clip, end to end, showing its filmstrip and waveform, with the selection band on top. The playhead runs
// down through the ruler and the track; pressing on the ruler, on empty track or on the playhead's handle and dragging
// scrubs. A clip is divided into pieces at its splits (⌘B or Split); clicking a piece selects it, and Delete cuts it
// out. ⌘-scroll or a pinch zooms around the pointer; a sideways scroll pans when zoomed. Blocks are dragged to reorder
// them or onto the tray to take them off; a ready tile dropped on the track goes where the accent line shows.
// axis (timelineAxis): everything is drawn in its time. Edited (Skip cuts on): a cut takes no space, so each block is
// as long as what is kept of its clip. Timeline time (Skip cuts off): blocks at full length with the cuts over them.
export function Timeline({ projectId, view, axis, waveGain = 1 }) {
  const { state, dispatch, spans, plan } = useEditor();
  const { engine, playing } = usePlayer();
  const media = useTimelineMedia(projectId, state.clips, state.timeline);
  const [insertAt, setInsertAt] = useState(null);
  const [draggingClipId, setDraggingClipId] = useState(null);
  const canvasRef = useRef(null);
  const playheadRef = useRef(null);
  const scrubbing = useRef(false);
  const latest = useRef({ view, playing, axis });
  const lastTime = useRef(null);

  useEffect(() => {
    latest.current = { view, playing, axis };
  });

  const names = useMemo(() => new Map(state.clips.map((clip) => [clip.id, clipName(clip)])), [state.clips]);
  const stretches = useMemo(() => drawnStretches(plan, spans, axis.edited), [plan, spans, axis.edited]);
  const pieces = useMemo(() => timelinePieces(spans, state.splits), [spans, state.splits]);
  const empty = spans.length === 0;
  const { tokens, selection, pieceSelection } = state;

  // The filmstrips and waveforms follow every zoom, pan, resize and edit; drawing them is cheap.
  useEffect(() => {
    if (canvasRef.current) drawTimeline(canvasRef.current, view, stretches, media, waveGain);
  });

  const visible = (startMs, endMs) => endMs > view.startMs && startMs < view.startMs + view.spanMs;

  // The playhead moves every frame outside React. While playing, a zoomed view pages forward once it passes 90 % of
  // the width; any other move to a time out of view (a seek from the transcript) centres the view on it.
  const placePlayhead = (now, current) => {
    const fraction = (now - current.startMs) / current.spanMs;
    const element = playheadRef.current;
    if (element) {
      element.style.display = fraction < 0 || fraction > 1 ? 'none' : 'block';
      element.style.transform = `translateX(${fraction * current.width}px)`;
    }
    return fraction;
  };

  // A zoom, a pan, a resize or a change of axis moves the playhead too.
  useEffect(() => {
    placePlayhead(axis.toAxis(engine.timeMs), view);
  });

  usePlayerClock((now) => {
    const { view: current, playing: isPlaying, axis: currentAxis } = latest.current;
    const at = currentAxis.toAxis(now);
    const fraction = placePlayhead(at, current);
    const moved = now !== lastTime.current;
    lastTime.current = now;
    if (current.fit || !moved) return;
    if (isPlaying && (fraction > 0.9 || fraction < 0)) current.reveal(at, 'page');
    else if (!isPlaying && (fraction > 1 || fraction < 0)) current.reveal(at, 'centre');
  });

  // Wheel and pinch need a listener that is not passive, so they can stop the page from scrolling.
  useEffect(() => {
    const element = view.element.current;
    if (!element) return undefined;
    const onWheel = (event) => {
      const { view: current } = latest.current;
      const box = element.getBoundingClientRect();
      const fraction = box.width ? (event.clientX - box.left) / box.width : 0;
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        current.zoomTo(current.pixelsPerSecond * Math.exp(-event.deltaY * WHEEL_ZOOM), current.startMs + fraction * current.spanMs, fraction);
        return;
      }
      if (current.fit) return;
      const deltaX = event.shiftKey ? (event.deltaY || event.deltaX) : event.deltaX;
      if (!deltaX) return;
      event.preventDefault();
      current.panBy((deltaX / box.width) * current.spanMs);
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [view.element]);

  // Scrubbing: press seeks, dragging keeps seeking, across clip joins too. A press on a block may also start a drag.
  useEffect(() => {
    const onMove = (event) => {
      const { view: current, axis: currentAxis } = latest.current;
      if (scrubbing.current) engine.seek(currentAxis.fromAxis(current.timeAt(event.clientX)));
    };
    const onUp = () => {
      scrubbing.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [engine]);

  // A drag that ends anywhere (dropped elsewhere, or cancelled) clears the marker.
  useEffect(() => {
    const onDragEnd = () => {
      setInsertAt(null);
      setDraggingClipId(null);
      endClipDrag();
    };
    window.addEventListener('dragend', onDragEnd);
    return () => window.removeEventListener('dragend', onDragEnd);
  }, []);

  // A press on a block is left to it (a click selects a piece, a drag moves the clip); anywhere else it scrubs, and
  // playback stops until Play is pressed again.
  const onMouseDown = (event) => {
    if (event.button !== 0 || empty || event.target.closest('.timeline-block')) return;
    event.preventDefault();
    scrubbing.current = true;
    engine.pause();
    engine.seek(axis.fromAxis(view.timeAt(event.clientX)));
  };

  const isSelected = (piece) => pieceSelection?.clipId === piece.clipId
    && pieceSelection.startMs === piece.startMs && pieceSelection.endMs === piece.endMs;

  // Each timeline clip where it is drawn: { span, startMs, endMs } in the axis's time.
  const blocks = spans.map((span) => ({ span, startMs: axis.toAxis(span.timelineStartMs), endMs: axis.toAxis(span.timelineEndMs) }));

  // Where a dropped clip lands: before the first other clip whose middle is right of the pointer (prototype insAt).
  const insertionIndex = (event, clipId) => {
    const atMs = view.timeAt(event.clientX);
    return blocks.filter(({ span, startMs, endMs }) => span.clipId !== clipId && (startMs + endMs) / 2 < atMs).length;
  };

  const onDragOver = (event) => {
    const drag = currentClipDrag();
    if (!drag) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setInsertAt(insertionIndex(event, drag.clipId));
  };

  const onDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setInsertAt(null);
  };

  const onDrop = (event) => {
    const drag = currentClipDrag();
    if (!drag) return;
    event.preventDefault();
    const timeline = state.timeline.filter((clipId) => clipId !== drag.clipId);
    timeline.splice(insertionIndex(event, drag.clipId), 0, drag.clipId);
    dispatch({ type: 'setTimeline', timeline });
    setInsertAt(null);
    endClipDrag();
  };

  const onBlockDragStart = (event, clipId) => {
    scrubbing.current = false;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', names.get(clipId) ?? clipId);
    startClipDrag({ clipId, from: 'timeline' });
    setDraggingClipId(clipId);
  };

  // The accent line: at the start of the clip it would go before, or at the end of the timeline.
  let markerMs = null;
  if (insertAt !== null) {
    const drag = currentClipDrag();
    const rest = blocks.filter(({ span }) => span.clipId !== drag?.clipId);
    markerMs = insertAt < rest.length ? rest[insertAt].startMs : axis.totalMs;
  }

  // A selection that lies wholly inside cuts takes no space in edited time, so it has no band.
  const band = selection
    ? { startMs: axis.toAxis(tokens[selection.first].timelineStartMs), endMs: axis.toAxis(tokens[selection.last].timelineEndMs) }
    : null;

  return (
    <div className="timeline" onMouseDown={onMouseDown}>
      <TimelineRuler view={view} hidden={empty} />
      <div
        ref={view.trackRef}
        className="timeline-track"
        tabIndex={0}
        aria-label="Timeline"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <canvas ref={canvasRef} className="timeline-canvas" aria-hidden="true" />

        {blocks.filter(({ startMs, endMs }) => endMs > startMs && visible(startMs, endMs)).map(({ span, startMs, endMs }) => (
          <div
            key={span.clipId}
            className={cx('timeline-block', draggingClipId === span.clipId && 'timeline-block--dragging')}
            draggable
            onDragStart={(event) => onBlockDragStart(event, span.clipId)}
            style={{ left: `${view.percentAt(startMs)}%`, width: `${((endMs - startMs) / view.spanMs) * 100}%` }}
          >
            {pieces.filter((piece) => piece.clipId === span.clipId).map((piece) => {
              const pieceStartMs = axis.toAxis(piece.timelineStartMs);
              const pieceEndMs = axis.toAxis(piece.timelineEndMs);
              if (pieceEndMs <= pieceStartMs) return null;
              return (
                <div
                  key={piece.startMs}
                  className={cx('timeline-piece', isSelected(piece) && 'timeline-piece--selected')}
                  style={{
                    left: `${((pieceStartMs - startMs) / (endMs - startMs)) * 100}%`,
                    width: `${((pieceEndMs - pieceStartMs) / (endMs - startMs)) * 100}%`,
                  }}
                  onClick={() => dispatch({
                    type: 'selectPiece',
                    piece: { clipId: piece.clipId, startMs: piece.startMs, endMs: piece.endMs },
                  })}
                />
              );
            })}
            <b className="timeline-block__name">
              {names.get(span.clipId)} · {formatTimecode(endMs - startMs)}
            </b>
          </div>
        ))}

        {!axis.edited && plan.cuts.filter((cut) => visible(cut.timelineStartMs, cut.timelineEndMs)).map((cut) => (
          <div
            key={`${cut.clipId}-${cut.startMs}`}
            className="timeline-cut"
            style={{
              left: `${view.percentAt(cut.timelineStartMs)}%`,
              width: `${((cut.timelineEndMs - cut.timelineStartMs) / view.spanMs) * 100}%`,
            }}
          />
        ))}

        {band && band.endMs > band.startMs && (
          <div
            className="timeline-band"
            style={{ left: `${view.percentAt(band.startMs)}%`, width: `${((band.endMs - band.startMs) / view.spanMs) * 100}%` }}
          />
        )}

        {markerMs !== null && <div className="timeline-marker" style={{ left: `${view.percentAt(markerMs)}%` }} />}

        {empty && <p className="timeline-track__hint">Drag a ready clip from the tray onto the timeline</p>}
      </div>

      {!empty && (
        <div ref={playheadRef} className="timeline-playhead">
          <span className="timeline-playhead__handle" />
        </div>
      )}
    </div>
  );
}
