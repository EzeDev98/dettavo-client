import { useMemo } from 'react';
import { useParams } from 'react-router';
import Button from '@shared/components/ui/Button.jsx';
import Dropdown from '@shared/components/ui/Dropdown.jsx';
import { silenceCuts, silencesApplied } from '@core/edit/silences.js';
import { useEditor } from './editorContext.js';
import { formatSeconds, savePauseChoices } from './pauses.js';
import useTimelineMedia from './timelineMediaApi.js';

const THRESHOLDS = [300, 500, 800, 1000, 1500].map((ms) => ({ value: ms, label: `${(ms / 1000).toFixed(1)}s` }));
const KEEPS = [0, 200, 300, 500].map((ms) => ({ value: ms, label: formatSeconds(ms) }));

// The pause bar under the transcript pane's header (guide 8.6, prototype .pb), working on the audio: "<total>s of
// silence · <n> over <t>s", then Longer than (the max pause), shorten to, and Cut <n> silences. The silences come from
// each timeline clip's audio level, so silence whisper folded into a word is found too. Cutting replaces any silences
// cut before, in one undoable edit; Restore silences takes them all back. The two choices are remembered in this
// browser.
export default function PauseBar() {
  const { projectId } = useParams();
  const { state, dispatch, spans } = useEditor();
  const { rangeCuts, pauseThresholdMs, pauseKeepMs } = state;
  const media = useTimelineMedia(projectId, state.clips, state.timeline);
  const found = useMemo(
    () => silenceCuts(spans, media, pauseThresholdMs, pauseKeepMs),
    [spans, media, pauseThresholdMs, pauseKeepMs],
  );
  const applied = silencesApplied(rangeCuts, found.cuts);
  const anyCut = rangeCuts.some((rangeCut) => rangeCut.kind === 'SILENCE');

  const summary = found.ready
    ? `${(found.silentMs / 1000).toFixed(1)}s of silence · ${found.count} over ${formatSeconds(pauseThresholdMs)}`
    : 'Reading the audio…';

  let action = 'Cut silences';
  if (applied && found.count) action = 'Silences cut';
  else if (found.count) action = `Cut ${found.count} silence${found.count === 1 ? '' : 's'}`;

  return (
    <div className="pause-bar">
      <span className="pause-bar__muted">{summary}</span>
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
      {anyCut && (
        <Button variant="ghost" onClick={() => dispatch({ type: 'replaceSilences', silences: [] })}>
          Restore silences
        </Button>
      )}
      <Button
        variant="secondary"
        disabled={!found.ready || !found.count || applied}
        onClick={() => dispatch({ type: 'replaceSilences', silences: found.cuts })}
      >
        {action}
      </Button>
    </div>
  );
}
