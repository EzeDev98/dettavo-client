// The single query cache. Data is kept in memory only. Use isPending (no data yet) for a spinner and never
// isFetching, so a background refresh never makes the UI blink.
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@core/http/httpClient.js';

// Retry only server errors, and only twice. A server that is not running (status 0) is not retried here:
// the status bar polls instead. Client errors (400, 401, 403, 404, 409, 413, 422) never retry.
function shouldRetry(failureCount, error) {
  if (!(error instanceof ApiError)) return false;
  return error.status >= 500 && failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      retry: shouldRetry,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: { retry: false },
  },
});
