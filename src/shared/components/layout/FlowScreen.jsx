import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import './FlowScreen.css';
import IconButton from '@shared/components/ui/IconButton.jsx';
import { cx } from '@shared/utils/classNames.js';

// Files dropped on a first-run screen are ignored: there is no project to add them to yet, and the browser would
// otherwise open the file in place of the app.
function useIgnoreFileDrops() {
  useEffect(() => {
    const ignore = (event) => event.preventDefault();
    const events = ['dragover', 'drop'];
    events.forEach((name) => window.addEventListener(name, ignore));
    return () => events.forEach((name) => window.removeEventListener(name, ignore));
  }, []);
}

// Frame for the first-run screens (prototype 5f, on Ahorra's screen pattern): a column with a bar for the back button,
// and the content centred in the height that is left.
//   card         the content sits on a raised card (every screen but Onboarding)
//   top          slot above the title: the logo or a hero
//   lead         a larger description (Onboarding)
//   bare         children go straight under the title instead of into the spaced body (Onboarding)
//   footer       the block buttons
export default function FlowScreen({ card = false, onBack, top, title, description, lead = false, bare = false, footer, children }) {
  useIgnoreFileDrops();

  return (
    <div className="ui-flow">
      <section className={cx('ui-flow__screen', card && 'ui-flow__screen--card')}>
        <div className="ui-flow__inner">
          <div className="ui-flow__bar">
            {onBack && <IconButton icon={ArrowLeft} label="Back" className="ui-flow__back" onClick={onBack} />}
          </div>
          <div className="ui-flow__group">
            {top}
            <header className={cx('ui-flow__head', lead && 'ui-flow__head--lead')}>
              <h1 className="ui-flow__title">{title}</h1>
              {description && <p className="ui-flow__description">{description}</p>}
            </header>
            {bare ? children : children && <div className="ui-flow__body">{children}</div>}
            {footer && <div className="ui-flow__footer">{footer}</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

// One large emoji above the title (prototype .hero). Decorative: the title says what the screen is.
export function FlowHero({ emoji }) {
  return (
    <div className="ui-flow__hero" aria-hidden="true">
      {emoji}
    </div>
  );
}
