// Server-sent event streams. withCredentials sends the pairing cookie (te_session) across the two loopback ports.
import { apiUrl } from '@core/http/apiUrl.js';

export function openEventStream(path) {
  return new EventSource(apiUrl(path), { withCredentials: true });
}
