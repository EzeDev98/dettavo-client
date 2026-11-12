import { cx } from '@shared/utils/classNames.js';

export function Section({ title, note, children }) {
  return (
    <section className="gallery__section">
      <h2 className="gallery__title">{title}</h2>
      {note && <p className="gallery__note">{note}</p>}
      {children}
    </section>
  );
}

export function Row({ children }) {
  return <div className="gallery__row">{children}</div>;
}

export function Sample({ label, wide = false, children }) {
  return (
    <div className={cx('gallery__sample', wide && 'gallery__sample--wide')}>
      <p className="gallery__label">{label}</p>
      {children}
    </div>
  );
}
