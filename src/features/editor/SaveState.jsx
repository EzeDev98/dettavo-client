import { cx } from '@shared/utils/classNames.js';
import { useEditor } from './editorContext.js';

// The top bar's save state (guide 8.9). An edit waiting out the 800 ms counts as saving.
export default function SaveState() {
  const { state } = useEditor();
  const waiting = state.changeCount !== state.savedChangeCount;
  const hasEdits = state.removed.size > 0 || state.trims.size > 0;

  let text = hasEdits ? 'All edits saved · original untouched' : 'Original file untouched';
  if (waiting || state.saveState === 'saving') text = 'Saving…';
  if (state.saveState === 'error') text = 'Not saved, retrying';

  return (
    <span className={cx('save-state', state.saveState === 'error' && 'save-state--error')} role="status">
      {text}
    </span>
  );
}
