import { useEffect, useMemo, useState } from 'react';
import Bar from '@shared/components/ui/Bar.jsx';
import Button from '@shared/components/ui/Button.jsx';
import Modal from '@shared/components/ui/Modal.jsx';
import Radio from '@shared/components/ui/Radio.jsx';
import { cx } from '@shared/utils/classNames.js';
import { formatTimeLeft, formatTimecode } from '@shared/utils/formatting.js';
import { useEditor } from './editorContext.js';
import {
  cancelJob, downloadExport, listExports, loadExportFormat, revealExport, saveExportFormat, startExport,
} from './exportApi.js';
import './export-dialog.css';

const FORMATS = [
  { value: 'MP4', label: 'MP4 video', hint: 'H.264 + AAC', video: true },
  { value: 'MP3', label: 'MP3 audio' },
  { value: 'WAV', label: 'WAV audio' },
];

const ACTIVE = new Set(['QUEUED', 'RUNNING']);

export default function ExportDialog({ projectId, open, onClose, jobs }) {
  const { state, plan } = useEditor();
  const [format, setFormat] = useState(loadExportFormat);
  const [phase, setPhase] = useState('idle'); // idle, saving, starting, running, finishing, done, failed
  const [jobId, setJobId] = useState(null);
  const [startedJob, setStartedJob] = useState(null);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);

  const timelineClips = useMemo(() => {
    const byId = new Map(state.clips.map((clip) => [clip.id, clip]));
    return state.timeline.map((clipId) => byId.get(clipId)).filter(Boolean);
  }, [state.clips, state.timeline]);
  const hasVideo = timelineClips.some((clip) => clip.source?.hasVideo);
  const allReady = timelineClips.length > 0 && timelineClips.every((clip) => clip.state === 'READY');
  const formats = FORMATS.filter((option) => hasVideo || !option.video);
  const chosen = formats.some((option) => option.value === format) ? format : formats[0].value;
  const chosenLabel = FORMATS.find((option) => option.value === chosen).label;
  const editsWaiting = state.changeCount !== state.savedChangeCount || state.saveState === 'saving';

  // The job this dialog follows: the one it started, or an export already running when it opened.
  const job = jobId
    ? jobs.find((candidate) => candidate.id === jobId) ?? startedJob
    : jobs.find((candidate) => candidate.type === 'EXPORT' && ACTIVE.has(candidate.status));

  useEffect(() => {
    if (!job) return;
    if (ACTIVE.has(job.status)) {
      setJobId(job.id);
      setPhase((current) => (current === 'idle' || current === 'starting' ? 'running' : current));
    } else if (job.id === jobId) {
      if (job.status === 'SUCCEEDED') setPhase((current) => (current === 'running' ? 'finishing' : current));
      if (job.status === 'FAILED') {
        setError(job.error ?? 'The export failed');
        setPhase('failed');
      }
      if (job.status === 'CANCELLED') {
        setJobId(null);
        setPhase('idle');
      }
    }
  }, [job, jobId]);

  // A finished export is the newest file in the project's exports.
  useEffect(() => {
    if (phase !== 'finishing') return;
    listExports(projectId)
      .then((files) => {
        setFile(files[0]?.file ?? null);
        setPhase('done');
      })
      .catch((cause) => {
        setError(cause.message);
        setPhase('failed');
      });
  }, [phase, projectId]);

  const begin = async () => {
    setPhase('starting');
    setError(null);
    try {
      const started = await startExport(projectId, chosen);
      saveExportFormat(chosen);
      setStartedJob(started);
      setJobId(started.id);
    } catch (cause) {
      setError(cause.message);
      setPhase('failed');
    }
  };

  // Edits made just before Export are saved first.
  useEffect(() => {
    if (phase === 'saving' && !editsWaiting) begin();
    // begin reads the latest format and project; only the save finishing matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, editsWaiting]);

  const onExport = () => {
    if (editsWaiting) setPhase('saving');
    else begin();
  };

  const reset = () => {
    setPhase('idle');
    setJobId(null);
    setStartedJob(null);
    setError(null);
    setFile(null);
  };

  const close = () => {
    if (phase === 'done' || phase === 'failed') reset();
    onClose();
  };

  const onCancel = () => {
    if (phase === 'running' && jobId) {
      cancelJob(jobId).catch((cause) => setError(cause.message));
      return;
    }
    close();
  };

  const running = phase === 'running' || phase === 'finishing';
  const progress = job?.progress ?? 0;
  const everythingCut = allReady && plan.keepSegments.length === 0;
  let status = null;
  if (!allReady) status = 'Wait for every clip on the timeline to finish';
  if (everythingCut) status = 'Everything is cut';
  if (phase === 'saving') status = 'Saving your edits…';
  if (running && job?.status === 'QUEUED') status = `Waiting (${job.queuePosition ?? 1} ahead)`;
  if (running && job?.status !== 'QUEUED') {
    status = job?.stage?.startsWith('Encoding')
      ? `${job.stage}… ${Math.floor(progress * 100)}%`
      : `${job?.stage ?? `Encoding ${chosenLabel.toLowerCase()}`}…`;
    if (job?.etaSeconds != null) status += ` · ${formatTimeLeft(job.etaSeconds)}`;
  }
  if (phase === 'done') status = file ? `Saved as ${file}` : 'Saved';
  if (phase === 'failed') status = error;

  let primary = (
    <Button
      size="export"
      disabled={!allReady || everythingCut || running}
      busy={phase === 'saving' || phase === 'starting'}
      onClick={onExport}
    >
      Export
    </Button>
  );
  if (phase === 'done') primary = <Button size="export" onClick={close}>Done</Button>;
  if (phase === 'failed') primary = <Button size="export" disabled={!allReady || everythingCut} onClick={onExport}>Retry</Button>;

  return (
    <Modal
      open={open}
      onClose={close}
      title="Export edited recording"
      footer={(
        <>
          <Button size="export" variant="ghost" onClick={onCancel}>Cancel</Button>
          {primary}
        </>
      )}
    >
      <div className="export-dialog">
        <p className="export-dialog__muted">
          {formatTimecode(plan.editedMs)} of {formatTimecode(plan.timelineMs)} kept · {plan.cuts.length} cut
          {plan.cuts.length === 1 ? '' : 's'}. The original recording is not changed.
        </p>

        {formats.map((option) => (
          <Radio
            key={option.value}
            name="export-format"
            value={option.value}
            label={option.label}
            hint={option.hint}
            checked={chosen === option.value}
            disabled={running}
            onChange={() => setFormat(option.value)}
            className="export-option"
          />
        ))}

        {running && <Bar value={progress} max={1} label={status ?? 'Exporting'} className="export-dialog__progress" />}
        {status && (
          <p className={cx('export-dialog__muted', phase === 'failed' && 'export-dialog__error')}>{status}</p>
        )}
        {phase === 'failed' && job?.logFile && <p className="export-dialog__muted">Log: {job.logFile}</p>}

        {phase === 'done' && file && (
          <div className="export-dialog__saved">
            <Button size="export" variant="secondary" onClick={() => revealExport(projectId, file).catch((cause) => setError(cause.message))}>
              Show in Finder
            </Button>
            <Button size="export" variant="secondary" onClick={() => downloadExport(projectId, file)}>Download</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
