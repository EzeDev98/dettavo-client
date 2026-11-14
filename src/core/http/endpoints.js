// Every server path, relative to VITE_API_BASE_URL (which already ends in /api/v1). Screens never write a path.
const encode = (value) => encodeURIComponent(value);

export const endpoints = Object.freeze({
  systemStatus: '/system/status',

  projects: '/projects',
  project: (projectId) => `/projects/${encode(projectId)}`,
  projectEdits: (projectId) => `/projects/${encode(projectId)}/edits`,
  editPlan: (projectId) => `/projects/${encode(projectId)}/edit-plan`,
  projectEvents: (projectId) => `/projects/${encode(projectId)}/events`,
  jobEvents: (jobId) => `/jobs/${encode(jobId)}/events`,
  jobCancel: (jobId) => `/jobs/${encode(jobId)}/cancel`,
  projectExport: (projectId) => `/projects/${encode(projectId)}/export`,
  projectExports: (projectId) => `/projects/${encode(projectId)}/exports`,
  exportFile: (projectId, file) => `/projects/${encode(projectId)}/exports/${encode(file)}`,
  exportReveal: (projectId, file) => `/projects/${encode(projectId)}/exports/${encode(file)}/reveal`,
  projectClips: (projectId) => `/projects/${encode(projectId)}/clips`,
  clip: (projectId, clipId) => `/projects/${encode(projectId)}/clips/${encode(clipId)}`,
  clipSource: (projectId, clipId) => `/projects/${encode(projectId)}/clips/${encode(clipId)}/source`,
  clipPrepare: (projectId, clipId) => `/projects/${encode(projectId)}/clips/${encode(clipId)}/prepare`,
  clipTranscribe: (projectId, clipId) => `/projects/${encode(projectId)}/clips/${encode(clipId)}/transcribe`,
  clipProxy: (projectId, clipId) => `/projects/${encode(projectId)}/clips/${encode(clipId)}/media/proxy`,
  clipThumbnail: (projectId, clipId) => `/projects/${encode(projectId)}/clips/${encode(clipId)}/media/thumbnail`,
  clipLevels: (projectId, clipId) => `/projects/${encode(projectId)}/clips/${encode(clipId)}/media/levels`,
  clipFilmstrip: (projectId, clipId) => `/projects/${encode(projectId)}/clips/${encode(clipId)}/media/filmstrip`,
  clipFilmstripImage: (projectId, clipId) => `/projects/${encode(projectId)}/clips/${encode(clipId)}/media/filmstrip/image`,
});
