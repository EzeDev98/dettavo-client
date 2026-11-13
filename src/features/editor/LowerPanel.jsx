import { Plus, Redo2, Scissors, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import Button from '@shared/components/ui/Button.jsx';
import Checkbox from '@shared/components/ui/Checkbox.jsx';
import Dropdown from '@shared/components/ui/Dropdown.jsx';
import IconButton from '@shared/components/ui/IconButton.jsx';
import { formatTimecode } from '@shared/utils/formatting.js';
import { useEditor } from './editorContext.js';
import { canRemove } from './editorReducer.js';
import { usePlayer } from './playerContext.js';
import { Timeline, TimelineRuler } from './Timeline.jsx';
import useTimelineView, { MAX_PIXELS_PER_SECOND } from './useTimelineView.js';
import './lower-panel.css';

const PADDING = [0, 20, 30, 50, 80].map((ms) => ({ value: ms, label: `${ms} ms` }));

// The editor's lower panel (guide 8.8, prototype .lower): the toolbar, the ruler and the timeline. Original is the
// length of the timeline clips together; Edited drops by each cut. The zoom buttons zoom by 2× around the playhead
// (or the middle when it is out of view); Fit shows the whole timeline.
export default function LowerPanel({ onAdd }) {
  const { state, dispatch, spans, plan } = useEditor();
  const player = usePlayer();
  const empty = spans.length === 0;
  const view = useTimelineView(plan.timelineMs);

  const zoomAroundPlayhead = (factor) => {
    const atMs = player.engine.timeMs;
    const fraction = (atMs - view.startMs) / view.spanMs;
    view.zoomTo(view.pixelsPerSecond * factor, atMs, fraction >= 0 && fraction <= 1 ? fraction : 0.5);
  };

  return (
    <section className="lower-panel">
      <div className="toolbar">
        <IconButton icon={Undo2} label="Undo" disabled={!state.past.length} onClick={() => dispatch({ type: 'undo' })} />
        <IconButton icon={Redo2} label="Redo" disabled={!state.future.length} onClick={() => dispatch({ type: 'redo' })} />
        <span className="toolbar__divider" />
        <IconButton
          icon={Scissors}
          label="Remove selection"
          disabled={!canRemove(state)}
          onClick={() => dispatch({ type: 'removeSelection' })}
        />
        <span className="toolbar__divider" />
        <IconButton icon={Plus} label="Add video or audio" onClick={onAdd} />
        <span className="toolbar__spacer" />
        <span className="toolbar__muted">Padding</span>
        <Dropdown
          label="Padding"
          placement="up"
          options={PADDING}
          value={state.padMs}
          onChange={(padMs) => dispatch({ type: 'setPadding', padMs })}
        />
        <span className="toolbar__divider" />
        <Checkbox
          label="Skip cuts"
          checked={player.skipCuts}
          onChange={(event) => player.engine.setSkipCuts(event.target.checked)}
        />
        <span className="toolbar__divider" />
        <span className="toolbar__muted">Original {formatTimecode(plan.timelineMs)}</span>
        <span>
          Edited {formatTimecode(plan.editedMs)}
          {plan.removedMs > 0 && ` · −${(plan.removedMs / 1000).toFixed(1)}s`}
        </span>
        <span className="toolbar__divider" />
        <IconButton icon={ZoomOut} label="Zoom out" disabled={view.fit} onClick={() => zoomAroundPlayhead(0.5)} />
        <IconButton
          icon={ZoomIn}
          label="Zoom in"
          disabled={empty || view.pixelsPerSecond >= MAX_PIXELS_PER_SECOND - 0.1}
          onClick={() => zoomAroundPlayhead(2)}
        />
        <Button variant="ghost" disabled={view.fit} onClick={() => view.zoomTo(0, 0, 0)}>Fit</Button>
      </div>

      <TimelineRuler view={view} hidden={empty} />
      <Timeline view={view} />
    </section>
  );
}
