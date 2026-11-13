import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { contentSecurityPolicy } from './vite-plugins/contentSecurityPolicy.js';
import { dettavoServiceWorker, makeBuildId } from './vite-plugins/dettavoServiceWorker.js';

const src = (path) => fileURLToPath(new URL(`./src/${path}`, import.meta.url));

// One id per build: stamped into sw.js, version.json and the app bundle, so the app can tell when a newer build exists.
const BUILD_ID = makeBuildId(process.cwd());

// Keep these aliases in sync with jsconfig.json.
export default defineConfig(({ mode }) => {
  const { VITE_API_BASE_URL } = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react(), contentSecurityPolicy(VITE_API_BASE_URL), dettavoServiceWorker(BUILD_ID)],
    define: { __APP_BUILD_ID__: JSON.stringify(BUILD_ID) },
    server: { port: 2061, strictPort: true, host: 'localhost' },
    preview: { port: 2061, strictPort: true, host: 'localhost' },
    resolve: {
      alias: {
        '@': src(''),
        '@app': src('app'),
        '@core': src('core'),
        '@features': src('features'),
        '@shared': src('shared'),
      },
    },
  };
});
