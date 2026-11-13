import { useState } from 'react';
import { Download } from 'lucide-react';
import Button from '@shared/components/ui/Button.jsx';
import { useEditor } from './editorContext.js';
import ExportDialog from './ExportDialog.jsx';

// The top bar's Export button and its dialog (guide 8.9). Off while the timeline is empty, as in the prototype.
// The dialog stays mounted while closed, so an export started there is still followed when it opens again.
export default function ExportAction({ projectId, jobs }) {
  const { spans } = useEditor();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="export" disabled={spans.length === 0} onClick={() => setOpen(true)}>
        <Download aria-hidden="true" />
        Export
      </Button>
      <ExportDialog projectId={projectId} jobs={jobs} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
