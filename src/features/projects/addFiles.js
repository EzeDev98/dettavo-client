// Adding files from Home (Build Plan 9c): a new project named after the first file, one clip per file in order,
// then the uploads start. Nothing goes on the timeline: a clip is dragged there once it is ready (5e, decisions.md).
import { ApiError } from '@core/http/httpClient.js';
import { enqueueUploads } from '@core/upload/uploadManager.js';
import { formatGigabytes, withoutExtension } from '@shared/utils/formatting.js';
import { addClip, createProject } from './projectsApi.js';

export const isMediaFile = (file) => file.type.startsWith('video/') || file.type.startsWith('audio/');

// The server's 413 carries requiredBytes and availableBytes (guide 9).
export function addFileErrorMessage(error) {
  if (error instanceof ApiError && error.status === 413 && error.body?.requiredBytes) {
    return `Needs about ${formatGigabytes(error.body.requiredBytes)} GB free, ${formatGigabytes(error.body.availableBytes)} GB available`;
  }
  return error?.message ?? 'The file could not be added';
}

// Adds files to a project in order and queues their uploads. Stops at the first file the server refuses
// (usually not enough disk space) and returns its error, so the files before it still upload.
export async function addFilesToProject(projectId, files) {
  const added = [];
  let error = null;
  for (const file of files) {
    try {
      const clip = await addClip(projectId, file);
      added.push({ clipId: clip.id, file });
    } catch (cause) {
      error = cause;
      break;
    }
  }
  if (added.length) enqueueUploads(projectId, added);
  return { added: added.length, error };
}

// Returns { project, added, error }. project is null if nothing could be created.
export async function createProjectFromFiles(files) {
  const project = await createProject(withoutExtension(files[0].name));
  const { added, error } = await addFilesToProject(project.id, files);
  return { project, added, error };
}
