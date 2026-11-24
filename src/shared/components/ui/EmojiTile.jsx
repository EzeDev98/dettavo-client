import './EmojiTile.css';

export default function EmojiTile({ emoji }) {
  return (
    <span className="ui-emoji-tile" aria-hidden="true">
      {emoji}
    </span>
  );
}
