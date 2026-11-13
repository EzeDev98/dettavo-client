// The clip being dragged between the Clips tray and the timeline (prototype 5c's dg): { clipId, from: 'tray' or
// 'timeline' }, or null. A drag's own data cannot be read during dragover, so it is kept here while the drag lasts.
let current = null;

export const startClipDrag = (drag) => {
  current = drag;
};

export const currentClipDrag = () => current;

export const endClipDrag = () => {
  current = null;
};
