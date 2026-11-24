import { apiUrl } from '@core/http/apiUrl.js';
import { endpoints } from '@core/http/endpoints.js';
import { httpClient } from '@core/http/httpClient.js';

const ifMatch = (revision) => `"${revision}"`;

// Resolves with { revision }, the new revision. A 409 (another window saved first) rejects with ApiError.isConflict.
export const saveEdits = (projectId, revision, edits) =>
  httpClient.put(endpoints.projectEdits(projectId), edits, { headers: { 'If-Match': ifMatch(revision) } });

// The last save as the page goes away: keepalive lets it finish after the tab closes. Nothing waits for the answer.
export function saveEditsOnExit(projectId, revision, edits) {
  try {
    fetch(apiUrl(endpoints.projectEdits(projectId)), {
      method: 'PUT',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', 'If-Match': ifMatch(revision) },
      body: JSON.stringify(edits),
    }).catch(() => {});
  } catch {
    // The page is going away; there is nothing left to tell.
  }
}

export const loadProject = (projectId) => httpClient.get(endpoints.project(projectId));
