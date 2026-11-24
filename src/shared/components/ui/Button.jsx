import './Button.css';
import Spinner from './Spinner.jsx';
import { cx } from '@shared/utils/classNames.js';

export default function Button({
  variant = 'primary',
  busy = false,
  waiting = false,
  disabled = false,
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
      aria-busy={busy || waiting || undefined}
      disabled={disabled || waiting}
      onClick={handleClick}
      {...rest}
    >
      <span className="ui-button__label">
        {waiting && <Spinner size="sm" decorative />}
        {children}
      </span>
      {busy && <Spinner size="sm" className="ui-button__spinner" decorative />}
    </button>
  );
}
