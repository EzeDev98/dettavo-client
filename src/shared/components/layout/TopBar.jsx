import { Scissors } from 'lucide-react';
import './TopBar.css';

export default function TopBar({ children }) {
  return <header className="ui-top-bar">{children}</header>;
}

export function Brand() {
  return (
    <span className="ui-top-bar__brand">
      <Scissors className="ui-top-bar__mark" aria-hidden="true" />
      <span>Dettavo</span>
    </span>
  );
}

export function Spacer() {
  return <span className="ui-top-bar__spacer" />;
}
