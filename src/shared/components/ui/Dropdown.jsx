import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './Dropdown.css';
import { cx } from '@shared/utils/classNames.js';

// Only one menu is open at a time: opening one closes the one before.
let closeOpenMenu = null;

export default function Dropdown({ options, value, onChange, label, placement = 'down', disabled = false, className }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const optionRefs = useRef([]);
  const labelId = useId();
  const menuId = useId();

  const selectedIndex = Math.max(options.findIndex((option) => option.value === value), 0);
  const selected = options[selectedIndex];

  const focusOption = (index) => {
    const count = options.length;
    optionRefs.current[((index % count) + count) % count]?.focus();
  };

  const close = (returnFocus) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;

    const closeThis = () => setOpen(false);
    if (closeOpenMenu && closeOpenMenu !== closeThis) closeOpenMenu();
    closeOpenMenu = closeThis;
    optionRefs.current[selectedIndex]?.focus();

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      if (closeOpenMenu === closeThis) closeOpenMenu = null;
    };
    // selectedIndex only matters at the moment the menu opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pick = (option) => {
    close(true);
    if (option.value !== value) onChange(option.value);
  };

  const onButtonKeyDown = (event) => {
    // Enter and Space open it through the button's own click.
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKeyDown = (event) => {
    const current = optionRefs.current.indexOf(document.activeElement);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusOption(current + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusOption(current - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusOption(0);
        break;
      case 'End':
        event.preventDefault();
        focusOption(options.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'Tab':
        close(false);
        break;
      default:
    }
  };

  return (
    <div ref={rootRef} className={cx('ui-dropdown', `ui-dropdown--${placement}`, className)}>
      <span id={labelId} hidden>{label}</span>
      <button
        ref={buttonRef}
        type="button"
        className="ui-dropdown__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={() => setOpen((isOpen) => !isOpen)}
        onKeyDown={onButtonKeyDown}
      >
        <span className="ui-dropdown__value">{selected?.label}</span>
        <ChevronDown className="ui-dropdown__chevron" aria-hidden="true" />
      </button>
      {open && (
        <div id={menuId} role="listbox" aria-labelledby={labelId} className="ui-dropdown__menu" onKeyDown={onMenuKeyDown}>
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(element) => { optionRefs.current[index] = element; }}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={option.value === value}
              className="ui-dropdown__option"
              onClick={() => pick(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
