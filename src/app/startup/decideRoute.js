import { env } from '@core/config/env.js';
import { queryClient } from '@core/data/queryClient.js';
import { queryKeys } from '@core/data/queryKeys.js';
import { isRunningAsApp } from '@core/pwa/isPWAInstalled.js';
import { fetchSystemStatus } from '@features/setup/systemStatus.js';
import { ROUTES } from '@app/router/routes.js';

// Longest a launch waits for the local service to say whether its tools are ready. After this it lands on Home and
// AppShell takes over (it shows Service down or Setup as soon as it knows).
const STATUS_WAIT_MS = 3000;

const tooSlow = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('Too slow')), ms));

// true: every tool is ready. false: one is missing. null: could not tell (the service is down or slow).
// Reading it also fills the status query, so AppShell finds it fresh and shows no spinner after the loading screen.
async function areToolsReady() {
  try {
    const status = await Promise.race([
      queryClient.fetchQuery({ queryKey: queryKeys.system.status(), queryFn: () => fetchSystemStatus() }),
      tooSlow(STATUS_WAIT_MS),
    ]);
    return Boolean(status.ready);
  } catch {
    return null;
  }
}

export async function decideRoute() {
  // Only the installed app's own window goes on. A browser tab stays on Onboarding, even where the app is installed.
  const installed = env.skipInstallGuard || isRunningAsApp();
  if (!installed) return null;

  const ready = await areToolsReady();
  if (ready === false) return ROUTES.setup;

  // null (service down or slow) also lands on Home: AppShell shows Service down there and recovers on its own.
  return ROUTES.projects;
}
