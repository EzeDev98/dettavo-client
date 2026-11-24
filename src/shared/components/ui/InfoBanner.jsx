import './InfoBanner.css';

export default function InfoBanner({ emoji, role, children }) {
  return (
    <div className="ui-info-banner" role={role}>
      <span className="ui-info-banner__emoji" aria-hidden="true">
        {emoji}
      </span>
      <span>{children}</span>
    </div>
  );
}
