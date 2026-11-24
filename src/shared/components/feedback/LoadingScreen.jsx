import { useState } from 'react';
import { cx } from '@shared/utils/classNames.js';
import { DOT_CYCLE_MS, LOADING_COPY } from './loadingContent.js';
import './LoadingScreen.css';


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
