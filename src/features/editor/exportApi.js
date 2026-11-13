// Exporting the timeline (guide 8.9, Build Plan 18): start the job, cancel it, find the finished file, show it in
// Finder or download it. Every export is STANDARD quality; the dialog has no quality choice (prototype).
import { apiUrl } from '@core/http/apiUrl.js';
import { endpoints } from '@core/http/endpoints.js';
import { httpClient } from '@core/http/httpClient.js';

const STORAGE_KEY = 'dettavo.export';

// Resolves with the EXPORT job. 409 while a timeline clip is not ready or an export is queued; 400 with nothing left.
export const startExport = (projectId, format) =>
  httpClient.post(endpoints.projectExport(projectId), { format, quality: 'STANDARD' });

export const cancelJob = (jobId) => httpClient.post(endpoints.jobCancel(jobId));

// Finished exports, newest first: [{ file, bytes, durationMs, createdAt }].
export const listExports = (projectId) => httpClient.get(endpoints.projectExports(projectId));

export const revealExport = (projectId, file) => httpClient.post(endpoints.exportReveal(projectId, file));

// The server sends the file as an attachment with its name, so following the link downloads it.
export function downloadExport(projectId, file) {
  const link = document.createElement('a');
  link.href = apiUrl(endpoints.exportFile(projectId, file));
  link.download = file;
  document.body.append(link);
  link.click();
  link.remove();
}

// The last format used (18d), kept in this browser. Storage can be missing; MP4 is the default then.
export function loadExportFormat() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').format ?? 'MP4';
  } catch {
    return 'MP4';
  }
}

export function saveExportFormat(format) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ format }));
  } catch {
    // Not remembered; the next dialog opens on the default.
  }
}
