import { useMemo } from 'react';
import { ArrowLeftToLine, ArrowRightToLine, Plus, Redo2, Scissors, Trash2, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import Button from '@shared/components/ui/Button.jsx';
import Checkbox from '@shared/components/ui/Checkbox.jsx';
import Dropdown from '@shared/components/ui/Dropdown.jsx';
import IconButton from '@shared/components/ui/IconButton.jsx';
import { formatTimecode } from '@shared/utils/formatting.js';
import { timelineAxis, timelineToClip } from '@core/edit/timeMap.js';
import { useEditor } from './editorContext.js';
import { canRemove } from './editorReducer.js';
import { usePlayer } from './playerContext.js';
import { Timeline } from './Timeline.jsx';
import useTimelineView, { MAX_PIXELS_PER_SECOND } from './useTimelineView.js';
import './lower-panel.css';

const PADDING = [0, 20, 30, 50, 80].map((ms) => ({ value: ms, label: `${ms} ms` }));

// The editor's lower panel (guide 8.8, prototype .lower): the toolbar, the ruler and the timeline. Split divides the
// clip under the playhead there (⌘B); Delete left (Q) and Delete right (W) cut that clip from its start to the
// playhead, or from the playhead to its end; Delete cuts out the piece selected on the timeline, or removes the words
// selected in the transcript. Original is the length of the timeline clips together; Edited drops by each cut. The
// zoom buttons zoom by 2× around the playhead (or the middle when it is out of view); Fit shows the whole timeline.
// The ruler and the timeline share one time axis: edited time while Skip cuts is on (cut parts take no space),
// timeline time while it is off.
export default function LowerPanel({ projectId, onAdd }) {
  const { state, dispatch, spans, plan } = useEditor();
  const player = usePlayer();
  const empty = spans.length === 0;
  const axis = useMemo(() => timelineAxis(plan, player.skipCuts), [plan, player.skipCuts]);
  const view = useTimelineView(axis.totalMs);

  const zoomAroundPlayhead = (factor) => {
    const atMs = axis.toAxis(player.engine.timeMs);
    const fraction = (atMs - view.startMs) / view.spanMs;
    view.zoomTo(view.pixelsPerSecond * factor, atMs, fraction >= 0 && fraction <= 1 ? fraction : 0.5);
  };

  // type: 'split', 'deleteLeft' or 'deleteRight', at the playhead in the clip under it.
  const atPlayhead = (type) => {
    const at = timelineToClip(spans, player.engine.timeMs);
    if (at) dispatch({ type, clipId: at.clipId, atMs: at.clipMs });
  };

  return (
    <section className="lower-panel">
      <div className="toolbar">
        <IconButton icon={Undo2} label="Undo" disabled={!state.past.length} onClick={() => dispatch({ type: 'undo' })} />
        <IconButton icon={Redo2} label="Redo" disabled={!state.future.length} onClick={() => dispatch({ type: 'redo' })} />
        <span className="toolbar__divider" />
        <IconButton icon={Scissors} label="Split at the playhead (⌘B)" disabled={empty} onClick={() => atPlayhead('split')} />
        <IconButton
          icon={ArrowLeftToLine}
          label="Delete left of the playhead (Q)"
          disabled={empty}
          onClick={() => atPlayhead('deleteLeft')}
        />
        <IconButton
          icon={ArrowRightToLine}
          label="Delete right of the playhead (W)"
          disabled={empty}
          onClick={() => atPlayhead('deleteRight')}
        />
        <IconButton
          icon={Trash2}
          label="Delete selection"
          disabled={!state.pieceSelection && !canRemove(state)}
          onClick={() => dispatch({ type: state.pieceSelection ? 'deletePiece' : 'removeSelection' })}
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

      <Timeline projectId={projectId} view={view} axis={axis} />
    </section>
  );
}
