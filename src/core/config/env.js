// The only place environment values are read. Nothing else in the app writes a URL.
const raw = import.meta.env.VITE_API_BASE_URL;

if (!raw) {
  throw new Error('VITE_API_BASE_URL is not set. Copy .env.example to .env and restart the dev server.');
}

// Throws on a value that is not an absolute URL.
new URL(raw);

export const env = Object.freeze({
  // Includes the server's base path (/api/v1), no trailing slash.
  apiBaseUrl: raw.replace(/\/+$/, ''),
});
