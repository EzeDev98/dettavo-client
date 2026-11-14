// Every query key in the app, defined once. Screens never write a key literal.
export const queryKeys = {
  system: {
    all: ['system'],
    status: () => ['system', 'status'],
  },
  projects: {
    all: ['projects'],
    list: () => ['projects', 'list'],
    detail: (projectId) => ['projects', 'detail', projectId],
  },
  // A clip's timeline media. version changes when the clip's cache is rebuilt, so the files are fetched again.
  media: {
    levels: (projectId, clipId, version) => ['media', 'levels', projectId, clipId, version],
    filmstrip: (projectId, clipId, version) => ['media', 'filmstrip', projectId, clipId, version],
    filmstripImage: (projectId, clipId, version) => ['media', 'filmstripImage', projectId, clipId, version],
  },
};
