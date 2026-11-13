import { useEffect, useMemo, useReducer } from 'react';
import { editPlan } from '@core/edit/editPlan.js';
import { timelineSpans } from '@core/edit/tokens.js';
import { EditorContext } from './editorContext.js';
import { editorReducer, initialEditorState } from './editorReducer.js';

// One project's editor state (guide 8.5). Mount it with key={projectId} once the project has loaded: the edits are
// read once, then belong to the editor, while the clips follow the project each time it is fetched again (and the
// edits too, when the server has newer ones and nothing here is waiting to be saved).
// spans place each timeline clip; plan is editPlan's one result, which the Cuts list, the lengths, the timeline
// overlay and playback all read.
export default function EditorProvider({ project, children }) {
  const [state, dispatch] = useReducer(editorReducer, project, initialEditorState);
  const { clips, timeline, tokens, removed, trims, padMs } = state;

  useEffect(() => {
    dispatch({ type: 'projectChanged', project });
  }, [project]);

  const spans = useMemo(() => timelineSpans(clips, timeline), [clips, timeline]);
  const plan = useMemo(
    () => editPlan(tokens, timeline, clips, removed, trims, padMs),
    [tokens, timeline, clips, removed, trims, padMs],
  );

  const value = useMemo(() => ({ state, dispatch, spans, plan }), [state, spans, plan]);
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
