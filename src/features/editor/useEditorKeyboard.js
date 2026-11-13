import { useEffect } from 'react';
import { useEditor } from './editorContext.js';

// Keys typed into a field, or pressed inside an open dialog, are not the editor's.
const elsewhere = (target) => target instanceof HTMLElement
  && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || Boolean(target.closest('[role="dialog"]')));

// The editor's keys (guide 8.10): Delete or Backspace removes the selection (or restores it when all of it is
// removed), ⌘Z or Ctrl+Z undoes, ⌘⇧Z, ⌘Y or Ctrl+Y redoes, Escape clears the selection, and Space plays or pauses
// (not while a button has focus, which Space presses). A key already handled by a menu, a dialog or a field is left
// alone. player: the PlaybackEngine.
export default function useEditorKeyboard(player) {
  const { dispatch } = useEditor();

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.defaultPrevented || elsewhere(event.target)) return;
      const command = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (event.key === ' ' && !command) {
        if (event.target instanceof HTMLButtonElement) return;
        event.preventDefault();
        player.toggle();
      } else if (event.key === 'Escape') {
        dispatch({ type: 'clearSelection' });
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && !command) {
        event.preventDefault();
        dispatch({ type: 'toggleSelection' });
      } else if (command && key === 'z') {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? 'redo' : 'undo' });
      } else if (command && key === 'y') {
        event.preventDefault();
        dispatch({ type: 'redo' });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch, player]);
}
