// A full server URL for the places that do not go through httpClient: event streams, uploads, <img> and <video>.
// The base URL still comes only from env.js.
import { env } from '@core/config/env.js';

export function apiUrl(path) {
  return env.apiBaseUrl + (path.startsWith('/') ? path : `/${path}`);
}
