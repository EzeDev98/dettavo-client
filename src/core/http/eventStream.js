// Server-sent event streams. The server allows the app's origin through CORS, so no credentials are needed.
import { apiUrl } from '@core/http/apiUrl.js';

export function openEventStream(path) {
  return new EventSource(apiUrl(path));
}
