import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@shared/components/ui/toastContext.js';
import { queryKeys } from '@core/data/queryKeys.js';
import { useEditor } from './editorContext.js';
import { editsRequest } from './editorReducer.js';
import { loadProject, saveEdits, saveEditsOnExit } from './editsApi.js';

const DEBOUNCE_MS = 800;

const RETRY_DELAYS_MS = [2_000, 5_000, 10_000];
const FAILURES_BEFORE_TOAST = 3;

export default function useAutosave(projectId) {
  const { state, dispatch } = useEditor();
  const queryClient = useQueryClient();
  const toast = useToast();
  const latest = useRef(state);
  const failures = useRef(0);

  useEffect(() => {
    latest.current = state;
  });

  const waiting = state.changeCount !== state.savedChangeCount;

  useEffect(() => {
    if (!waiting || state.saveState === 'saving') return undefined;

    const save = async () => {
      const current = latest.current;
      const { changeCount } = current;
      dispatch({ type: 'saveStarted' });
      try {
        const { revision } = await saveEdits(projectId, current.revision, editsRequest(current));
        failures.current = 0;
        dispatch({ type: 'saveSucceeded', revision, changeCount });
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });
      } catch (error) {
        if (error?.isConflict) {
          try {
            const project = await loadProject(projectId);
            queryClient.setQueryData(queryKeys.projects.detail(projectId), project);
            dispatch({ type: 'reloaded', project });
            toast.show('This project changed in another window', { tone: 'error' });
            return;
          } catch {
            // Fall through: retry like any other failure.
          }
        }
        failures.current += 1;
        if (failures.current === FAILURES_BEFORE_TOAST) {
          toast.show('Edits are not being saved. Check that dettavo-server is running.', { tone: 'error' });
        }
        dispatch({ type: 'saveFailed' });
      }
    };

    const delay = state.saveState === 'error'
      ? RETRY_DELAYS_MS[Math.min(failures.current, RETRY_DELAYS_MS.length) - 1]
      : DEBOUNCE_MS;
    const timer = setTimeout(save, delay);
    return () => clearTimeout(timer);
  }, [waiting, state.changeCount, state.saveState, dispatch, projectId, queryClient, toast]);

  // Closing the tab, or leaving the editor, while edits are waiting.
  useEffect(() => {
    const flush = () => {
      const current = latest.current;
      if (current.changeCount === current.savedChangeCount || current.saveState === 'saving') return;
      saveEditsOnExit(projectId, current.revision, editsRequest(current));
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [projectId]);
}
