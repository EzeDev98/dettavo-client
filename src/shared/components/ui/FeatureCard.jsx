import './FeatureCard.css';
import EmojiTile from './EmojiTile.jsx';
import { cx } from '@shared/utils/classNames.js';

export function FeatureList({ ordered = false, children }) {
  const List = ordered ? 'ol' : 'ul';
  return <List className="ui-feature-list">{children}</List>;
}

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
