import './AppFrame.css';

// The whole window. children: the current screen. footer: a slot under it (the status bar).
export default function AppFrame({ footer, children }) {
  return (
    <div className="ui-app-frame">
      <main className="ui-app-frame__main">{children}</main>
      {footer}
    </div>
  );
}
