import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { openEventStream } from '@core/http/eventStream.js';
import { endpoints } from '@core/http/endpoints.js';
import { queryKeys } from '@core/data/queryKeys.js';

const ACTIVE = new Set(['QUEUED', 'RUNNING']);

// The latest job of each clip, from the project's event stream (guide 4.3): { [clipId]: job }. When a job ends, the
// project is fetched again so the clip's state follows.
export default function useClipJobs(projectId) {
  const queryClient = useQueryClient();
  const [jobs, setJobs] = useState({});

  useEffect(() => {
    const source = openEventStream(endpoints.projectEvents(projectId));
    // The server sends every job again after a reconnect, so the old list is dropped.
    source.addEventListener('open', () => setJobs({}));
    source.addEventListener('job', (event) => {
      const job = JSON.parse(event.data);
      if (!job.clipId) return;
      setJobs((current) => ({ ...current, [job.clipId]: job }));
      if (!ACTIVE.has(job.status)) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      }
    });
    return () => source.close();
  }, [projectId, queryClient]);

  return jobs;
}
