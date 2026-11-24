import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download } from 'lucide-react';
import TopBar, { Brand, Spacer } from '@shared/components/layout/TopBar.jsx';
import Button from '@shared/components/ui/Button.jsx';
import FilePicker from '@shared/components/ui/FilePicker.jsx';
import Spinner from '@shared/components/ui/Spinner.jsx';
import { useToast } from '@shared/components/ui/toastContext.js';
import useFileDrop from '@shared/hooks/useFileDrop.js';
import { formatClipCount } from '@shared/utils/formatting.js';
import { queryKeys } from '@core/data/queryKeys.js';
import { enqueueUploads, retryUpload } from '@core/upload/uploadManager.js';
import { apiUrl } from '@core/http/apiUrl.js';
import { endpoints } from '@core/http/endpoints.js';
import usePlayback from '@core/player/usePlayback.js';
import { ROUTES } from '@app/router/routes.js';
import { addFileErrorMessage, addFilesToProject, isMediaFile } from '@features/projects/addFiles.js';
import { useRetryClip } from './clipsApi.js';
import { useEditor } from './editorContext.js';
import { PlayerContext } from './playerContext.js';
import useClips from './useClips.js';
import useAutosave from './useAutosave.js';
import useEditorKeyboard from './useEditorKeyboard.js';
import ClipsTray from './ClipsTray.jsx';
import DeleteClipModal from './DeleteClipModal.jsx';
import EditorProvider from './EditorProvider.jsx';
import ExportAction from './ExportAction.jsx';
import LowerPanel from './LowerPanel.jsx';
import SaveState from './SaveState.jsx';
import TranscriptPane from './TranscriptPane.jsx';
import VideoPane from './VideoPane.jsx';
import './editor-screen.css';

export default function EditorScreen() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { project, items, jobs } = useClips(projectId);
  const retry = useRetryClip(projectId);
  const [deleting, setDeleting] = useState(null);
  const pickerRef = useRef(null);
  const reuploadPickerRef = useRef(null);
  const reuploadClipId = useRef(null);

  const addFiles = async (picked) => {
    const files = picked.filter(isMediaFile);
    if (!files.length) {
      toast.show('Choose a video or audio file', { tone: 'error' });
      return;
    }
    const { error } = await addFilesToProject(projectId, files);
    if (error) toast.show(addFileErrorMessage(error), { tone: 'error' });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
  };

  const over = useFileDrop(addFiles);
  const openPicker = () => pickerRef.current?.click();

  const handleAction = (item) => {
    const { clip, status } = item;
    // Retry and Rebuild both start the clip's pipeline again (Rebuild: POST .../prepare).
    if (status.action === 'retry' || status.action === 'rebuild') {
      retry.mutate(item, { onError: (error) => toast.show(error.message, { tone: 'error' }) });
      return;
    }
    // Try again: this tab still holds the file after a lost connection; otherwise the file is picked again.
    if (!retryUpload(projectId, clip.id)) {
      reuploadClipId.current = clip.id;
      reuploadPickerRef.current?.click();
    }
  };

  const reupload = ([file]) => {
    if (reuploadClipId.current) enqueueUploads(projectId, [{ clipId: reuploadClipId.current, file }]);
  };

  // actions: the right end of the top bar, the save state and Export once the editor state exists.
  const topBar = (actions) => (
    <TopBar>
      <Button variant="ghost" aria-label="Back to projects" onClick={() => navigate(ROUTES.projects)}>
        <ArrowLeft aria-hidden="true" />
        Projects
      </Button>
      <Brand />
      {project.data && (
        <span className="editor__crumb">{project.data.name} · {formatClipCount(items.length)}</span>
      )}
      <Spacer />
      {actions}
    </TopBar>
  );

  return (
    <div className="editor">
      {!project.data && topBar((
        <Button size="export" disabled>
          <Download aria-hidden="true" />
          Export
        </Button>
      ))}
      {project.isPending && (
        <div className="editor__message">
          <Spinner label="Opening the project" />
        </div>
      )}
      {project.isError && (
        <div className="editor__message">
          <p className="editor__muted">{project.error.message}</p>
        </div>
      )}
      {project.data && (
        <EditorProvider key={projectId} project={project.data}>
          {topBar((
            <>
              <SaveState />
              <ExportAction projectId={projectId} jobs={jobs} />
            </>
          ))}
          <EditorWorkspace
            projectId={projectId}
            items={items}
            onAdd={openPicker}
            tray={(
              <ClipsTray
                projectId={projectId}
                items={items}
                over={over}
                busyClipId={retry.isPending ? retry.variables?.clip.id : null}
                onAdd={openPicker}
                onAction={handleAction}
                onDelete={setDeleting}
              />
            )}
          />
        </EditorProvider>
      )}

      <FilePicker ref={pickerRef} onFiles={addFiles} />
      <FilePicker ref={reuploadPickerRef} multiple={false} onFiles={reupload} />
      <DeleteClipModal projectId={projectId} clip={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

// Everything below the top bar that reads the editor state, inside EditorProvider: the player, the keys and autosave.
// A seek asked for anywhere (a word, a paragraph time, a cut's Restore) moves the player.
function EditorWorkspace({ projectId, items, tray, onAdd }) {
  const { state, spans, plan } = useEditor();
  const player = usePlayback({
    proxyUrl: (clipId) => apiUrl(endpoints.clipProxy(projectId, clipId)),
    spans,
    plan,
    clips: state.clips,
  });
  const { engine } = player;
  const { seekRequest } = state;

  useEffect(() => {
    if (seekRequest.number) engine.seek(seekRequest.timelineMs);
  }, [engine, seekRequest]);

  // A cut (words removed, a piece or a side deleted, a split, silences cut) stops playback, so the player waits at the
  // cut point until Play is pressed again.
  const { removed, rangeCuts, splits } = state;
  useEffect(() => {
    engine.pause();
  }, [engine, removed, rangeCuts, splits]);

  useEditorKeyboard(engine);
  useAutosave(projectId);

  return (
    <PlayerContext.Provider value={player}>
      <div className="editor__work">
        <div className="editor__upper">
          <TranscriptPane items={items} tray={tray} />
          <VideoPane />
        </div>
        <LowerPanel projectId={projectId} onAdd={onAdd} />
      </div>
    </PlayerContext.Provider>
  );
}
