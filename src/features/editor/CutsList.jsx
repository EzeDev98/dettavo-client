import { useMemo } from 'react';
import Button from '@shared/components/ui/Button.jsx';
import { formatTimecode } from '@shared/utils/formatting.js';
import { useEditor } from './editorContext.js';
import { formatSeconds } from './pauses.js';

// What a cut takes out: its words in quotes; for a shortened pause "Pause 1.9s shortened to 0.3s"; otherwise
// "Pause 1.9s" with the length cut (prototype lbl()).
function cutLabel(cut, tokensById, trims) {
  const words = cut.tokenIds.map((id) => tokensById.get(id)).filter((token) => token?.kind === 'word');
  if (words.length) return `“${words.map((token) => token.text).join(' ')}”`;
  if (cut.kind === 'TRIM' && cut.tokenIds.length === 1) {
    const pause = tokensById.get(cut.tokenIds[0]);
    if (pause) return `Pause ${((pause.endMs - pause.startMs) / 1000).toFixed(1)}s shortened to ${formatSeconds(trims.get(pause.id) ?? 0)}`;
  }
  return `Pause ${((cut.endMs - cut.startMs) / 1000).toFixed(1)}s`;
}

// The Cuts tab (guide 8.6, Build Plan 14d): one row per cut in timeline order, with its timeline times, its label in
// red and Restore, which seeks 1 s before the cut and brings its tokens back in one undoable edit.
export default function CutsList() {
  const { state, dispatch, plan } = useEditor();
  const tokensById = useMemo(() => new Map(state.tokens.map((token) => [token.id, token])), [state.tokens]);

  if (!plan.cuts.length) {
    return <p className="transcript-pane__empty">No cuts yet. Select words in the transcript and press Delete.</p>;
  }

  const restore = (cut) => {
    dispatch({ type: 'seek', timelineMs: cut.timelineStartMs - 1000 });
    dispatch({ type: 'restoreTokens', tokenIds: cut.tokenIds });
  };

  return (
    <div className="cuts-list">
      {plan.cuts.map((cut) => (
        <div key={`${cut.clipId}-${cut.startMs}`} className="cuts-list__row">
          <span className="cuts-list__time">
            {formatTimecode(cut.timelineStartMs)} – {formatTimecode(cut.timelineEndMs)}
          </span>
          <span className="cuts-list__label">{cutLabel(cut, tokensById, state.trims)}</span>
          <Button variant="secondary" onClick={() => restore(cut)}>Restore</Button>
        </div>
      ))}
    </div>
  );
}
