import './FeatureCard.css';
import EmojiTile from './EmojiTile.jsx';
import { cx } from '@shared/utils/classNames.js';

// A list of FeatureCards (prototype .flist). The cards rise one after another as the screen opens.
export function FeatureList({ ordered = false, children }) {
  const List = ordered ? 'ol' : 'ul';
  return <List className="ui-feature-list">{children}</List>;
}

// One card of a FeatureList (prototype .fc): an emoji tile, then the text.
//   label     small muted line above the title ("Step 1")
//   title     the card's name
//   description, strong  strong shows the description in the text colour instead of muted (the Install steps)
//   status, statusTone   small line under the text; tone 'ok' or 'missing' colours it (Setup's "Found · 7.1.1")
//   index     the card's place in its list, which sets when it rises
export default function FeatureCard({ emoji, label, title, description, strong = false, status, statusTone, index = 0 }) {
  return (
    <li className="ui-feature-card" style={{ '--index': index }}>
      <EmojiTile emoji={emoji} />
      <div>
        {label && <p className="ui-feature-card__small">{label}</p>}
        {title && <p className="ui-feature-card__title">{title}</p>}
        {description && (
          <p className={cx('ui-feature-card__description', strong && 'ui-feature-card__description--strong')}>
            {description}
          </p>
        )}
        {status && (
          <p className={cx('ui-feature-card__small', statusTone && `ui-feature-card__small--${statusTone}`)}>{status}</p>
        )}
      </div>
    </li>
  );
}
