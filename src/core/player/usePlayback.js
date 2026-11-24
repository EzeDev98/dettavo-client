import { useEffect, useMemo, useState } from 'react';
import { PlaybackEngine } from './playbackEngine.js';

export default function usePlayback({ proxyUrl, spans, plan, clips }) {
  const [view, setView] = useState({ playing: false, clipId: null, width: 0, height: 0, skipCuts: true });
  const [engine] = useState(() => new PlaybackEngine({
    proxyUrl,
    onView: (changes) => setView((current) => ({ ...current, ...changes })),
  }));

  useEffect(() => {
    engine.setData({ spans, plan, clips });
  }, [engine, spans, plan, clips]);

  // Leaving the editor stops the sound.
  useEffect(() => () => engine.pause(), [engine]);

  return useMemo(() => ({ ...view, engine }), [view, engine]);
}
