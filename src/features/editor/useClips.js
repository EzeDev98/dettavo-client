import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@core/data/queryKeys.js';
import { useUploads } from '@core/upload/uploadManager.js';
import { useProjectEvents } from '@features/jobs/useProjectEvents.js';
import { useProject } from '@features/projects/projectsApi.js';
import { clipStatus, isActiveJob } from './clipStatus.js';

const UPLOAD_IN_QUEUE = new Set(['waiting', 'uploading']);

export default function useClips(projectId) {
  const queryClient = useQueryClient();
  const project = useProject(projectId);
  const uploads = useUploads(projectId);
  const { jobs } = useProjectEvents(projectId);

  const finished = [
    ...jobs.filter((job) => job.clipId && !isActiveJob(job)).map((job) => `${job.id}:${job.status}`),
    ...Object.values(uploads).filter((upload) => upload.status === 'done').map((upload) => upload.clipId),
  ].join();

  useEffect(() => {
    if (finished) queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
  }, [finished, projectId, queryClient]);

  const items = useMemo(() => {
    if (!project.data) return [];
    const timeline = new Set(project.data.edits?.timeline ?? []);

    // jobs is oldest first, so the last one seen for a clip is its latest.
    const activeJobs = new Map();
    const lastJobs = new Map();
    jobs.forEach((job) => {
      if (!job.clipId) return;
      lastJobs.set(job.clipId, job);
      if (isActiveJob(job)) activeJobs.set(job.clipId, job);
    });

    // Uploads run one at a time in the order added; a waiting one counts those before it.
    const uploadsAhead = new Map();
    Object.values(uploads)
      .filter((upload) => UPLOAD_IN_QUEUE.has(upload.status))
      .forEach((upload, index) => uploadsAhead.set(upload.clipId, index));

    return project.data.clips.map((clip) => ({
      clip,
      status: clipStatus({
        clip,
        upload: uploads[clip.id],
        uploadsAhead: uploadsAhead.get(clip.id),
        job: activeJobs.get(clip.id),
        lastJob: lastJobs.get(clip.id),
        onTimeline: timeline.has(clip.id),
      }),
    }));
  }, [project.data, uploads, jobs]);

  return { project, items, jobs };
}
