// The server's status (GET /system/status) and pairing (POST /session/pair). The status call is open without
// pairing, so it answers three questions at once: is the server running, is this browser paired, are the tools ready.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@core/http/httpClient.js';
import { endpoints } from '@core/http/endpoints.js';
import { queryKeys } from '@core/data/queryKeys.js';

// Guide 9: while the server is down the app retries every 3 s and recovers on its own.
const STATUS_POLL_INTERVAL = 3_000;

export const fetchSystemStatus = ({ refresh = false } = {}) =>
  httpClient.get(endpoints.systemStatus, { params: refresh ? { refresh: true } : undefined });

// Shared by the app shell and the status bar: one request every 3 s, however many places read it.
export function useSystemStatus() {
  return useQuery({
    queryKey: queryKeys.system.status(),
    queryFn: () => fetchSystemStatus(),
    refetchInterval: STATUS_POLL_INTERVAL,
    refetchIntervalInBackground: false,
    retry: false,
  });
}

// "Check again" on the setup screen: the server looks for the tools again.
export function useRefreshSystemStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchSystemStatus({ refresh: true }),
    onSuccess: (status) => queryClient.setQueryData(queryKeys.system.status(), status),
  });
}

export function usePairBrowser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key) => httpClient.post(endpoints.sessionPair, { key }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.system.all }),
  });
}

// "~/Dettavo/models/ggml-small.en.bin" -> "small.en", as the status bar shows it.
export function modelName(modelPath) {
  if (!modelPath) return null;
  const file = modelPath.split('/').pop();
  return file.replace(/^ggml-/, '').replace(/\.bin$/, '');
}
EOFmkdir -p src/features/setup
cat > src/features/setup/systemStatus.js <<'EOF'
// The server's status (GET /system/status) and pairing (POST /session/pair). The status call is open without
// pairing, so it answers three questions at once: is the server running, is this browser paired, are the tools ready.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@core/http/httpClient.js';
import { endpoints } from '@core/http/endpoints.js';
import { queryKeys } from '@core/data/queryKeys.js';

// Guide 9: while the server is down the app retries every 3 s and recovers on its own.
const STATUS_POLL_INTERVAL = 3_000;

export const fetchSystemStatus = ({ refresh = false } = {}) =>
  httpClient.get(endpoints.systemStatus, { params: refresh ? { refresh: true } : undefined });

// Shared by the app shell and the status bar: one request every 3 s, however many places read it.
export function useSystemStatus() {
  return useQuery({
    queryKey: queryKeys.system.status(),
    queryFn: () => fetchSystemStatus(),
    refetchInterval: STATUS_POLL_INTERVAL,
    refetchIntervalInBackground: false,
    retry: false,
  });
}

// "Check again" on the setup screen: the server looks for the tools again.
export function useRefreshSystemStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchSystemStatus({ refresh: true }),
    onSuccess: (status) => queryClient.setQueryData(queryKeys.system.status(), status),
  });
}

export function usePairBrowser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key) => httpClient.post(endpoints.sessionPair, { key }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.system.all }),
  });
}

// "~/Dettavo/models/ggml-small.en.bin" -> "small.en", as the status bar shows it.
export function modelName(modelPath) {
  if (!modelPath) return null;
  const file = modelPath.split('/').pop();
  return file.replace(/^ggml-/, '').replace(/\.bin$/, '');
}
