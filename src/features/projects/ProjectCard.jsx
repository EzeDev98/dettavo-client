import { useRef, useState } from 'react';
import { Pencil, Play, Trash2 } from 'lucide-react';
import IconButton from '@shared/components/ui/IconButton.jsx';
import { apiUrl } from '@core/http/apiUrl.js';
import { endpoints } from '@core/http/endpoints.js';
import { formatDuration, formatUpdated } from '@shared/utils/formatting.js';

// One project on Home (prototype 5a): the first timeline clip's thumbnail with the timeline's length, the name with
// Rename and Delete, then "<n> clips · <updated>". Rename is in place: Enter or clicking away saves, Escape cancels.
export default function ProjectCard({ project, onOpen, onRename, onDelete }) {
  const [renaming, setRenaming] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  // Enter or Escape removes the field, and some browsers then send it a blur too; only the first one counts.
  const finished = useRef(false);

  const thumbnail = project.thumbnailClipId && !thumbnailFailed
    // The version in the query makes a changed thumbnail load again; the server answers repeats with 304.
    ? `${apiUrl(endpoints.clipThumbnail(project.id, project.thumbnailClipId))}?v=${encodeURIComponent(project.updatedAt)}`
    : null;

  const startRename = () => {
    finished.current = false;
    setRenaming(true);
  };

  const finishRename = (input, save) => {
    if (finished.current) return;
    finished.current = true;
    setRenaming(false);
    const name = input.value.trim();
    if (save && name && name !== project.name) onRename(project, name);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishRename(event.currentTarget, true);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      finishRename(event.currentTarget, false);
    }
  };

  const clips = `${project.clipCount} clip${project.clipCount === 1 ? '' : 's'}`;

  return (
    <article className="project-card">
      <button type="button" className="project-card__thumb" aria-label={`Open ${project.name}`} onClick={() => onOpen(project)}>
        {thumbnail
          ? <img className="project-card__image" src={thumbnail} alt="" onError={() => setThumbnailFailed(true)} />
          : <Play className="project-card__placeholder" aria-hidden="true" />}
        {project.timelineDurationMs > 0 && <span className="project-card__duration">{formatDuration(project.timelineDurationMs)}</span>}
      </button>

      <div className="project-card__row">
        {renaming ? (
          <input
            className="project-card__input"
            defaultValue={project.name}
            aria-label="Project name"
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={handleKeyDown}
            onBlur={(event) => finishRename(event.currentTarget, true)}
          />
        ) : (
          <>
            <span className="project-card__name" title={project.name}>{project.name}</span>
            <IconButton icon={Pencil} label="Rename" onClick={startRename} />
            <IconButton icon={Trash2} label="Delete" onClick={() => onDelete(project)} />
          </>
        )}
      </div>

      <span className="project-card__meta">{clips} · {formatUpdated(project.updatedAt)}</span>
    </article>
  );
}
