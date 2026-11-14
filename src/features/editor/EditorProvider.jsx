import { useEffect, useMemo, useReducer } from 'react';
import { editPlan } from '@core/edit/editPlan.js';
import { timelineSpans } from '@core/edit/tokens.js';
import { EditorContext } from './editorContext.js';
import { editorReducer, initialEditorState } from './editorReducer.js';

// One project's editor state (guide 8.5). Mount it with key={projectId} once the project has loaded: the edits are
// read once, then belong to the editor, while the clips follow the project each time it is fetched again (and the
// edits too, when the server has newer ones and nothing here is waiting to be saved).
// spans place each timeline clip; plan is editPlan's one result, which the Cuts list, the lengths, the timeline
// overlay and playback all read. cutIds: every token a cut takes out other than a shortened pause, including a gap the
// plan removes with the words around it (rule 2b) and the words inside a deleted piece or silence (rule 9); the
// transcript leaves them out and they are listed under Cuts.
export default function EditorProvider({ project, children }) {
  const [state, dispatch] = useReducer(editorReducer, project, initialEditorState);
  const { clips, timeline, tokens, removed, trims, padMs, rangeCuts } = state;

  useEffect(() => {
    dispatch({ type: 'projectChanged', project });
  }, [project]);

  const spans = useMemo(() => timelineSpans(clips, timeline), [clips, timeline]);
  const plan = useMemo(
    () => editPlan(tokens, timeline, clips, removed, trims, padMs, rangeCuts),
    [tokens, timeline, clips, removed, trims, padMs, rangeCuts],
  );

  const cutIds = useMemo(
    () => new Set(plan.cuts.filter((cut) => cut.kind !== 'TRIM').flatMap((cut) => cut.tokenIds)),
    [plan],
  );

  const value = useMemo(() => ({ state, dispatch, spans, plan, cutIds }), [state, spans, plan, cutIds]);
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
