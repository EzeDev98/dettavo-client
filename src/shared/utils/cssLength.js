// Reads a length token such as --gutter ("16px") as a number of pixels, for code that must position things itself.
export function readTokenPx(name) {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
}
