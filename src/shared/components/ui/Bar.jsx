import './Bar.css';
import { cx } from '@shared/utils/classNames.js';

// A plain horizontal bar: value out of max, filled from the left. It never animates, so nothing moves on its own.
// tone: 'brand' | 'over' | 'under' | 'muted'. A bar is never the only carrier of a number or a verdict: the caller
// always writes the figure next to it. label is the accessible name, such as "40% of spend". A value past max fills it.
export default function Bar({ value, max, tone = 'brand', label, className }) {
  const ratio = Number(max) > 0 ? Math.min(Math.max(Number(value) / Number(max), 0), 1) : 0;

  return (
    <div role="img" aria-label={label} className={cx('ui-bar', `ui-bar--${tone}`, className)}>
      <span className="ui-bar__fill" style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}
