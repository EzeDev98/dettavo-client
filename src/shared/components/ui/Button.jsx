import './Button.css';
import Spinner from './Spinner.jsx';
import { cx } from '@shared/utils/classNames.js';

// variant: 'primary' | 'secondary' | 'ghost' | 'danger'. size: 'default' (28px) | 'export' (32px: the top bar's
// Export and the export dialog's buttons).
// busy keeps the label in place (so the width never changes), shows a spinner and ignores clicks.
export default function Button({
  variant = 'primary',
  busy = false,
  block = false,
  size = 'default',
  type = 'button',
  className,
  onClick,
  children,
  ...rest
}) {
  const handleClick = (event) => {
    if (busy) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      type={type}
      className={cx(
        'ui-button',
        `ui-button--${variant}`,
        busy && 'ui-button--busy',
        block && 'ui-button--block',
        size === 'export' && 'ui-button--export',
        className,
      )}
      aria-busy={busy || undefined}
      onClick={handleClick}
      {...rest}
    >
      <span className="ui-button__label">{children}</span>
      {busy && <Spinner size="sm" className="ui-button__spinner" decorative />}
    </button>
  );
}
