import { useState } from 'react';
import { cx } from '@shared/utils/classNames.js';
import { DOT_CYCLE_MS, LOADING_COPY } from './loadingContent.js';
import './LoadingScreen.css';

// The in-app loading screen, from Ahorra: the logo, the tagline and three pulsing dots, between the native splash and
// the first screen. index.html holds an identical static copy that shows until React mounts, so nothing changes on
// screen at the hand-over. If you change this markup or LoadingScreen.css, change that copy too.
// The logo is the app icon exactly as supplied (public/icons/icon-512.png).
// leaving: set while the screen fades out over the first screen, so screen readers stop announcing it.
// page: for a screen that is waiting inside the app (AppShell reaching the local service). Same look, smaller logo,
// and it sits in the page instead of covering the toasts.
export default function LoadingScreen({ ref, leaving = false, page = false }) {
  // Where the dots are in their cycle, on the same clock index.html uses for its static copy (see its inline script),
  // so the dots carry on in step when this copy replaces that one. Worked out once, so a later render never makes them jump.
  const [phase] = useState(() => `${-(performance.now() % DOT_CYCLE_MS)}ms`);
  return (
    <div
      ref={ref}
      className={cx('loading-screen', page && 'loading-screen--page')}
      role="status"
      aria-label={LOADING_COPY.label}
      aria-hidden={leaving || undefined}
      style={{ '--loader-phase': phase }}
    >
      <img className="loading-screen__logo" src="/icons/icon-512.png" alt="" width="512" height="512" />
      <p className="loading-screen__tagline">{LOADING_COPY.tagline}</p>
      <span className="loading-screen__dots" aria-hidden="true">
        <span className="loading-screen__dot" />
        <span className="loading-screen__dot" />
        <span className="loading-screen__dot" />
      </span>
    </div>
  );
}
