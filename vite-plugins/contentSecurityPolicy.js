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
