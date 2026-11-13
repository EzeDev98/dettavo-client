// Whether Dettavo is installed, and whether this window is the installed app, from Ahorra.
// Display mode alone cannot decide it:
//   - Chrome reports 'fullscreen' for an ordinary browser tab while the browser is in full screen, and also for the
//     installed app's own window while that window is in full screen. So 'fullscreen' counts only on a Mac that is
//     known to have the app (the flag below).
//   - The browser's own installed-apps answer (detectInstalledApp) is asked once per page load, and only Chrome and
//     Edge can answer it (manifest.json lists the app under related_applications for this).
// The flag is written when the app is seen to be installed (the appinstalled event, an installed display mode, or the
// browser's own answer). It is read only for the full-screen case, so uninstalling the app and opening a plain tab
// offers the install again.
let installedInBrowser = false;

const ASK_TIMEOUT_MS = 2000;
const INSTALLED_FLAG = 'dettavo.installed';
// The display modes a window the browser opened for the installed app can report. A plain browser tab never reports them.
const INSTALLED_MODES = ['standalone', 'minimal-ui', 'window-controls-overlay'];

const rememberInstalled = () => {
  try {
    localStorage.setItem(INSTALLED_FLAG, 'yes');
  } catch {
    // Storage unavailable: the checks above still work, only the full-screen case loses its memory.
  }
};

const knownToBeInstalled = () => {
  try {
    return localStorage.getItem(INSTALLED_FLAG) === 'yes';
  } catch {
    return false;
  }
};

const inDisplayMode = (mode) => window.matchMedia(`(display-mode: ${mode})`).matches;

// Asks the browser once whether the app is installed on this Mac. Call once at startup.
export async function detectInstalledApp() {
  try {
    const timeout = new Promise((resolve) => setTimeout(() => resolve([]), ASK_TIMEOUT_MS));
    const apps = await Promise.race([navigator.getInstalledRelatedApps?.() ?? [], timeout]);
    installedInBrowser = apps.some((app) => app.platform === 'webapp');
  } catch {
    installedInBrowser = false;
  }
  if (installedInBrowser) rememberInstalled();
}

// Called when the browser reports that this page has just been installed.
export function markInstalled() {
  installedInBrowser = true;
  rememberInstalled();
}

// True when this window is the installed app, or the browser says the app is installed on this Mac.
export function isPWAInstalled() {
  if (isRunningAsApp()) {
    rememberInstalled();
    return true;
  }
  return installedInBrowser;
}

// True only when THIS window is the installed app itself. A browser tab that has just installed the app is still a
// browser tab: the Install screen keeps it on the hand-off, and the rest of Dettavo stays out of it.
export function isRunningAsApp() {
  if (INSTALLED_MODES.some(inDisplayMode) || navigator.standalone === true) return true;
  return inDisplayMode('fullscreen') && knownToBeInstalled();
}
