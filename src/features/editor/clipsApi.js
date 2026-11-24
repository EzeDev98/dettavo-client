import { useMutation, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@core/http/httpClient.js';
import { endpoints } from '@core/http/endpoints.js';
import { queryKeys } from '@core/data/queryKeys.js';
import { forgetUpload } from '@core/upload/uploadManager.js';

// Retry: preparing again rebuilds the cache and then transcribes; transcribing again resumes from finished chunks.
export function useRetryClip(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clip, status }) => httpClient.post(status.retryWith === 'prepare'
      ? endpoints.clipPrepare(projectId, clip.id)
      : endpoints.clipTranscribe(projectId, clip.id)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) }),
  });
}

// The server takes the clip off the timeline, drops its cuts and trims, cancels its jobs and deletes its folder.
export function useDeleteClip(projectId) {
  const queryClient = useQueryClient();
  const detailKey = queryKeys.projects.detail(projectId);
  return useMutation({
    mutationFn: (clipId) => {
      // An upload still running for the clip is stopped first, so it does not hold the clip open.
      forgetUpload(projectId, clipId);
      return httpClient.delete(endpoints.clip(projectId, clipId));
    },
    onSuccess: (_result, clipId) => {
      queryClient.setQueryData(detailKey, (project) =>
        project && { ...project, clips: project.clips.filter((clip) => clip.id !== clipId) });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
  });
}
