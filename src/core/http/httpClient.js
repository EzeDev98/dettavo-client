// The only place the app talks to dettavo-server. Ahorra's client, without tokens or cookies: every request goes to
// the base URL from env.js, and the server accepts it because it comes from the app's own origin.
import { env } from '@core/config/env.js';

const FALLBACK_MESSAGES = {
  0: "Dettavo's local service isn't running. Start dettavo-server and try again.",
  403: 'The local service refused this request.',
  404: 'Not found.',
  409: 'This changed somewhere else. Reload and try again.',
  413: 'There is not enough disk space for this.',
  422: 'This file cannot be read as audio or video.',
};

function fallbackMessage(status) {
  if (FALLBACK_MESSAGES[status]) return FALLBACK_MESSAGES[status];
  return status >= 500 ? 'The local service had a problem. See its log for details.' : 'Something went wrong. Please try again.';
}

const text = (value) => (typeof value === 'string' && value.trim() ? value : null);
const plainObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : null);

// status 0 means the request never reached the server (it is not running).
export class ApiError extends Error {
  constructor({ status, message, code = null, fieldErrors = null, body = null, cause }) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.body = body;
  }

  get isNetwork() { return this.status === 0; }
  get isForbidden() { return this.status === 403; }
  get isNotFound() { return this.status === 404; }
  get isConflict() { return this.status === 409; }
  get isUnsupportedMedia() { return this.status === 422; }
}

function buildUrl(path, params) {
  const url = new URL(env.apiBaseUrl + (path.startsWith('/') ? path : `/${path}`));
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  return url;
}

async function readBody(response) {
  if (response.status === 204) return null;
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

// The server's errors are ProblemDetail (RFC 9457): { status, title, detail, instance, code, ...extras }.
function toApiError(status, body) {
  const data = plainObject(body) ?? {};
  return new ApiError({
    status,
    message: text(data.detail) ?? fallbackMessage(status),
    code: text(data.code),
    fieldErrors: plainObject(data.errors),
    body,
  });
}

// options: { params, headers, signal }. Resolves with the parsed body (null for 204).
async function request(method, path, { body, params, headers, signal } = {}) {
  const requestHeaders = { Accept: 'application/json', ...headers };
  const payload = body === undefined ? undefined : JSON.stringify(body);
  if (payload !== undefined) requestHeaders['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers: requestHeaders,
      body: payload,
      signal,
    });
  } catch (cause) {
    if (cause?.name === 'AbortError') throw cause;
    throw new ApiError({ status: 0, message: fallbackMessage(0), cause });
  }

  const responseBody = await readBody(response);
  if (!response.ok) throw toApiError(response.status, responseBody);
  return responseBody;
}

export const httpClient = {
  get: (path, options) => request('GET', path, options),
  post: (path, body, options) => request('POST', path, { ...options, body }),
  put: (path, body, options) => request('PUT', path, { ...options, body }),
  patch: (path, body, options) => request('PATCH', path, { ...options, body }),
  delete: (path, options) => request('DELETE', path, options),
};
