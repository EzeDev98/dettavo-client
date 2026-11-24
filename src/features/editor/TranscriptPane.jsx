import { useId, useMemo, useState } from 'react';
import Bar from '@shared/components/ui/Bar.jsx';
import Button from '@shared/components/ui/Button.jsx';
import Tabs from '@shared/components/ui/Tabs.jsx';
import { formatTimecode } from '@shared/utils/formatting.js';
import { clipName } from './clipStatus.js';
import CutsList from './CutsList.jsx';
import { useEditor } from './editorContext.js';
import { canRemove, canRestore } from './editorReducer.js';
import PauseBar from './PauseBar.jsx';
import TranscriptView from './TranscriptView.jsx';
import './transcript-pane.css';

function selectionSummary(tokens, selection, cutIds) {
  if (!selection) return '';
  let words = 0;
  for (let index = selection.first; index <= selection.last; index += 1) {
    if (tokens[index].kind === 'word' && !cutIds.has(tokens[index].id)) words += 1;
  }
  const lengthMs = tokens[selection.last].timelineEndMs - tokens[selection.first].timelineStartMs;
  return `${words ? `${words} word${words === 1 ? '' : 's'}` : 'Pause'} · ${formatTimecode(lengthMs)}`;
}

export default function TranscriptPane({ items, tray }) {
  const { state, dispatch, plan, cutIds } = useEditor();
  const [tab, setTab] = useState('transcript');
  const panelId = useId();
  const statusByClip = useMemo(() => new Map(items.map(({ clip, status }) => [clip.id, status])), [items]);
  const onTimeline = state.timeline.length > 0;

  return (
    <section className="transcript-pane">
      <header className="pane-header">
        <Tabs
          label="Transcript or cuts"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'transcript', label: 'Transcript', panelId },
            { value: 'cuts', label: 'Cuts', count: plan.cuts.length || undefined, panelId },
          ]}
        />
        <span className="pane-header__spacer" />
        <span className="pane-header__muted">{selectionSummary(state.tokens, state.selection, cutIds)}</span>
        <Button variant="secondary" disabled={!canRemove(state)} onClick={() => dispatch({ type: 'removeSelection' })}>
          Remove
        </Button>
        <Button variant="secondary" disabled={!canRestore(state)} onClick={() => dispatch({ type: 'restoreSelection' })}>
          Restore
        </Button>
      </header>

      <PauseBar />

      <div id={panelId} role="tabpanel" className="transcript-pane__body">
        {tab === 'cuts' && (
          <div className="transcript-pane__scroll">
            <CutsList />
          </div>
        )}
        {tab === 'transcript' && onTimeline && <TranscriptView statusByClip={statusByClip} />}
        {tab === 'transcript' && !onTimeline && (
          <div className="transcript-pane__scroll">
            <BeforeTimeline items={items} />
          </div>
        )}
      </div>

      {tray}
    </section>
  );
}

// items: [{ clip, status }] from useClips. The rows update live from the same status as the tiles.
function BeforeTimeline({ items }) {
  const live = items.filter((item) => item.status.live);

  if (live.length) {
    return (
      <div className="getting-ready">
        <h2 className="getting-ready__title">Getting {live.length > 1 ? 'your clips' : 'your clip'} ready</h2>
        {live.map(({ clip, status }) => (
          <div key={clip.id} className="getting-ready__row">
            <span className="getting-ready__name" title={clipName(clip)}>{clipName(clip)}</span>
            <span className="getting-ready__state">{status.tag}</span>
            <Bar value={status.progress ?? 0} max={1} label={status.tag} className="clip-progress clip-progress--rounded getting-ready__bar" />
          </div>
        ))}
        <p className="getting-ready__note">
          Each clip is uploaded, prepared and transcribed on this Mac. When one is ready, drag it from the tray onto the
          timeline and its words appear here.
        </p>
      </div>
    );
  }

  return (
    <p className="transcript-pane__empty">
      {items.length
        ? 'The timeline is empty. Drag a clip from the tray onto the timeline.'
        : 'No clips yet. Add a video or audio file to start.'}
    </p>
  );
}
