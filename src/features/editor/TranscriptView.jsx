import { Fragment, memo, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cx } from '@shared/utils/classNames.js';
import { readTokenPx } from '@shared/utils/cssLength.js';
import { formatClock } from '@shared/utils/formatting.js';
import { tokenIndexAt } from '@core/edit/timeMap.js';
import { formatSeconds } from './pauses.js';
import { clipName } from './clipStatus.js';
import { useEditor } from './editorContext.js';
import { usePlayer, usePlayerClock } from './playerContext.js';
import useTimelineMedia from './timelineMediaApi.js';
import { shortenedPauses, speechInPauses, transcriptRows } from './transcriptRows.js';

const ESTIMATED_HEIGHTS = { divider: 22, paragraph: 112, state: 40, noSpeech: 40, allCut: 40 };
const OVERSCAN = 6;
const CURRENT = 'transcript-token--current';
const CHIP_MIN_MS = 300;

const DRAG_SCROLL_EDGE = 40;
const DRAG_SCROLL_MAX = 28;

const tokenIndexOfElement = (target) => {
  const element = target instanceof Element ? target.closest('[data-i]') : null;
  return element ? Number(element.dataset.i) : null;
};

function tokenIndexAtPoint(pane, x, y) {
  const box = pane.getBoundingClientRect();
  const px = Math.min(Math.max(x, box.left + 1), box.right - 1);
  const py = Math.min(Math.max(y, box.top + 1), box.bottom - 1);
  const target = document.elementFromPoint(px, py);
  if (!target || !pane.contains(target)) return null;
  const direct = tokenIndexOfElement(target);
  if (direct !== null) return direct;

  const row = target.closest('.transcript-view__row');
  if (!row) return null;
  let best = null;
  let bestScore = Infinity;
  row.querySelectorAll('[data-i]').forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (!rect.width) return; // a hidden short pause
    const onLine = py >= rect.top && py <= rect.bottom;
    const across = px < rect.left ? rect.left - px : px > rect.right ? px - rect.right : 0;
    const down = onLine ? 0 : Math.min(Math.abs(py - rect.top), Math.abs(py - rect.bottom));
    const score = down * 10_000 + across; // the line comes first, then the distance along it
    if (score < bestScore) {
      bestScore = score;
      best = Number(element.dataset.i);
    }
  });
  return best;
}

// Pixels to scroll this frame: negative above the pane, positive below it, 0 in between.
function edgeScroll(pane, y) {
  const box = pane.getBoundingClientRect();
  const speed = (depth) => Math.min(DRAG_SCROLL_MAX, Math.ceil((depth / DRAG_SCROLL_EDGE) * DRAG_SCROLL_MAX));
  if (y < box.top + DRAG_SCROLL_EDGE) return -speed(box.top + DRAG_SCROLL_EDGE - y);
  if (y > box.bottom - DRAG_SCROLL_EDGE) return speed(y - (box.bottom - DRAG_SCROLL_EDGE));
  return 0;
}

export default function TranscriptView({ statusByClip }) {
  const { state, dispatch, spans, plan, cutIds } = useEditor();
  const { tokens, selection, clips, trims, pauseThresholdMs } = state;
  const scrollRef = useRef(null);
  const drag = useRef({ anchor: null, focus: null, moved: false, x: 0, y: 0, frame: 0 });
  const current = useRef({ index: -1, element: null });
  const { playing } = usePlayer();
  const playingNow = useRef(playing);

  // Cut tokens leave the transcript at once; they are listed under Cuts, where Restore brings them back.
  const rows = useMemo(() => transcriptRows(tokens, spans, cutIds), [tokens, spans, cutIds]);
  // Pauses a silence or timeline cut shortens show what they keep, like a trimmed pause.
  const shortened = useMemo(() => shortenedPauses(tokens, plan.cuts), [tokens, plan.cuts]);
  const { projectId } = useParams();
  const media = useTimelineMedia(projectId, clips, state.timeline);
  const speechFound = speechInPauses(tokens, media);
  const speechRef = useRef(speechFound);
  if (!sameEntries(speechRef.current, speechFound)) speechRef.current = speechFound;
  const speech = speechRef.current;
  const names = useMemo(() => new Map(clips.map((clip) => [clip.id, clipName(clip)])), [clips]);
  const gutter = useMemo(() => readTokenPx('--gutter'), []);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => ESTIMATED_HEIGHTS[rows[index].kind],
    getItemKey: (index) => rows[index].key,
    overscan: OVERSCAN,
    paddingStart: gutter,
    paddingEnd: gutter,
  });

  useEffect(() => {
    playingNow.current = playing;
  });

  usePlayerClock((now) => {
    const found = tokenIndexAt(tokens, now);
    const index = found >= 0 && tokens[found].kind === 'word' ? found : -1;
    const marked = current.current;
    const changed = index !== marked.index;
    const lost = index >= 0 && !(marked.element?.isConnected && marked.element.classList.contains(CURRENT));
    if (!changed && !lost) return;

    marked.element?.classList.remove(CURRENT);
    const element = index >= 0 ? scrollRef.current?.querySelector(`[data-i="${index}"]`) ?? null : null;
    element?.classList.add(CURRENT);
    current.current = { index, element };

    if (changed && index >= 0 && playingNow.current) {
      if (element) {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        element.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
      } else {
        const row = rows.findIndex((candidate) => candidate.kind === 'paragraph' && candidate.first <= index && index <= candidate.last);
        if (row >= 0) virtualizer.scrollToIndex(row, { align: 'center' });
      }
    }
  });

  const dragFrame = () => {
    const pane = scrollRef.current;
    const active = drag.current;
    if (!pane || active.anchor === null) return;
    const step = edgeScroll(pane, active.y);
    if (step) pane.scrollTop += step;
    const index = tokenIndexAtPoint(pane, active.x, active.y);
    if (index !== null && index !== active.focus) {
      active.focus = index;
      if (index !== active.anchor) active.moved = true;
      dispatch({ type: 'select', anchor: active.anchor, focus: index });
    }
    active.frame = requestAnimationFrame(dragFrame);
  };

  useEffect(() => {
    const onMouseMove = (event) => {
      drag.current.x = event.clientX;
      drag.current.y = event.clientY;
    };
    const onMouseUp = () => {
      const { anchor, moved, frame } = drag.current;
      if (anchor === null) return;
      cancelAnimationFrame(frame);
      if (!moved) dispatch({ type: 'seek', timelineMs: tokens[anchor].timelineStartMs });
      drag.current = { anchor: null, focus: null, moved: false, x: 0, y: 0, frame: 0 };
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(drag.current.frame);
    };
  }, [dispatch, tokens]);

  const onMouseDown = (event) => {
    if (event.button !== 0) return;

    const inText = event.target instanceof Element && event.target.closest('.paragraph__text');
    const index =
      tokenIndexOfElement(event.target) ?? (inText ? tokenIndexAtPoint(scrollRef.current, event.clientX, event.clientY) : null);
    if (index === null) {
      if (!event.target.closest('[data-seek]')) dispatch({ type: 'clearSelection' });
      return;
    }
    event.preventDefault();
    // Shift-click or ⌘-click: the selection runs from its anchor to this token, in either direction.
    if ((event.shiftKey || event.metaKey) && selection) {
      dispatch({ type: 'select', anchor: selection.anchor, focus: index });
      return;
    }
    cancelAnimationFrame(drag.current.frame);
    drag.current = { anchor: index, focus: index, moved: false, x: event.clientX, y: event.clientY, frame: 0 };
    dispatch({ type: 'select', anchor: index, focus: index });
    drag.current.frame = requestAnimationFrame(dragFrame);
  };

  const onClick = (event) => {
    const time = event.target.closest('[data-seek]');
    if (time) dispatch({ type: 'seek', timelineMs: Number(time.dataset.seek) });
  };

  return (
    <div
      ref={scrollRef}
      className="transcript-view"
      role="presentation"
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <div className="transcript-view__list" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => {
          const row = rows[item.index];
          return (
            <div
              key={item.key}
              ref={virtualizer.measureElement}
              data-index={item.index}
              className={cx('transcript-view__row', `transcript-view__row--${row.kind}`)}
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <Row
                row={row}
                tokens={tokens}
                selection={selection}
                edits={{ cutIds, trims, shortened, speech, thresholdMs: pauseThresholdMs }}
                names={names}
                statusByClip={statusByClip}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({ row, tokens, selection, edits, names, statusByClip }) {
  switch (row.kind) {
    case 'divider':
      return <div className="clip-divider">{names.get(row.clipId)}</div>;
    case 'state':
      return <p className="transcript-view__note">{statusByClip.get(row.clipId)?.tag ?? 'Preparing'}</p>;
    case 'noSpeech':
      return <p className="transcript-view__note">No speech found in this clip.</p>;
    case 'allCut':
      return <p className="transcript-view__note">All of this clip is cut. Restore it from Cuts.</p>;
    default: {
      // Only the part of the selection inside this paragraph reaches it, so the others do not render again.
      const inside = selection && selection.last >= row.first && selection.first <= row.last;
      return (
        <Paragraph
          tokens={tokens}
          first={row.first}
          last={row.last}
          startMs={row.startMs}
          selectedFirst={inside ? Math.max(selection.first, row.first) : -1}
          selectedLast={inside ? Math.min(selection.last, row.last) : -1}
          cutIds={edits.cutIds}
          trims={edits.trims}
          shortened={edits.shortened}
          speech={edits.speech}
          thresholdMs={edits.thresholdMs}
        />
      );
    }
  }
}

const Paragraph = memo(function Paragraph({
  tokens, first, last, startMs, selectedFirst, selectedLast, cutIds, trims, shortened, speech, thresholdMs,
}) {
  const items = [];
  for (let index = first; index <= last; index += 1) {
    const token = tokens[index];
    if (cutIds.has(token.id)) continue;
    const selected = index >= selectedFirst && index <= selectedLast;
    if (token.kind === 'word') {
      items.push(
        <Fragment key={token.id}>
          <span
            data-i={index}
            className={cx('transcript-token', selected && 'transcript-token--selected')}
          >
            {token.text}
          </span>
          {' '}
        </Fragment>,
      );
    } else {
      const lengthMs = token.endMs - token.startMs;
      const chip = lengthMs >= CHIP_MIN_MS;
      const keepMs = trims.get(token.id) ?? shortened.get(token.id);
      const trimmed = keepMs !== undefined;
      const spoken = !trimmed && chip && speech.has(token.id);
      let label = null;
      if (chip) label = `${spoken ? 'speech ' : ''}${(lengthMs / 1000).toFixed(1)}s${trimmed ? ` → ${formatSeconds(keepMs)}` : ''}`;
      items.push(
        <span
          key={token.id}
          data-i={index}
          className={cx(
            'transcript-token',
            'transcript-token--pause',
            !chip && 'transcript-token--hidden',
            trimmed && 'transcript-token--trimmed',
            spoken && 'transcript-token--speech',
            !trimmed && !spoken && lengthMs > thresholdMs && 'transcript-token--long',
            selected && 'transcript-token--selected',
          )}
        >
          {label}
        </span>,
      );
    }
  }

  return (
    <div className="paragraph">
      <button type="button" className="paragraph__time" data-seek={startMs}>{formatClock(startMs)}</button>
      <p className="paragraph__text">{items}</p>
    </div>
  );
});

// Whether two Maps hold the same keys with the same values.
function sameEntries(a, b) {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) if (b.get(key) !== value) return false;
  return true;
}
