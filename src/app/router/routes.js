// Every path in the app, in one place. Nothing else writes a path as a string: a mistyped literal fails silently
// into the catch-all route.
export const ROUTES = Object.freeze({
  // The first run, as in Ahorra. Onboarding sits at the start route (the manifest's start_url): every launch opens
  // there, and StartupGate moves the installed app on before anything shows.
  onboarding: '/',
  install: '/install',

  // The installed app
  setup: '/setup',
  projects: '/projects',
  project: '/projects/:projectId',

  // Development only: App.jsx adds these routes in dev builds.
  gallery: '/gallery',
  projectEvents: '/dev/events/:projectId',
});

// The one path with a parameter.
export const projectPath = (projectId) => ROUTES.project.replace(':projectId', encodeURIComponent(projectId));
