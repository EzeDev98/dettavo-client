import { LAPTOP_EMOJI } from './installContent.js';
import './install.css';

// The Install hero (prototype .feed): an arrow slides into the laptop, over and over, like the app arriving on the Mac.
// The arrow is drawn here because an emoji's arrow cannot move on its own. Decorative: the title says what is happening.
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
