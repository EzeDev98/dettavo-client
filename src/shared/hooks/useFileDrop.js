import { useEffect, useRef, useState } from 'react';

const carriesFiles = (event) => Array.from(event.dataTransfer?.types ?? []).includes('Files');

// A file dropped anywhere in the window (prototype 5a and 5b). Returns true while files are being dragged over it,
// so the screen can light up its drop target. Drags that carry no files (a clip tile, selected text) are ignored.
export default function useFileDrop(onFiles, { enabled = true } = {}) {
  const [over, setOver] = useState(false);
  const onFilesRef = useRef(onFiles);

  useEffect(() => {
    onFilesRef.current = onFiles;
  });

  useEffect(() => {
    if (!enabled) return undefined;

    // dragenter and dragleave fire for every element the drag crosses, so a count of them tells when it has left
    // the window.
    let depth = 0;
    const handleEnter = (event) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setOver(true);
    };
    const handleOver = (event) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    };
    const handleLeave = (event) => {
      if (!carriesFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setOver(false);
    };
    const handleDrop = (event) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setOver(false);
      const files = Array.from(event.dataTransfer.files);
      if (files.length) onFilesRef.current(files);
    };

    window.addEventListener('dragenter', handleEnter);
    window.addEventListener('dragover', handleOver);
    window.addEventListener('dragleave', handleLeave);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragenter', handleEnter);
      window.removeEventListener('dragover', handleOver);
      window.removeEventListener('dragleave', handleLeave);
      window.removeEventListener('drop', handleDrop);
      setOver(false);
    };
  }, [enabled]);

  return over;
}
