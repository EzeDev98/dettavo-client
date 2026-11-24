import { useRef } from 'react';
import './Tabs.css';
import { cx } from '@shared/utils/classNames.js';

export default function Tabs({ tabs, value, onChange, label, className }) {
  const tabRefs = useRef([]);

  const select = (index) => {
    const count = tabs.length;
    const next = ((index % count) + count) % count;
    tabRefs.current[next]?.focus();
    onChange(tabs[next].value);
  };

  const onKeyDown = (event) => {
    const current = tabs.findIndex((tab) => tab.value === value);
    const moves = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 };
    if (event.key in moves) {
      event.preventDefault();
      select(moves[event.key]);
    }
  };

  return (
    <div role="tablist" aria-label={label} className={cx('ui-tabs', className)} onKeyDown={onKeyDown}>
      {tabs.map((tab, index) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(element) => { tabRefs.current[index] = element; }}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={tab.panelId}
            tabIndex={active ? 0 : -1}
            className={cx('ui-tabs__tab', active && 'ui-tabs__tab--active')}
            onClick={() => onChange(tab.value)}
          >
            {tab.label}
            {tab.count !== undefined && <span className="ui-tabs__count">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
