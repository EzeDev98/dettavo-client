import { useEffect, useMemo, useReducer } from 'react';
import { editPlan } from '@core/edit/editPlan.js';
import { timelineSpans } from '@core/edit/tokens.js';
import { EditorContext } from './editorContext.js';
import { editorReducer, initialEditorState } from './editorReducer.js';

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
