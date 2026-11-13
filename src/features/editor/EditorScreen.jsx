import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import TopBar, { Brand, Spacer } from '@shared/components/layout/TopBar.jsx';
import Bar from '@shared/components/ui/Bar.jsx';
import Button from '@shared/components/ui/Button.jsx';
import Spinner from '@shared/components/ui/Spinner.jsx';
import { useToast } from '@shared/components/ui/toastContext.js';
import useFileDrop from '@shared/hooks/useFileDrop.js';
import { apiUrl } from '@core/http/apiUrl.js';
import { endpoints } from '@core/http/endpoints.js';
import { queryKeys } from '@core/data/queryKeys.js';
import { retryUpload, useUploads } from '@core/upload/uploadManager.js';
import { ROUTES } from '@app/router/routes.js';
import { useProject } from '@features/projects/projectsApi.js';
import { addFileErrorMessage, addFilesToProject, isMediaFile } from '@features/projects/addFiles.js';
import useClipJobs from './useClipJobs.js';
import './editor-screen.css';

// STAND-IN, Build Plan Step 9 only. It opens at once after adding from Home and lists each clip with its upload,
// preparing or queue state, so 9c and 9d can be tested. Steps 11 to 13 replace it with the real editor
// (prototype 5b to 5e): the Clips tray, the timeline and the transcript.
const SETTLED = new Set(['READY', 'FAILED', 'PREPARED']);

export default function EditorScreen() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const uploads = useUploads(projectId);
  const jobs = useClipJobs(projectId);
  const uploading = Object.values(uploads).some((upload) => upload.status === 'waiting' || upload.status === 'uploading');
  const project = useProject(projectId, {
    // Until Step 11 brings live clip state, the project is fetched again while anything is still moving.
    refetchInterval: (query) => (uploading || query.state.data?.clips.some((clip) => !SETTLED.has(clip.state) && clip.state !== 'EMPTY') ? 1500 : false),
  });

  // A finished upload moves its clip to Preparing on the server.
  const finishedUploads = Object.values(uploads).filter((upload) => upload.status === 'done').length;
  useEffect(() => {
    if (finishedUploads) queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
  }, [finishedUploads, projectId, queryClient]);

  // Files dropped in the editor join the open project (5e).
  useFileDrop(async (picked) => {
    const files = picked.filter(isMediaFile);
    if (!files.length) return;
    const { error } = await addFilesToProject(projectId, files);
    if (error) toast.show(addFileErrorMessage(error), { tone: 'error' });
    project.refetch();
  });

  const clips = project.data?.clips ?? [];

  return (
    <div className="editor-stand-in">
      <TopBar>
        <Button variant="ghost" onClick={() => navigate(ROUTES.projects)}>
          <ArrowLeft aria-hidden="true" />
          Projects
        </Button>
        <Brand />
        {project.data && (
          <span className="editor-stand-in__muted">
            {project.data.name} · {clips.length} clip{clips.length === 1 ? '' : 's'}
          </span>
        )}
        <Spacer />
      </TopBar>

      <div className="editor-stand-in__body">
        {project.isPending && <Spinner label="Opening the project" />}
        {project.isError && <p className="editor-stand-in__muted">{project.error.message}</p>}
        {project.data && !clips.length && <p className="editor-stand-in__muted">No clips yet. Drop a video or audio file here.</p>}
        {clips.map((clip) => (
          <ClipRow key={clip.id} projectId={projectId} clip={clip} upload={uploads[clip.id]} job={jobs[clip.id]} />
        ))}
        <p className="editor-stand-in__muted">Step 9 stand-in. The Clips tray, timeline and transcript arrive in Steps 11 to 13.</p>
      </div>
    </div>
  );
}

const percent = (fraction) => Math.floor(Math.max(0, Math.min(1, fraction)) * 100);

// What a clip is doing now, as the tile will say it (5d): the browser's upload first, then the server's job and state.
function describe(clip, upload, job) {
  if (upload?.status === 'uploading') return { text: `Uploading ${percent(upload.loaded / upload.total)}%`, value: upload.loaded / upload.total };
  if (upload?.status === 'waiting') return { text: 'Waiting to upload' };
  if (upload?.status === 'stopped') return { text: 'Upload stopped', retry: true };
  if (upload?.status === 'failed') return { text: upload.error, retry: true };
  if (upload?.status === 'done' && (clip.state === 'EMPTY' || clip.state === 'UPLOADING')) return { text: 'Preparing' };
  if (job?.status === 'QUEUED') return { text: `Waiting (${job.queuePosition} in the queue)` };
  if (job?.status === 'RUNNING') {
    const label = job.type === 'TRANSCRIBE' ? 'Transcribing' : 'Preparing';
    return { text: `${label} ${percent(job.progress)}%${job.stage ? ` · ${job.stage}` : ''}`, value: job.progress };
  }
  switch (clip.state) {
    case 'EMPTY': return { text: 'Upload stopped. Add the file again (Try again needs the tab that added it)' };
    case 'UPLOADING': return { text: 'Uploading' };
    case 'PREPARING': return { text: 'Preparing' };
    case 'PREPARED': return { text: 'Prepared. Transcription arrives in Step 10' };
    case 'TRANSCRIBING': return { text: 'Transcribing' };
    case 'READY': return { text: 'Ready' };
    case 'FAILED': return { text: job?.error ?? 'Failed' };
    default: return { text: clip.state };
  }
}

function ClipRow({ projectId, clip, upload, job }) {
  const state = describe(clip, upload, job);
  const name = clip.source?.fileName ?? clip.fileName ?? clip.name ?? upload?.file.name ?? clip.id;
  const hasThumbnail = Boolean(clip.artifacts?.thumbnail);

  return (
    <div className="editor-stand-in__clip">
      <div className="editor-stand-in__thumb">
        {hasThumbnail && <img src={apiUrl(endpoints.clipThumbnail(projectId, clip.id))} alt="" />}
      </div>
      <div className="editor-stand-in__detail">
        <span className="editor-stand-in__name">{clip.id} · {name}</span>
        <span className="editor-stand-in__muted">{state.text}</span>
        {state.value !== undefined && <Bar value={state.value} max={1} label={state.text} />}
      </div>
      {state.retry && upload && (
        <Button variant="secondary" onClick={() => retryUpload(projectId, clip.id)}>Try again</Button>
      )}
    </div>
  );
}
