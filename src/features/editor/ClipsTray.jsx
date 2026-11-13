import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { cx } from '@shared/utils/classNames.js';
import { formatClipCount } from '@shared/utils/formatting.js';
import ClipTile from './ClipTile.jsx';
import { currentClipDrag, endClipDrag } from './clipDrag.js';
import { useEditor } from './editorContext.js';
import './clips-tray.css';

// The Clips tray at the foot of the transcript pane (guide 8.6, prototype 5b and 5d): every clip in the project in
// the order added, in one row that scrolls sideways, then the dashed plus tile that opens the file picker.
// over: files are being dragged over the editor, so the tray lights up. busyClipId: the clip whose Retry is sending.
// A timeline block dropped here leaves the timeline (5c); the tray lights up while one is over it.
export default function ClipsTray({ projectId, items, over, busyClipId, onAdd, onAction, onDelete }) {
  const { state, dispatch } = useEditor();
  const [blockOver, setBlockOver] = useState(false);
  const tilesRef = useRef(null);
  const shownCount = useRef(items.length);

  // Added files land at the end, and the tray scrolls to show them (11a).
  useEffect(() => {
    if (items.length > shownCount.current) {
      const tiles = tilesRef.current;
      if (tiles) tiles.scrollLeft = tiles.scrollWidth;
    }
    shownCount.current = items.length;
  }, [items.length]);

  useEffect(() => {
    const clear = () => setBlockOver(false);
    window.addEventListener('dragend', clear);
    return () => window.removeEventListener('dragend', clear);
  }, []);

  const fromTimeline = () => currentClipDrag()?.from === 'timeline';

  const onDragOver = (event) => {
    if (!fromTimeline()) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setBlockOver(true);
  };

  const onDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setBlockOver(false);
  };

  const onDrop = (event) => {
    const drag = currentClipDrag();
    if (drag?.from !== 'timeline') return;
    event.preventDefault();
    setBlockOver(false);
    dispatch({ type: 'setTimeline', timeline: state.timeline.filter((clipId) => clipId !== drag.clipId) });
    endClipDrag();
  };

  return (
    <section
      className={cx('clips-tray', (over || blockOver) && 'clips-tray--over')}
      aria-label="Clips"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="clips-tray__header">
        <span>Clips</span>
        <span className="clips-tray__muted">{formatClipCount(items.length)}</span>
        <span className="clips-tray__spacer" />
        <span className="clips-tray__muted">Drop video or audio files here</span>
      </div>

      <div className="clips-tray__tiles" ref={tilesRef}>
        {items.map((item) => (
          <ClipTile
            key={item.clip.id}
            projectId={projectId}
            item={item}
            busy={busyClipId === item.clip.id}
            onAction={onAction}
            onDelete={onDelete}
          />
        ))}
        <button type="button" className="clip-tile clip-tile--add" onClick={onAdd}>
          <span className="clip-tile__thumb">
            <Plus className="clip-tile__placeholder" aria-hidden="true" />
          </span>
          <span className="clip-tile__name">Add video or audio</span>
        </button>
      </div>
    </section>
  );
}
