import { createContext, useContext, useEffect, useRef } from 'react';

export const PlayerContext = createContext(null);

// { engine, playing, clipId, width, height, skipCuts } from usePlayback, provided by the editor.
export function usePlayer() {
  const player = useContext(PlayerContext);
  if (!player) throw new Error('usePlayer needs the editor\'s PlayerContext above it');
  return player;
}

// Runs onTime(timelineMs) on every frame while playing and after every seek, outside React: the callback updates the
// DOM itself (the time, the chip, the caption, the current word).
export function usePlayerClock(onTime) {
  const { engine } = usePlayer();
  const callback = useRef(onTime);

  useEffect(() => {
    callback.current = onTime;
  });

  useEffect(() => engine.subscribe((timelineMs) => callback.current(timelineMs)), [engine]);
}
