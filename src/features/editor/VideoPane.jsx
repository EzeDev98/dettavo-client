import { useCallback, useMemo, useRef } from 'react';
import { AudioLines, FastForward, Pause, Play, Rewind, SkipBack, SkipForward, SquarePlay } from 'lucide-react';
import IconButton from '@shared/components/ui/IconButton.jsx';
import { cx } from '@shared/utils/classNames.js';
import { formatTimecode } from '@shared/utils/formatting.js';
import { tokenIndexAt } from '@core/edit/timeMap.js';
import { useEditor } from './editorContext.js';
import { usePlayer, usePlayerClock } from './playerContext.js';
import './video-pane.css';

const NUDGE_MS = 5000;

// The words of each paragraph, by "<clipId>/<paragraphId>", as token indexes: the caption shows one of them.
function paragraphWords(tokens) {
  const words = new Map();
  tokens.forEach((token, index) => {
    if (token.kind !== 'word') return;
    const key = `${token.clipId}/${token.paragraphId}`;
    if (!words.has(key)) words.set(key, []);
    words.get(key).push(index);
  });
  return words;
}

// The editor's right pane (guide 8.7, prototype .vpane): "Video", the proxy's size ("proxy · audio only" for an audio
// clip) and the mode; the 16:9 stage with two video elements, the timecode chip and the caption; and the transport
// with the time across the whole timeline. With nothing on the timeline the stage says so and the transport is off
// (5e). The time, the chip and the caption move every frame outside React.
export default function VideoPane() {
  const { state, spans } = useEditor();
  const player = usePlayer();
  const { engine } = player;
  const empty = spans.length === 0;
  const timelineMs = empty ? 0 : spans[spans.length - 1].timelineEndMs;
  const clip = state.clips.find((candidate) => candidate.id === player.clipId);
  const audioOnly = clip?.source?.hasVideo === false;

  const chipRef = useRef(null);
  const timeRef = useRef(null);
  const captionRef = useRef(null);
  const captionKey = useRef(null);
  const words = useMemo(() => paragraphWords(state.tokens), [state.tokens]);
  // Stable refs, so React hands each element to the engine once.
  const attachFirst = useCallback((element) => engine.attach(0, element), [engine]);
  const attachSecond = useCallback((element) => engine.attach(1, element), [engine]);

  usePlayerClock((now) => {
    if (chipRef.current) chipRef.current.textContent = formatTimecode(now);
    if (timeRef.current) timeRef.current.textContent = `${formatTimecode(now)} / ${formatTimecode(timelineMs)}`;
    renderCaption(captionRef.current, captionKey, state.tokens, words, now);
  });

  let proxy = '';
  if (player.clipId) proxy = audioOnly ? 'proxy · audio only' : `proxy · ${player.width}×${player.height}`;

  return (
    <section className={cx('video-pane', empty && 'video-pane--empty')}>
      <header className="pane-header">
        <span>Video</span>
        <span className="pane-header__muted video-pane__muted">{proxy}</span>
        <span className="pane-header__spacer" />
        <span className="pane-header__muted video-pane__muted">
          {player.skipCuts ? 'Preview · cuts skipped' : 'Preview · cuts played'}
        </span>
      </header>

      <div className="video-pane__body">
        <div className={cx('video-stage', audioOnly && 'video-stage--audio')}>
          {empty ? (
            <p className="video-stage__empty">Nothing to play yet</p>
          ) : (
            <>
              {audioOnly
                ? <AudioLines className="video-stage__frame" aria-hidden="true" />
                : <SquarePlay className="video-stage__frame" aria-hidden="true" />}
              <video ref={attachFirst} className="video-stage__video" />
              <video ref={attachSecond} className="video-stage__video" />
              <span ref={chipRef} className="video-stage__chip" />
              <p ref={captionRef} className="video-stage__caption" />
            </>
          )}
        </div>

        <div className="transport">
          <IconButton icon={SkipBack} label="Back to start" disabled={empty} onClick={() => engine.seek(0)} />
          <IconButton icon={Rewind} label="Back 5 seconds" disabled={empty} onClick={() => engine.seek(engine.timeMs - NUDGE_MS)} />
          <IconButton
            icon={player.playing ? Pause : Play}
            label={player.playing ? 'Pause' : 'Play'}
            disabled={empty}
            onClick={() => engine.toggle()}
          />
          <IconButton icon={FastForward} label="Forward 5 seconds" disabled={empty} onClick={() => engine.seek(engine.timeMs + NUDGE_MS)} />
          <IconButton icon={SkipForward} label="Skip to end" disabled={empty} onClick={() => engine.seek(timelineMs)} />
          <span ref={timeRef} className="transport__time" />
        </div>
      </div>
    </section>
  );
}

// The caption (prototype draw()): the paragraph of the playing word with that word in the accent; in a pause, the
// paragraph of the next word. Rebuilt only when the word changes.
function renderCaption(element, lastKey, tokens, words, now) {
  if (!element) return;
  let index = tokenIndexAt(tokens, now);
  const current = index >= 0 && tokens[index].kind === 'word' ? index : -1;
  if (index < 0) index = tokens.findIndex((token) => token.timelineStartMs > now);
  while (index >= 0 && index < tokens.length && tokens[index].kind !== 'word') index += 1;
  if (index < 0 || index >= tokens.length) index = tokens.length - 1;
  const token = tokens[index];
  const key = token ? `${token.clipId}/${token.paragraphId}:${current}` : '';
  if (key === lastKey.current) return;
  lastKey.current = key;

  element.replaceChildren();
  if (!token) return;
  (words.get(`${token.clipId}/${token.paragraphId}`) ?? []).forEach((wordIndex, position) => {
    if (position) element.append(' ');
    if (wordIndex === current) {
      const highlight = document.createElement('b');
      highlight.className = 'video-stage__word';
      highlight.textContent = tokens[wordIndex].text;
      element.append(highlight);
    } else {
      element.append(tokens[wordIndex].text);
    }
  });
}
