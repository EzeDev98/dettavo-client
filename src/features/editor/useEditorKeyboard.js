import { useEffect, useRef } from 'react';
import { editedToTimeline, timelineToClip, timelineToEdited } from '@core/edit/timeMap.js';
import { useEditor } from './editorContext.js';

const FRAME_MS = 1000 / 30;
const SECOND_MS = 1000;

const elsewhere = (target) => target instanceof HTMLElement
  && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || Boolean(target.closest('[role="dialog"]')));


function stepFrom(player, plan, timelineMs, stepMs) {
  if (!player.skipCuts) return timelineMs + stepMs;
  return editedToTimeline(plan, timelineToEdited(plan, timelineMs) + stepMs)?.timelineMs ?? timelineMs + stepMs;
}

// The selected words as plain text: words joined by spaces, a blank line where a paragraph or a clip changes. Pauses
// and cut words are left out, as the transcript shows them. cutIds: the tokens of every cut but a shortened pause.
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

export default function useEditorKeyboard(player) {
  const { state, dispatch, cutIds, spans, plan } = useEditor();
  const { tokens, selection } = state;
  const latest = useRef({ spans, plan, pieceSelected: false });

  useEffect(() => {
    latest.current = { spans, plan, pieceSelected: Boolean(state.pieceSelection) };
  });

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
        dispatch({ type: latest.current.pieceSelected ? 'deletePiece' : 'toggleSelection' });
      } else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && !command) {
        event.preventDefault();
        const step = (event.shiftKey ? SECOND_MS : FRAME_MS) * (event.key === 'ArrowLeft' ? -1 : 1);
        player.pause();
        player.seek(stepFrom(player, latest.current.plan, player.timeMs, step));
      } else if ((command && key === 'b') || (!command && !event.altKey && (key === 'q' || key === 'w'))) {
        event.preventDefault();
        const at = timelineToClip(latest.current.spans, player.timeMs);
        const type = { b: 'split', q: 'deleteLeft', w: 'deleteRight' }[key];
        if (at) dispatch({ type, clipId: at.clipId, atMs: at.clipMs });
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
