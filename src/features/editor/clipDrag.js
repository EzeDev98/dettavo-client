let current = null;

export const startClipDrag = (drag) => {
  current = drag;
};

export const currentClipDrag = () => current;

export const endClipDrag = () => {
  current = null;
};
