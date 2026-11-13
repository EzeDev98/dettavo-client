// Uploads every added file to its clip, one after another (guide 5.1). It lives outside the screens, so going back
// to Home or opening another project does not stop an upload. XMLHttpRequest, not fetch, because only it reports
// upload progress; the file is streamed by the browser and never read into memory.
import { useSyncExternalStore } from 'react';
import { apiUrl } from '@core/http/apiUrl.js';
import { endpoints } from '@core/http/endpoints.js';

// status: 'waiting' | 'uploading' | 'done' | 'stopped' (connection lost: Try again) | 'failed' (refused, with message)
const NOTIFY_INTERVAL = 100;
const STOPPED_MESSAGE = 'Upload stopped';

let uploads = [];
let running = null;
const listeners = new Set();
let notifyTimer = null;

const keyOf = (projectId, clipId) => `${projectId}/${clipId}`;

function emitNow() {
  clearTimeout(notifyTimer);
  notifyTimer = null;
  uploads = [...uploads];
  listeners.forEach((listener) => listener());
}

// Progress events arrive many times a second; the screens hear about them at most every 100 ms.
function emitSoon() {
  if (!notifyTimer) notifyTimer = setTimeout(emitNow, NOTIFY_INTERVAL);
}

function update(key, changes, now = true) {
  const upload = uploads.find((entry) => entry.key === key);
  if (!upload) return;
  Object.assign(upload, changes);
  if (now) emitNow();
  else emitSoon();
}

function errorMessage(xhr) {
  try {
    const body = JSON.parse(xhr.responseText);
    if (body?.detail) return body.detail;
  } catch {
    // Not a ProblemDetail body.
  }
  return `The upload was refused (${xhr.status})`;
}

function startNext() {
  if (running) return;
  const next = uploads.find((entry) => entry.status === 'waiting');
  if (!next) return;

  const xhr = new XMLHttpRequest();
  running = { key: next.key, xhr };
  xhr.open('PUT', apiUrl(endpoints.clipSource(next.projectId, next.clipId)));
  xhr.setRequestHeader('X-File-Name', encodeURIComponent(next.file.name));

  xhr.upload.onprogress = (event) => update(next.key, { loaded: event.loaded }, false);
  const finish = (changes) => {
    running = null;
    update(next.key, changes);
    startNext();
  };
  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) finish({ status: 'done', loaded: next.total });
    else finish({ status: 'failed', error: errorMessage(xhr) });
  };
  xhr.onerror = () => finish({ status: 'stopped', error: STOPPED_MESSAGE });
  xhr.onabort = () => finish({ status: 'stopped', error: STOPPED_MESSAGE });

  update(next.key, { status: 'uploading', loaded: 0, error: null });
  xhr.send(next.file);
}

// items: [{ clipId, file }], in the order to upload.
export function enqueueUploads(projectId, items) {
  items.forEach(({ clipId, file }) => {
    const key = keyOf(projectId, clipId);
    uploads = uploads.filter((entry) => entry.key !== key);
    uploads.push({ key, projectId, clipId, file, status: 'waiting', loaded: 0, total: file.size, error: null });
  });
  emitNow();
  startNext();
}

// Try again after "Upload stopped". Only works while this tab still holds the file.
export function retryUpload(projectId, clipId) {
  const key = keyOf(projectId, clipId);
  const upload = uploads.find((entry) => entry.key === key);
  if (!upload || (upload.status !== 'stopped' && upload.status !== 'failed')) return false;
  update(key, { status: 'waiting', loaded: 0, error: null });
  startNext();
  return true;
}

// A clip that is being deleted stops uploading and is forgotten.
export function forgetUpload(projectId, clipId) {
  const key = keyOf(projectId, clipId);
  if (running?.key === key) running.xhr.abort();
  uploads = uploads.filter((entry) => entry.key !== key);
  emitNow();
}

// A deleted project stops uploading and is forgotten.
export function forgetProjectUploads(projectId) {
  if (running && uploads.some((entry) => entry.key === running.key && entry.projectId === projectId)) running.xhr.abort();
  uploads = uploads.filter((entry) => entry.projectId !== projectId);
  emitNow();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const snapshot = () => uploads;

// Every upload of one project, keyed by clip id. Progress is loaded / total.
export function useUploads(projectId) {
  const all = useSyncExternalStore(subscribe, snapshot);
  return Object.fromEntries(all.filter((entry) => entry.projectId === projectId).map((entry) => [entry.clipId, entry]));
}

// Closing or reloading the tab mid-upload stops it, so the browser asks first.
window.addEventListener('beforeunload', (event) => {
  if (uploads.some((entry) => entry.status === 'waiting' || entry.status === 'uploading')) {
    event.preventDefault();
  }
});
