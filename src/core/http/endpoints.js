// Every server path, relative to VITE_API_BASE_URL (which already ends in /api/v1). Screens never write a path.
const encode = (value) => encodeURIComponent(value);

export const endpoints = Object.freeze({
  systemStatus: '/system/status',
  sessionPair: '/session/pair',

  projects: '/projects',
  project: (projectId) => `/projects/${encode(projectId)}`,
  projectEvents: (projectId) => `/projects/${encode(projectId)}/events`,
  jobEvents: (jobId) => `/jobs/${encode(jobId)}/events`,
  projectClips: (projectId) => `/projects/${encode(projectId)}/clips`,
  clip: (projectId, clipId) => `/projects/${encode(projectId)}/clips/${encode(clipId)}`,
  clipSource: (projectId, clipId) => `/projects/${encode(projectId)}/clips/${encode(clipId)}/source`,
  clipPrepare: (projectId, clipId) => `/projects/${encode(projectId)}/clips/${encode(clipId)}/prepare`,
  clipProxy: (projectId, clipId) => `/projects/${encode(projectId)}/clips/${encode(clipId)}/media/proxy`,
  clipThumbnail: (projectId, clipId) => `/projects/${encode(projectId)}/clips/${encode(clipId)}/media/thumbnail`,
});
