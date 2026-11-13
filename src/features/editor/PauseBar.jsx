import { useMemo } from 'react';
import Button from '@shared/components/ui/Button.jsx';
import Dropdown from '@shared/components/ui/Dropdown.jsx';
import { useEditor } from './editorContext.js';
import { formatSeconds, pauseSummary, savePauseChoices } from './pauses.js';

const THRESHOLDS = [500, 800, 1000, 1500].map((ms) => ({ value: ms, label: `${(ms / 1000).toFixed(1)}s` }));
const KEEPS = [0, 200, 300, 500].map((ms) => ({ value: ms, label: formatSeconds(ms) }));

// The pause bar under the transcript pane's header (guide 8.6, prototype .pb): "<total>s of pauses · <n> over <t>s",
// then Longer than, shorten to and Trim <n> pauses. Trim shortens every pause over the threshold that is not removed
// or trimmed yet, across every timeline clip, in one undoable edit. The two choices are remembered in this browser.
export default function PauseBar() {
  const { state, dispatch } = useEditor();
  const { tokens, removed, trims, pauseThresholdMs, pauseKeepMs } = state;
  const { totalMs, overCount } = useMemo(
    () => pauseSummary(tokens, removed, trims, pauseThresholdMs),
    [tokens, removed, trims, pauseThresholdMs],
  );

  return (
    <div className="pause-bar">
      <span className="pause-bar__muted">
        {(totalMs / 1000).toFixed(1)}s of pauses · {overCount} over {formatSeconds(pauseThresholdMs)}
      </span>
      <span className="pause-bar__spacer" />
      <span className="pause-bar__muted">Longer than</span>
      <Dropdown
        label="Longer than"
        options={THRESHOLDS}
        value={pauseThresholdMs}
        onChange={(ms) => {
          dispatch({ type: 'setPauseThreshold', ms });
          savePauseChoices({ thresholdMs: ms, keepMs: pauseKeepMs });
        }}
      />
      <span className="pause-bar__muted">shorten to</span>
      <Dropdown
        label="Shorten to"
        options={KEEPS}
        value={pauseKeepMs}
        onChange={(ms) => {
          dispatch({ type: 'setPauseKeep', ms });
          savePauseChoices({ thresholdMs: pauseThresholdMs, keepMs: ms });
        }}
      />
      <Button variant="secondary" disabled={!overCount} onClick={() => dispatch({ type: 'trimPauses' })}>
        {overCount ? `Trim ${overCount} pause${overCount === 1 ? '' : 's'}` : 'Trim pauses'}
      </Button>
    </div>
  );
}
