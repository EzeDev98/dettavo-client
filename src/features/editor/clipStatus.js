import { formatDuration, formatTimeLeft } from '@shared/utils/formatting.js';


export const isActiveJob = (job) => job?.status === 'QUEUED' || job?.status === 'RUNNING';

export const clipName = (clip) => clip.source?.fileName ?? clip.id;

const percent = (fraction) => Math.floor(Math.max(0, Math.min(1, fraction)) * 100);

const running = (label, fraction = 0) => ({ tag: `${label} ${percent(fraction)}%`, progress: fraction, meta: 'Please wait', live: true });

const waiting = (ahead) => ({ tag: `Waiting (${ahead} ahead)`, meta: 'In the queue', live: true });

const runningJob = (label, job) => ({
  ...running(label, job.progress ?? 0),
  meta: job.etaSeconds != null ? formatTimeLeft(job.etaSeconds) : 'Please wait',
});

const UPLOAD_STOPPED = { tag: 'Upload stopped', tone: 'error', meta: 'Not uploaded', action: 'tryAgain' };

function failed(clip, lastJob) {
  if (clip.failure) return { tag: 'Failed', tone: 'error', meta: clip.failure, detail: clip.failure };
  const preparing = lastJob ? lastJob.type === 'PREPARE_MEDIA' : !clip.artifacts?.audio16k;
  const detail = [lastJob?.error, lastJob?.logFile && `Log: ${lastJob.logFile}`].filter(Boolean).join('\n');
  return {
    tag: 'Failed',
    tone: 'error',
    meta: preparing ? 'Preparing failed' : 'Transcription failed',
    action: 'retry',
    retryWith: preparing || !clip.artifacts?.audio16k ? 'prepare' : 'transcribe',
    detail: detail || undefined,
  };
}

export function clipStatus({ clip, upload, uploadsAhead = 0, job, lastJob, onTimeline }) {
  switch (upload?.status) {
    case 'uploading': return running('Uploading', upload.total ? upload.loaded / upload.total : 0);
    case 'waiting': return waiting(uploadsAhead);
    case 'stopped': return UPLOAD_STOPPED;
    case 'failed': return { tag: 'Failed', tone: 'error', meta: 'Not uploaded', detail: upload.error };
    default: break;
  }

  if (job?.status === 'QUEUED') return waiting(job.queuePosition ?? 1);
  if (job?.status === 'RUNNING') return runningJob(job.type === 'TRANSCRIBE' ? 'Transcribing' : 'Preparing', job);

  const duration = clip.source?.durationMs ? formatDuration(clip.source.durationMs) : '';
  switch (clip.state) {
    // A finished upload whose clip has not been fetched again yet is already preparing on the server.
    case 'EMPTY': return upload?.status === 'done' ? running('Preparing') : UPLOAD_STOPPED;
    // Uploading from another tab or window: only that one knows how far it is.
    case 'UPLOADING': return upload?.status === 'done' ? running('Preparing') : { tag: 'Uploading', meta: 'Please wait', live: true };
    case 'PREPARING': return running('Preparing');
    case 'TRANSCRIBING': return running('Transcribing');
    // A prepared clip is queued for transcription at once; it waits here only if its transcription was cancelled.
    case 'PREPARED':
      return lastJob?.type === 'TRANSCRIBE' && lastJob.status === 'CANCELLED'
        ? { tag: 'Not transcribed', tone: 'error', meta: 'Transcription stopped', action: 'retry', retryWith: 'transcribe' }
        : running('Transcribing');
    case 'FAILED': return failed(clip, lastJob);
    case 'READY':
      if (!clip.artifacts?.proxy) {
        const detail = 'Playback files are missing';
        return { tag: detail, tone: 'error', meta: duration, action: 'rebuild', retryWith: 'prepare', detail };
      }
      if (!clip.transcript?.words?.length) return { tag: 'No speech found', meta: duration };
      return { tag: onTimeline ? null : 'Not on timeline', meta: duration };
    default: return { tag: clip.state, meta: duration };
  }
}
