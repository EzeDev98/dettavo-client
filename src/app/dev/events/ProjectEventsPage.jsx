import { useParams } from 'react-router';
import '@app/dev/gallery/gallery.css';
import { Section } from '@app/dev/gallery/Section.jsx';
import { useProjectEvents } from '@features/jobs/useProjectEvents.js';

const percent = (progress) => (progress == null ? null : `${Math.round(progress * 100)}%`);

function describe(job) {
  return [
    job.clipId ?? 'project',
    job.type,
    job.status,
    percent(job.progress),
    job.stage,
    job.queuePosition ? `${job.queuePosition} ahead` : null,
    job.etaSeconds != null ? `about ${job.etaSeconds} s left` : null,
    job.error,
  ].filter(Boolean).join(' · ');
}

export default function ProjectEventsPage() {
  const { projectId } = useParams();
  const { jobs, connected } = useProjectEvents(projectId);

  return (
    <main className="gallery">
      <header className="gallery__head">
        <h1 className="gallery__heading">Project events</h1>
        <p className="gallery__note">Dev only · {connected ? 'Connected' : 'Reconnecting…'} · {projectId}</p>
      </header>
      <Section title={`${jobs.length} job${jobs.length === 1 ? '' : 's'}`} note="The latest state of each job, oldest first.">
        <ol>
          {jobs.map((job) => <li key={job.id} className="gallery__note">{describe(job)}</li>)}
        </ol>
      </Section>
    </main>
  );
}
