import { useState } from 'react';
import { Play, Trash2 } from 'lucide-react';
import Bar from '@shared/components/ui/Bar.jsx';
import Button from '@shared/components/ui/Button.jsx';
import IconButton from '@shared/components/ui/IconButton.jsx';
import { cx } from '@shared/utils/classNames.js';
import { apiUrl } from '@core/http/apiUrl.js';
import { endpoints } from '@core/http/endpoints.js';
import { startClipDrag } from './clipDrag.js';
import { clipName } from './clipStatus.js';

const ACTION_LABELS = { retry: 'Retry', rebuild: 'Rebuild', tryAgain: 'Try again' };

export default function ClipTile({ projectId, item, busy, onAction, onDelete }) {
  const { clip, status } = item;
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const draggable = clip.state === 'READY';
  const name = clipName(clip);
  const thumbnail = clip.artifacts?.thumbnail && !thumbnailFailed ? apiUrl(endpoints.clipThumbnail(projectId, clip.id)) : null;

  let middle = null;
  if (status.action) {
    middle = (
      <Button variant="secondary" className="clip-tile__action" busy={busy} onClick={() => onAction(item)}>
        {ACTION_LABELS[status.action]}
      </Button>
    );
  } else if (!thumbnail) {
    middle = <Play className="clip-tile__placeholder" aria-hidden="true" />;
  }

  return (
    <div
      className={cx('clip-tile', draggable && 'clip-tile--draggable', dragging && 'clip-tile--dragging')}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', name);
        startClipDrag({ clipId: clip.id, from: 'tray' });
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
    >
      <div className="clip-tile__thumb">
        {thumbnail && <img className="clip-tile__image" src={thumbnail} alt="" onError={() => setThumbnailFailed(true)} />}
        {middle}
        {status.tag && (
          <span className={cx('clip-tile__tag', status.tone === 'error' && 'clip-tile__tag--error')} title={status.detail}>
            {status.tag}
          </span>
        )}
        {status.progress !== undefined && (
          <Bar value={status.progress} max={1} label={status.tag} className="clip-progress clip-tile__progress" />
        )}
        <IconButton icon={Trash2} label={`Delete ${name}`} className="clip-tile__delete" onClick={() => onDelete(clip)} />
      </div>
      <span className="clip-tile__name" title={name}>{name}</span>
      <span className="clip-tile__meta" title={status.detail}>{status.meta}</span>
    </div>
  );
}
