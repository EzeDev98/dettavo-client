import { useState } from 'react';
import { Download } from 'lucide-react';
import Button from '@shared/components/ui/Button.jsx';
import { useEditor } from './editorContext.js';
import ExportDialog from './ExportDialog.jsx';

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
