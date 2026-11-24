import Button from '@shared/components/ui/Button.jsx';
import Modal from '@shared/components/ui/Modal.jsx';
import { useToast } from '@shared/components/ui/toastContext.js';
import { clipName } from './clipStatus.js';
import { useDeleteClip } from './clipsApi.js';

export default function DeleteClipModal({ projectId, clip, onClose }) {
  const toast = useToast();
  const remove = useDeleteClip(projectId);

  const confirm = () => remove.mutate(clip.id, {
    onSuccess: onClose,
    onError: (error) => toast.show(error.message, { tone: 'error' }),
  });

  return (
    <Modal
      open={Boolean(clip)}
      onClose={onClose}
      title={clip ? `Delete “${clipName(clip)}”?` : ''}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} data-autofocus>Cancel</Button>
          <Button variant="danger" busy={remove.isPending} onClick={confirm}>Delete</Button>
        </>
      )}
    >
      <p className="editor__muted">
        This removes the clip and its prepared files from this project, and takes it off the timeline. The original
        file you added isn’t affected. This can’t be undone.
      </p>
    </Modal>
  );
}
