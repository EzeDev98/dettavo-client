import { LAPTOP_EMOJI } from './installContent.js';
import './install.css';

export default function LaptopFeed() {
  return (
    <div className="install__feed" aria-hidden="true">
      <svg className="install__feed-arrow" viewBox="40 40 120 120">
        <polygon points="48,48 152,100 48,152 82,100" />
      </svg>
      <span className="install__feed-laptop">{LAPTOP_EMOJI}</span>
    </div>
  );
}
