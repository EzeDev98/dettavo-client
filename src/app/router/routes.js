// Every path in the app, in one place. Nothing else writes a path as a string: a mistyped literal fails silently
// into the catch-all route.
export const ROUTES = Object.freeze({
  projects: '/',
  // The first run in a browser tab: Onboarding, then Install and the hand-off.
  welcome: '/welcome',
  install: '/install',
  project: '/projects/:projectId',
  setup: '/setup',

  // Development only: App.jsx adds these routes in dev builds.
  gallery: '/gallery',
  projectEvents: '/dev/events/:projectId',
});

// The one path with a parameter.
export const projectPath = (projectId) => ROUTES.project.replace(':projectId', encodeURIComponent(projectId));
