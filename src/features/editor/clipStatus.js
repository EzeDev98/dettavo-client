// What a clip tile says (prototype 5d), worked out from three sources in order: this tab's upload of the file, the
// clip's live job from the project's events, then the clip's saved state. Pure, so the Clips tray and the transcript
// pane's "Getting your clip ready" rows (5e) give the same answer.
import { formatDuration, formatTimeLeft } from '@shared/utils/formatting.js';

// status fields: tag (the label on the thumbnail, or null), tone ('error' or undefined), progress (0 to 1 when a bar
// shows), meta (the line under the name), action ('retry', 'rebuild' or 'tryAgain' when the tile has a button), retryWith
// ('prepare' or 'transcribe': what Retry starts again), detail (the full error, as a tooltip) and live (true while
// the clip is still on its way to ready).

export const isActiveJob = (job) => job?.status === 'QUEUED' || job?.status === 'RUNNING';

export const clipName = (clip) => clip.source?.fileName ?? clip.id;

const percent = (fraction) => Math.floor(Math.max(0, Math.min(1, fraction)) * 100);

const running = (label, fraction = 0) => ({ tag: `${label} ${percent(fraction)}%`, progress: fraction, meta: 'Please wait', live: true });

const waiting = (ahead) => ({ tag: `Waiting (${ahead} ahead)`, meta: 'In the queue', live: true });

// A running job shows its ETA under the name once the server has one (guide 9: after one chunk or 5 %).
const runningJob = (label, job) => ({
  ...running(label, job.progress ?? 0),
  meta: job.etaSeconds != null ? formatTimeLeft(job.etaSeconds) : 'Please wait',
});

const UPLOAD_STOPPED = { tag: 'Upload stopped', tone: 'error', meta: 'Not uploaded', action: 'tryAgain' };

// Guide 9: a refused file says why ("This file has no audio track") and can only be deleted. A failed preparation or
// transcription says which, shows the error and the log file on hover, and offers Retry: transcription resumes from
// the finished chunks, unless its 16 kHz audio is gone, when the clip is prepared again.
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

// upload: this tab's upload of the clip's file, if any. uploadsAhead: uploads queued before it. job: the clip's
// queued or running job, if any. lastJob: its latest job of any status. onTimeline: edits.timeline holds the clip.
export function clipStatus({ clip, upload, uploadsAhead = 0, job, lastJob, onTimeline }) {
  switch (upload?.status) {
    case 'uploading': return running('Uploading', upload.total ? upload.loaded / upload.total : 0);
    case 'waiting': return waiting(uploadsAhead);
    case 'stopped': return UPLOAD_STOPPED;
    case 'failed': return { tag: 'Failed', tone: 'error', meta: 'Not uploaded', detail: upload.error };
    default: break;
  }

  // queuePosition already counts the job that is running (guide 4.7).
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
    // The server lists only the cache files still on disk (19b); without its playback copy the clip cannot play.
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
