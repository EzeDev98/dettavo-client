import { createContext, useContext } from 'react';

export const EditorContext = createContext(null);

// { state, dispatch, spans, plan, cutIds } from the nearest EditorProvider.
export function useEditor() {
  const editor = useContext(EditorContext);
  if (!editor) throw new Error('useEditor needs an EditorProvider above it');
  return editor;
}
