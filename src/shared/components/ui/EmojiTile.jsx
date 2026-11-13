import './EmojiTile.css';

// A small square tinted with the brand colour, holding one emoji (prototype .etile). Decorative: the text beside it
// carries the meaning, so it is hidden from screen readers.
export default function EmojiTile({ emoji }) {
  return (
    <span className="ui-emoji-tile" aria-hidden="true">
      {emoji}
    </span>
  );
}
