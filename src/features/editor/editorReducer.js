// The editor's state (guide 8.5) and every change to it. Pure: tokens come from core/edit.
// An edit (remove, restore, trim, padding, a timeline move) pushes a snapshot of { timeline, removed, trims, padMs }
// onto past, clears future and the selection, exactly like the prototype's edit(). changeCount counts edits, undos
// and redos; autosave compares it with savedChangeCount.
import { buildTokens, clipIdOf, isReadyClip } from '@core/edit/tokens.js';
import { loadPauseChoices } from './pauses.js';

const HISTORY_LIMIT = 200;

// What the tokens depend on, per timeline clip. They are rebuilt only when this changes: the timeline changes or a
// timeline clip turns READY (8.5).
function tokenSourceOf(clips, timeline) {
  const byId = new Map(clips.map((clip) => [clip.id, clip]));
  return timeline.map((clipId) => {
    const clip = byId.get(clipId);
    return clip
      ? `${clipId}:${isReadyClip(clip)}:${clip.source?.durationMs ?? 0}:${clip.transcript?.generatedAt ?? ''}`
      : `${clipId}:missing`;
  }).join('|');
}

// Sets clips and timeline, rebuilding the tokens (and dropping the selection) only when they change.
function withTimeline(state, clips, timeline) {
  const ids = new Set(clips.map((clip) => clip.id));
  const kept = timeline.filter((clipId) => ids.has(clipId));
  const tokenSource = tokenSourceOf(clips, kept);
  if (tokenSource === state.tokenSource) return { ...state, clips, timeline: kept };
  return { ...state, clips, timeline: kept, tokens: buildTokens(clips, kept), tokenSource, selection: null };
}

function editsOf(project) {
  const { edits } = project;
  return {
    removed: new Set(edits.removed),
    trims: new Map(edits.trims.map(({ pauseId, keepMs }) => [pauseId, keepMs])),
    padMs: edits.padMs,
    revision: edits.revision,
  };
}

// project: GET /projects/{id}. selection is { first, last, anchor } (token indexes) or null. seekRequest is the
// timeline time the user last asked to go to, numbered so that asking twice for the same time still moves the player.
export function initialEditorState(project) {
  const { thresholdMs, keepMs } = loadPauseChoices();
  const empty = { tokenSource: null };
  return {
    ...withTimeline(empty, project.clips, project.edits.timeline),
    ...editsOf(project),
    selection: null,
    past: [],
    future: [],
    changeCount: 0,
    savedChangeCount: 0,
    saveState: 'saved',
    pauseThresholdMs: thresholdMs,
    pauseKeepMs: keepMs,
    seekRequest: { timelineMs: 0, number: 0 },
  };
}

const snapshotOf = (state) => ({ timeline: state.timeline, removed: state.removed, trims: state.trims, padMs: state.padMs });

function applySnapshot(state, snapshot) {
  return {
    ...withTimeline(state, state.clips, snapshot.timeline),
    removed: snapshot.removed,
    trims: snapshot.trims,
    padMs: snapshot.padMs,
  };
}

// One undoable edit: changes is part of { timeline, removed, trims, padMs }.
function edit(state, changes) {
  const past = [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT);
  return {
    ...applySnapshot(state, { ...snapshotOf(state), ...changes }),
    past,
    future: [],
    selection: null,
    changeCount: state.changeCount + 1,
  };
}

const selectedIds = (state) => {
  const { selection, tokens } = state;
  if (!selection) return [];
  return tokens.slice(selection.first, selection.last + 1).map((token) => token.id);
};

// Remove is possible while some selected token is still kept or only trimmed. Cut tokens are not in the transcript
// (they come back from the Cuts list), so the transcript's Restore only undoes trims: a selection that spans a cut
// never brings the hidden cut back.
export const canRemove = (state) => selectedIds(state).some((id) => !state.removed.has(id) || state.trims.has(id));
export const canRestore = (state) => selectedIds(state).some((id) => state.trims.has(id));

// Removing a pause clears its trim: the two are never both set (rule 3).
function removeIds(state, ids) {
  const removed = new Set(state.removed);
  const trims = new Map(state.trims);
  ids.forEach((id) => {
    removed.add(id);
    trims.delete(id);
  });
  return edit(state, { removed, trims });
}

function restoreIds(state, ids) {
  const removed = new Set(state.removed);
  const trims = new Map(state.trims);
  ids.forEach((id) => {
    removed.delete(id);
    trims.delete(id);
  });
  return edit(state, { removed, trims });
}

// Every pause longer than the threshold that is neither removed nor trimmed yet, across every timeline clip.
export const pausesToTrim = (state) => state.tokens.filter((token) => token.kind === 'pause'
  && token.endMs - token.startMs > state.pauseThresholdMs
  && !state.removed.has(token.id)
  && !state.trims.has(token.id));

// The body of PUT /edits. Ids of clips deleted since an edit was made are left out, as the server would refuse them.
export function editsRequest(state) {
  const clipIds = new Set(state.clips.map((clip) => clip.id));
  const exists = (tokenId) => clipIds.has(clipIdOf(tokenId));
  return {
    timeline: state.timeline.filter((clipId) => clipIds.has(clipId)),
    removed: [...state.removed].filter(exists),
    trims: [...state.trims].filter(([pauseId]) => exists(pauseId)).map(([pauseId, keepMs]) => ({ pauseId, keepMs })),
    padMs: state.padMs,
  };
}

export function editorReducer(state, action) {
  switch (action.type) {
    // The project was fetched again (a clip turned READY, was added or deleted). The edits stay the editor's own,
    // unless the server holds newer ones (a clip was deleted) while nothing here is waiting to be saved.
    case 'projectChanged': {
      const { project } = action;
      const next = withTimeline(state, project.clips, state.timeline);
      const idle = state.changeCount === state.savedChangeCount && state.saveState !== 'saving';
      if (!idle || project.edits.revision <= state.revision) return next;
      return { ...withTimeline(next, project.clips, project.edits.timeline), ...editsOf(project) };
    }

    // After a 409: the project as the server has it now, with a fresh history.
    case 'reloaded': {
      const { project } = action;
      return {
        ...withTimeline(state, project.clips, project.edits.timeline),
        ...editsOf(project),
        selection: null,
        past: [],
        future: [],
        savedChangeCount: state.changeCount,
        saveState: 'saved',
      };
    }

    // anchor: where the selection started; focus: where it ends now. Either may be the smaller index.
    case 'select':
      return {
        ...state,
        selection: {
          first: Math.min(action.anchor, action.focus),
          last: Math.max(action.anchor, action.focus),
          anchor: action.anchor,
        },
      };

    case 'clearSelection':
      return state.selection ? { ...state, selection: null } : state;

    case 'seek':
      return { ...state, seekRequest: { timelineMs: Math.max(0, action.timelineMs), number: state.seekRequest.number + 1 } };

    // The removed words leave the transcript, so the selection goes with them: nothing hidden stays selected.
    case 'removeSelection':
      return canRemove(state) ? { ...removeIds(state, selectedIds(state)), selection: null } : state;

    case 'restoreSelection':
      return canRestore(state) ? restoreIds(state, selectedIds(state).filter((id) => state.trims.has(id))) : state;

    // Delete and Backspace remove the selection. Cut words are not in the transcript, so there is nothing selected to
    // restore this way: they come back from the Cuts list, or with Undo.
    case 'toggleSelection':
      return canRemove(state) ? { ...removeIds(state, selectedIds(state)), selection: null } : state;

    // A row's Restore in the Cuts list: the cut's tokens come back.
    case 'restoreTokens':
      return action.tokenIds.length ? restoreIds(state, action.tokenIds) : state;

    // A clip placed on the timeline, moved along it or taken off it (16f). Each clip appears at most once (rule 8).
    case 'setTimeline': {
      const timeline = [...new Set(action.timeline)];
      return timeline.join() === state.timeline.join() ? state : edit(state, { timeline });
    }

    // The Padding dropdown (16e): one undoable edit, saved with the others.
    case 'setPadding':
      return action.padMs === state.padMs ? state : edit(state, { padMs: action.padMs });

    case 'trimPauses': {
      const pauses = pausesToTrim(state);
      if (!pauses.length) return state;
      const trims = new Map(state.trims);
      pauses.forEach((token) => trims.set(token.id, state.pauseKeepMs));
      return edit(state, { trims });
    }

    case 'undo': {
      if (!state.past.length) return state;
      return {
        ...applySnapshot(state, state.past[state.past.length - 1]),
        past: state.past.slice(0, -1),
        future: [...state.future, snapshotOf(state)],
        selection: null,
        changeCount: state.changeCount + 1,
      };
    }

    case 'redo': {
      if (!state.future.length) return state;
      return {
        ...applySnapshot(state, state.future[state.future.length - 1]),
        past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
        future: state.future.slice(0, -1),
        selection: null,
        changeCount: state.changeCount + 1,
      };
    }

    case 'saveStarted':
      return { ...state, saveState: 'saving' };

    // changeCount: the edits this save held. Later edits are still waiting for the next save.
    case 'saveSucceeded':
      return { ...state, saveState: 'saved', revision: action.revision, savedChangeCount: action.changeCount };

    case 'saveFailed':
      return { ...state, saveState: 'error' };

    case 'setPauseThreshold':
      return { ...state, pauseThresholdMs: action.ms };

    case 'setPauseKeep':
      return { ...state, pauseKeepMs: action.ms };

    default:
      return state;
  }
}
