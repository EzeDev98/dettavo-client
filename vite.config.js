import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const src = (path) => fileURLToPath(new URL(`./src/${path}`, import.meta.url));

// Keep these aliases in sync with jsconfig.json.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 2061,
    strictPort: true,
    host: '127.0.0.1',
  },
  preview: { port: 2061, strictPort: true, host: '127.0.0.1' },
  resolve: {
    alias: {
      '@': src(''),
      '@app': src('app'),
      '@core': src('core'),
      '@features': src('features'),
      '@shared': src('shared'),
    },
  },
});
