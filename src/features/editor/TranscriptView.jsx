import { Fragment, memo, useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cx } from '@shared/utils/classNames.js';
import { readTokenPx } from '@shared/utils/cssLength.js';
import { formatClock } from '@shared/utils/formatting.js';
import { tokenIndexAt } from '@core/edit/timeMap.js';
import { formatSeconds } from './pauses.js';
import { clipName } from './clipStatus.js';
import { useEditor } from './editorContext.js';
import { usePlayer, usePlayerClock } from './playerContext.js';
import { transcriptRows } from './transcriptRows.js';

// Paragraph rows are measured as they render; these are only first guesses.
const ESTIMATED_HEIGHTS = { divider: 22, paragraph: 112, state: 40, noSpeech: 40 };
const OVERSCAN = 6;
const CURRENT = 'transcript-token--current';
// Shorter pauses render as hidden spans that still count in a selection (guide 8.6).
const CHIP_MIN_MS = 300;

const tokenIndexAt = (target) => {
  const element = target instanceof Element ? target.closest('[data-i]') : null;
  return element ? Number(element.dataset.i) : null;
};

// The transcript of every timeline clip in order (guide 8.6, Build Plan 13c to 13e): only the visible paragraphs
// are in the DOM. Mouse: press on a word or pause to select it, drag to extend, Shift-click to extend from the
// anchor, release without dragging to seek, press on empty space to clear. statusByClip: Map of clip id to its
// tile status, for clips on the timeline that are not ready yet. While playing, the playing word is highlighted and
// kept in the middle of the pane (15d), outside React.
export default function TranscriptView({ statusByClip }) {
  const { state, dispatch, spans } = useEditor();
  const { tokens, selection, clips, removed, trims, pauseThresholdMs } = state;
  const scrollRef = useRef(null);
  const drag = useRef({ anchor: null, moved: false });
  const current = useRef({ index: -1, element: null });
  const { playing } = usePlayer();
  const playingNow = useRef(playing);

  const rows = useMemo(() => transcriptRows(tokens, spans), [tokens, spans]);
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

  // The playing word gets the current class. Its row may not be rendered yet (virtual list), or React may have just
  // rewritten its classes, so a word that should be marked and is not is looked up again on the next frame.
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

  // Releasing anywhere ends a drag. A press that never moved off its token seeks to it.
  useEffect(() => {
    const onMouseUp = () => {
      const { anchor, moved } = drag.current;
      if (anchor === null) return;
      if (!moved) dispatch({ type: 'seek', timelineMs: tokens[anchor].timelineStartMs });
      drag.current = { anchor: null, moved: false };
    };
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, [dispatch, tokens]);

  const onMouseDown = (event) => {
    if (event.button !== 0) return;
    const index = tokenIndexAt(event.target);
    if (index === null) {
      if (!event.target.closest('[data-seek]')) dispatch({ type: 'clearSelection' });
      return;
    }
    event.preventDefault();
    if (event.shiftKey && selection) {
      dispatch({ type: 'select', anchor: selection.anchor, focus: index });
      return;
    }
    drag.current = { anchor: index, moved: false };
    dispatch({ type: 'select', anchor: index, focus: index });
  };

  const onMouseOver = (event) => {
    const { anchor } = drag.current;
    if (anchor === null) return;
    const index = tokenIndexAt(event.target);
    if (index === null) return;
    if (index !== anchor) drag.current.moved = true;
    dispatch({ type: 'select', anchor, focus: index });
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
      onMouseOver={onMouseOver}
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
                edits={{ removed, trims, thresholdMs: pauseThresholdMs }}
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
          removed={edits.removed}
          trims={edits.trims}
          thresholdMs={edits.thresholdMs}
        />
      );
    }
  }
}

// One paragraph: its start time in timeline time, then its words and pauses. Pauses of 0.3 s or more are chips
// ("1.9s"); shorter ones are hidden spans. Every token carries data-i, its index, for the delegated mouse handlers.
// Removed words are red and struck through; a removed pause gets a red border, a trimmed one turns green and shows
// what it keeps ("1.9s → 0.3s"), and an untouched one over the pause bar's threshold turns amber.
const Paragraph = memo(function Paragraph({ tokens, first, last, startMs, selectedFirst, selectedLast, removed, trims, thresholdMs }) {
  const items = [];
  for (let index = first; index <= last; index += 1) {
    const token = tokens[index];
    const selected = index >= selectedFirst && index <= selectedLast;
    const isRemoved = removed.has(token.id);
    if (token.kind === 'word') {
      items.push(
        <Fragment key={token.id}>
          <span
            data-i={index}
            className={cx('transcript-token', isRemoved && 'transcript-token--removed', selected && 'transcript-token--selected')}
          >
            {token.text}
          </span>
          {' '}
        </Fragment>,
      );
    } else {
      const lengthMs = token.endMs - token.startMs;
      const chip = lengthMs >= CHIP_MIN_MS;
      const keepMs = trims.get(token.id);
      const trimmed = keepMs !== undefined;
      let label = null;
      if (chip) label = `${(lengthMs / 1000).toFixed(1)}s${trimmed ? ` → ${formatSeconds(keepMs)}` : ''}`;
      items.push(
        <span
          key={token.id}
          data-i={index}
          className={cx(
            'transcript-token',
            'transcript-token--pause',
            !chip && 'transcript-token--hidden',
            isRemoved && 'transcript-token--removed',
            trimmed && 'transcript-token--trimmed',
            !isRemoved && !trimmed && lengthMs > thresholdMs && 'transcript-token--long',
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
