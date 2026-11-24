import { buildTokens, clipIdOf, isReadyClip, timelineSpans } from '@core/edit/tokens.js';
import { loadPauseChoices } from './pauses.js';

const HISTORY_LIMIT = 200;
// A split closer than this to the clip's edge or to another split would leave a piece too short to select.
const MIN_PIECE_MS = 100;

const newRangeCutId = () => `r-${crypto.randomUUID()}`;

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
    rangeCuts: edits.rangeCuts ?? [],
    splits: edits.splits ?? [],
    revision: edits.revision,
  };
}

export function initialEditorState(project) {
  const { thresholdMs, keepMs } = loadPauseChoices();
  const empty = { tokenSource: null };
  return {
    ...withTimeline(empty, project.clips, project.edits.timeline),
    ...editsOf(project),
    selection: null,
    pieceSelection: null,
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

const snapshotOf = (state) => ({
  timeline: state.timeline,
  removed: state.removed,
  trims: state.trims,
  padMs: state.padMs,
  rangeCuts: state.rangeCuts,
  splits: state.splits,
});

function applySnapshot(state, snapshot) {
  return {
    ...withTimeline(state, state.clips, snapshot.timeline),
    removed: snapshot.removed,
    trims: snapshot.trims,
    padMs: snapshot.padMs,
    rangeCuts: snapshot.rangeCuts,
    splits: snapshot.splits,
  };
}

// One undoable edit: changes is part of { timeline, removed, trims, padMs, rangeCuts, splits }.
function edit(state, changes) {
  const past = [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT);
  return {
    ...applySnapshot(state, { ...snapshotOf(state), ...changes }),
    past,
    future: [],
    selection: null,
    pieceSelection: null,
    changeCount: state.changeCount + 1,
  };
}

const selectedIds = (state) => {
  const { selection, tokens } = state;
  if (!selection) return [];
  return tokens.slice(selection.first, selection.last + 1).map((token) => token.id);
};

export const canRemove = (state) => selectedIds(state).some((id) => !state.removed.has(id) || state.trims.has(id));
export const canRestore = (state) => selectedIds(state).some((id) => state.trims.has(id));

function removeIds(state, ids) {
  const removed = new Set(state.removed);
  const trims = new Map(state.trims);
  ids.forEach((id) => {
    removed.add(id);
    trims.delete(id);
  });
  return edit(state, { removed, trims });
}

// Brings tokens back, and drops the range cuts named in rangeCutIds (a cut's Restore in the Cuts list).
function restoreIds(state, ids, rangeCutIds = []) {
  const removed = new Set(state.removed);
  const trims = new Map(state.trims);
  ids.forEach((id) => {
    removed.delete(id);
    trims.delete(id);
  });
  const dropped = new Set(rangeCutIds);
  const rangeCuts = dropped.size ? state.rangeCuts.filter((rangeCut) => !dropped.has(rangeCut.id)) : state.rangeCuts;
  return edit(state, { removed, trims, rangeCuts });
}

// The clip's length, or 0 if it is not in the project.
const durationOf = (state, clipId) => state.clips.find((clip) => clip.id === clipId)?.source?.durationMs ?? 0;

// A split at atMs (clip time), unless it is too close to the clip's edge or to a split already there.
function splitAt(state, clipId, atMs) {
  const at = Math.round(atMs);
  if (at < MIN_PIECE_MS || at > durationOf(state, clipId) - MIN_PIECE_MS) return state;
  if (state.splits.some((split) => split.clipId === clipId && Math.abs(split.atMs - at) < MIN_PIECE_MS)) return state;
  return edit(state, { splits: [...state.splits, { clipId, atMs: at }] });
}

// startMs to endMs of a clip becomes a MANUAL range cut, unless it is too short to leave anything to cut.
function cutRange(state, clipId, startMs, endMs) {
  const start = Math.round(startMs);
  const end = Math.round(endMs);
  if (end - start < 1) return state;
  return edit(state, { rangeCuts: [...state.rangeCuts, { id: newRangeCutId(), clipId, startMs: start, endMs: end, kind: 'MANUAL' }] });
}

// Asks the player to go to timelineMs. Numbered, so asking twice for the same time still moves it.
const withSeek = (state, timelineMs) => ({
  ...state,
  seekRequest: { timelineMs: Math.max(0, timelineMs), number: state.seekRequest.number + 1 },
});

// The selected piece is cut, and the player waits where it was. Its splits stay, so the pieces beside it can still be
// told apart.
function deletePiece(state) {
  const piece = state.pieceSelection;
  if (!piece) return state;
  const next = cutRange(state, piece.clipId, piece.startMs, piece.endMs);
  const span = timelineSpans(state.clips, state.timeline).find((candidate) => candidate.clipId === piece.clipId);
  return next !== state && span ? withSeek(next, span.timelineStartMs + piece.startMs) : next;
}

// The selected words are removed, and the player waits where they were.
function removeSelection(state) {
  if (!canRemove(state)) return state;
  const atMs = state.tokens[state.selection.first].timelineStartMs;
  return withSeek({ ...removeIds(state, selectedIds(state)), selection: null }, atMs);
}

// The piece of a clip that atMs (clip time) falls in: from the split before it (or the clip's start) to the split after
// it (or the clip's end), as CapCut's Delete left and Delete right see it.
function pieceAround(state, clipId, atMs) {
  let startMs = 0;
  let endMs = durationOf(state, clipId);
  state.splits.forEach((split) => {
    if (split.clipId !== clipId) return;
    if (split.atMs <= atMs) startMs = Math.max(startMs, split.atMs);
    else endMs = Math.min(endMs, split.atMs);
  });
  return { startMs, endMs };
}

// Max pause: every SILENCE range cut is replaced by silences ([{ clipId, startMs, endMs }]), in one undoable edit. An
// empty list takes them all away.
function replaceSilences(state, silences) {
  const kept = state.rangeCuts.filter((rangeCut) => rangeCut.kind !== 'SILENCE');
  const added = silences.map((silence) => ({
    id: newRangeCutId(),
    clipId: silence.clipId,
    startMs: Math.round(silence.startMs),
    endMs: Math.round(silence.endMs),
    kind: 'SILENCE',
  }));
  if (!added.length && kept.length === state.rangeCuts.length) return state;
  return edit(state, { rangeCuts: [...kept, ...added] });
}

// The body of PUT /edits. Ids of clips deleted since an edit was made are left out, as the server would refuse them.
export function editsRequest(state) {
  const clipIds = new Set(state.clips.map((clip) => clip.id));
  const exists = (tokenId) => clipIds.has(clipIdOf(tokenId));
  return {
    timeline: state.timeline.filter((clipId) => clipIds.has(clipId)),
    removed: [...state.removed].filter(exists),
    trims: [...state.trims].filter(([pauseId]) => exists(pauseId)).map(([pauseId, keepMs]) => ({ pauseId, keepMs })),
    padMs: state.padMs,
    rangeCuts: state.rangeCuts.filter((rangeCut) => clipIds.has(rangeCut.clipId)),
    splits: state.splits.filter((split) => clipIds.has(split.clipId)),
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
        pieceSelection: null,
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
        pieceSelection: null,
        selection: {
          first: Math.min(action.anchor, action.focus),
          last: Math.max(action.anchor, action.focus),
          anchor: action.anchor,
        },
      };

    case 'clearSelection':
      return state.selection || state.pieceSelection ? { ...state, selection: null, pieceSelection: null } : state;

    // A piece of a clip clicked on the timeline: { clipId, startMs, endMs } in clip time, or null.
    case 'selectPiece':
      return { ...state, selection: null, pieceSelection: action.piece };

    // ⌘B or the scissors: the clip under the playhead is split there (clip time).
    case 'split':
      return splitAt(state, action.clipId, action.atMs);

    // Delete with a piece selected: the piece is cut out.
    case 'deletePiece':
      return deletePiece(state);

    // CapCut's Delete left (Q) and Delete right (W), inside the piece under the playhead (atMs, clip time): from the
    // split before the playhead (or the clip's start) to the playhead, or from the playhead to the next split (or the
    // clip's end). Pieces either side are left alone.
    case 'deleteLeft':
      return cutRange(state, action.clipId, pieceAround(state, action.clipId, action.atMs).startMs, action.atMs);

    case 'deleteRight':
      return cutRange(state, action.clipId, action.atMs, pieceAround(state, action.clipId, action.atMs).endMs);

    // Max pause: the silences found in the audio replace those cut before.
    case 'replaceSilences':
      return replaceSilences(state, action.silences);

    case 'seek':
      return withSeek(state, action.timelineMs);

    // The removed words leave the transcript, so the selection goes with them: nothing hidden stays selected.
    case 'removeSelection':
      return removeSelection(state);

    case 'restoreSelection':
      return canRestore(state) ? restoreIds(state, selectedIds(state).filter((id) => state.trims.has(id))) : state;

    // Delete and Backspace remove the selection. Cut words are not in the transcript, so there is nothing selected to
    // restore this way: they come back from the Cuts list, or with Undo.
    case 'toggleSelection':
      return removeSelection(state);

    // A row's Restore in the Cuts list: the cut's tokens come back.
    case 'restoreTokens':
      return action.tokenIds.length || action.rangeCutIds?.length
        ? restoreIds(state, action.tokenIds, action.rangeCutIds)
        : state;

    case 'setTimeline': {
      const timeline = [...new Set(action.timeline)];
      return timeline.join() === state.timeline.join() ? state : edit(state, { timeline });
    }

    case 'setPadding':
      return action.padMs === state.padMs ? state : edit(state, { padMs: action.padMs });

    case 'undo': {
      if (!state.past.length) return state;
      return {
        ...applySnapshot(state, state.past[state.past.length - 1]),
        past: state.past.slice(0, -1),
        future: [...state.future, snapshotOf(state)],
        selection: null,
        pieceSelection: null,
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
        pieceSelection: null,
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
