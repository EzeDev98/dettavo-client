// Projects on the server (GET, POST, PATCH, DELETE /projects) and adding clips to one.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@core/http/httpClient.js';
import { endpoints } from '@core/http/endpoints.js';
import { queryKeys } from '@core/data/queryKeys.js';

export const createProject = (name) => httpClient.post(endpoints.projects, { name });

export const addClip = (projectId, file) =>
  httpClient.post(endpoints.projectClips(projectId), { fileName: file.name, sizeBytes: file.size });

// Home page cards, newest first (the server sorts them).
export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => httpClient.get(endpoints.projects),
  });
}

// options: extra useQuery options, such as refetchInterval.
export function useProject(projectId, options = {}) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => httpClient.get(endpoints.project(projectId)),
    enabled: Boolean(projectId),
    ...options,
  });
}

// The new name shows at once and is put back if the server refuses it.
export function useRenameProject() {
  const queryClient = useQueryClient();
  const listKey = queryKeys.projects.list();
  return useMutation({
    mutationFn: ({ projectId, name }) => httpClient.patch(endpoints.project(projectId), { name }),
    onMutate: async ({ projectId, name }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, (projects) =>
        projects?.map((project) => (project.id === projectId ? { ...project, name } : project)));
      return { previous };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(listKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId) => httpClient.delete(endpoints.project(projectId)),
    onSuccess: (_result, projectId) => {
      queryClient.setQueryData(queryKeys.projects.list(), (projects) => projects?.filter((project) => project.id !== projectId));
      queryClient.removeQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}
