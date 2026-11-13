import './InfoBanner.css';

// A note on the first-run screens (prototype .ban): an emoji, then one or two sentences. The emoji is decorative.
// role: pass 'status' when the banner appears in answer to something the person did, so it is announced.
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
