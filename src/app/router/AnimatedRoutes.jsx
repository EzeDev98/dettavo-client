import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router';
import { run } from '@core/motion/motion.js';
import AppRoutes from './AppRoutes.jsx';
import './AnimatedRoutes.css';

// How far a screen slides while it fades, in pixels. Reduced motion drops the slide and keeps the fade.
const SLIDE_PX = 16;

const slide = (px) => (px ? `translateX(${px}px)` : 'none');

export default function AnimatedRoutes() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const stage = useRef(null);
  const [shown, setShown] = useState(location); // the location on screen; it trails `location` while a transition plays
  const arrival = useRef(null); // set when a swap happens: how far the new screen slides in from. null: do not animate.

  const direction = navigationType === 'PUSH' ? 1 : navigationType === 'POP' ? -1 : 0;

  // A new place was asked for: take the old screen away, then swap.
  useEffect(() => {
    if (location.pathname === shown.pathname) return undefined; // same screen (for example only the query changed)

    let cancelled = false;
    const swap = () => {
      if (cancelled) return;
      arrival.current = direction * SLIDE_PX;
      setShown(location);
    };

    const el = stage.current;
    const hasScreen = el.firstElementChild && el.getAnimations().length === 0; // nothing to fade, or already mid-fade
    if (hasScreen) {
      run(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: slide(-direction * SLIDE_PX) }], {
        duration: 'fast',
        ease: 'standard',
        fill: 'forwards',
      }).then(swap);
    } else {
      swap();
    }

    return () => {
      cancelled = true;
    };
  }, [location, shown, direction]);

  // The new screen is in the page but not yet painted: drop the exit animation and play the entrance.
  useLayoutEffect(() => {
    if (arrival.current === null) return; // first render: the loading screen is covering it
    const from = arrival.current;
    arrival.current = null;

    const el = stage.current;
    el.getAnimations().forEach((animation) => animation.cancel());
    // Dettavo's window never scrolls: a long screen scrolls inside AppFrame's main, which can stay mounted from one
    // screen to the next, so that is what goes back to the top.
    el.querySelector('.ui-app-frame__main')?.scrollTo(0, 0);

    // Keyboard and screen-reader focus follows the screen: it goes to the new heading, which is then read out.
    // A screen that already focused something (an autofocused field) keeps it.
    const heading = el.querySelector('h1');
    if (heading && !el.contains(document.activeElement)) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    run(el, [{ opacity: 0, transform: slide(from) }, { opacity: 1, transform: 'none' }], { duration: 'base', ease: 'out' });
  }, [shown]);

  return (
    <div ref={stage} className="route-stage">
      <AppRoutes location={shown} />
    </div>
  );
}
