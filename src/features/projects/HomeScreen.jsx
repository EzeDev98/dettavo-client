import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import TopBar, { Brand, Spacer } from '@shared/components/layout/TopBar.jsx';
import Button from '@shared/components/ui/Button.jsx';
import FilePicker from '@shared/components/ui/FilePicker.jsx';
import Modal from '@shared/components/ui/Modal.jsx';
import Spinner from '@shared/components/ui/Spinner.jsx';
import { useToast } from '@shared/components/ui/toastContext.js';
import useFileDrop from '@shared/hooks/useFileDrop.js';
import { cx } from '@shared/utils/classNames.js';
import { forgetProjectUploads } from '@core/upload/uploadManager.js';
import { queryKeys } from '@core/data/queryKeys.js';
import { projectPath } from '@app/router/routes.js';
import { useDeleteProject, useProjects, useRenameProject } from './projectsApi.js';
import { addFileErrorMessage, createProjectFromFiles, isMediaFile } from './addFiles.js';
import ProjectCard from './ProjectCard.jsx';
import './home.css';

export default function HomeScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const pickerRef = useRef(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const projects = useProjects();
  const rename = useRenameProject();
  const remove = useDeleteProject();

  const addFiles = async (picked) => {
    if (adding) return;
    const files = picked.filter(isMediaFile);
    if (!files.length) {
      toast.show('Choose a video or audio file', { tone: 'error' });
      return;
    }
    setAdding(true);
    try {
      const { project, error } = await createProjectFromFiles(files);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });
      if (error) toast.show(addFileErrorMessage(error), { tone: 'error' });
      navigate(projectPath(project.id));
    } catch (error) {
      toast.show(addFileErrorMessage(error), { tone: 'error' });
      setAdding(false);
    }
  };

  const over = useFileDrop(addFiles);

  const handleRename = (project, name) => {
    rename.mutate({ projectId: project.id, name }, {
      onError: (error) => toast.show(error.message, { tone: 'error' }),
    });
  };

  const confirmDelete = () => {
    const project = deleting;
    remove.mutate(project.id, {
      onSuccess: () => {
        forgetProjectUploads(project.id);
        setDeleting(null);
      },
      onError: (error) => toast.show(error.message, { tone: 'error' }),
    });
  };

  return (
    <div className="home">
      <TopBar>
        <Brand />
        <Spacer />
      </TopBar>

      <div className="home__body">
        <button
          type="button"
          className={cx('home__add', over && 'home__add--over')}
          disabled={adding}
          onClick={() => pickerRef.current?.click()}
        >
          {adding ? <Spinner label="Creating the project" /> : <Plus className="home__add-icon" aria-hidden="true" />}
          Add video or audio for editing
        </button>
        <FilePicker ref={pickerRef} onFiles={addFiles} />

        <section>
          <h2 className="home__heading">Projects</h2>
          <ProjectList
            query={projects}
            onOpen={(project) => navigate(projectPath(project.id))}
            onRename={handleRename}
            onDelete={setDeleting}
          />
        </section>
      </div>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={deleting ? `Delete “${deleting.name}”?` : ''}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)} data-autofocus>Cancel</Button>
            <Button variant="danger" busy={remove.isPending} onClick={confirmDelete}>Delete</Button>
          </>
        )}
      >
        <p className="home__muted">
          This removes the project and its copy of the recordings from this computer. The original files you added
          aren’t affected.
        </p>
      </Modal>
    </div>
  );
}

function ProjectList({ query, onOpen, onRename, onDelete }) {
  if (query.isPending) return <Spinner label="Loading projects" />;
  if (query.isError) {
    return (
      <div className="home__problem">
        <p className="home__muted">{query.error.message}</p>
        <Button variant="secondary" busy={query.isFetching} onClick={() => query.refetch()}>Try again</Button>
      </div>
    );
  }
  if (!query.data.length) return <p className="home__muted">No projects yet. Add a video or audio file to start.</p>;

  return (
    <div className="home__grid">
      {query.data.map((project) => (
        <ProjectCard key={project.id} project={project} onOpen={onOpen} onRename={onRename} onDelete={onDelete} />
      ))}
    </div>
  );
}
