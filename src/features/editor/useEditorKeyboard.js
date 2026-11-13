import { useEffect } from 'react';
import { useEditor } from './editorContext.js';

// Keys typed into a field, or pressed inside an open dialog, are not the editor's.
const elsewhere = (target) => target instanceof HTMLElement
  && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || Boolean(target.closest('[role="dialog"]')));

// The selected words as plain text: words joined by spaces, a blank line where a paragraph or a clip changes. Pauses
// and cut words are left out, as the transcript shows them. cutIds: the tokens of every REMOVE cut.
function selectionText(tokens, selection, cutIds) {
  let text = '';
  let paragraph = null;
  for (let index = selection.first; index <= selection.last; index += 1) {
    const token = tokens[index];
    if (token.kind !== 'word' || cutIds.has(token.id)) continue;
    const where = `${token.clipId}:${token.paragraphId}`;
    if (text) text += where === paragraph ? ' ' : '\n\n';
    text += token.text;
    paragraph = where;
  }
  return text;
}

// The editor's keys (guide 8.10): Delete or Backspace removes the selection, ⌘Z or Ctrl+Z undoes, ⌘⇧Z, ⌘Y or Ctrl+Y
// redoes, Escape clears the selection, and Space plays or pauses (not while a button has focus, which Space presses).
// A key already handled by a menu, a dialog or a field is left alone. ⌘C (or Edit, Copy) copies the selected words.
// player: the PlaybackEngine.
export default function useEditorKeyboard(player) {
  const { state, dispatch, cutIds } = useEditor();
  const { tokens, selection } = state;

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

  // The transcript has no browser text selection (it is Dettavo's own), so copying is done here. Text selected the
  // browser's way elsewhere (an error message, a field) is left to the browser.
  useEffect(() => {
    const onCopy = (event) => {
      if (!selection || elsewhere(document.activeElement)) return;
      if (document.getSelection()?.toString()) return;
      const text = selectionText(tokens, selection, cutIds);
      if (!text) return;
      event.preventDefault();
      event.clipboardData.setData('text/plain', text);
    };
    document.addEventListener('copy', onCopy);
    return () => document.removeEventListener('copy', onCopy);
  }, [tokens, selection, cutIds]);
}
