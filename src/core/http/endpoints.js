// Every server path, relative to VITE_API_BASE_URL (which already ends in /api/v1). Screens never write a path.
const encode = (value) => encodeURIComponent(value);

export const endpoints = Object.freeze({
  systemStatus: '/system/status',
  sessionPair: '/session/pair',

  projects: '/projects',
  project: (projectId) => `/projects/${encode(projectId)}`,
});
