// Joins class names, skipping anything falsy: cx('a', isOn && 'b') -> 'a b'.
export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}
