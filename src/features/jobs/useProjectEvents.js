import { useEffect, useMemo, useState } from 'react';
import { endpoints } from '@core/http/endpoints.js';
import { openEventStream } from '@core/http/eventStream.js';

const JOB_EVENT = 'job';

// EventSource retries a dropped connection by itself, but gives up after a refused one (such as 401 or 404).
// The hook then opens a new stream after this delay, the same 3 s as the status bar's poll.
const RECONNECT_DELAY = 3_000;

// Returns { jobs, connected }. jobs holds the latest state of each job, oldest first.
export function useProjectEvents(projectId) {
  const [jobsById, setJobsById] = useState(() => new Map());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!projectId) return undefined;
    let stream = null;
    let retryTimer = null;
    let stopped = false;

    const open = () => {
      stream = openEventStream(endpoints.projectEvents(projectId));

      stream.addEventListener('open', () => {
        setConnected(true);
        setJobsById(new Map());
      });

      stream.addEventListener(JOB_EVENT, (event) => {
        let job;
        try {
          job = JSON.parse(event.data);
        } catch {
          return;
        }
        setJobsById((current) => new Map(current).set(job.id, job));
      });

      stream.addEventListener('error', () => {
        setConnected(false);
        if (stream.readyState === EventSource.CLOSED && !stopped) {
          stream.close();
          retryTimer = setTimeout(open, RECONNECT_DELAY);
        }
      });
    };

    open();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      stream?.close();
      setConnected(false);
    };
  }, [projectId]);

  const jobs = useMemo(() => [...jobsById.values()], [jobsById]);
  return { jobs, connected };
}
