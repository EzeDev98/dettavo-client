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
};
