// Adds the Content-Security-Policy meta tag to the built index.html (guide 4.5). Only in a build: Vite's dev server
// needs inline scripts, injected styles and its own WebSocket, which this policy would block.
// The server's origin comes from VITE_API_BASE_URL, so the policy follows .env.
export function contentSecurityPolicy(apiBaseUrl) {
  const server = new URL(apiBaseUrl).origin;
  const policy = [
    "default-src 'self'",
    `img-src 'self' data: blob: ${server}`,
    `media-src 'self' blob: ${server}`,
    "style-src 'self'",
    "font-src 'self'",
    `connect-src 'self' ${server}`,
  ].join('; ');

  return {
    name: 'dettavo-content-security-policy',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }];
    },
  };
}
