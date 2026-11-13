// Display formats shared by every screen.

// 56000 -> "00:56"; 3723000 -> "1:02:03".
export function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.round((milliseconds ?? 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const two = (value) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${two(minutes)}:${two(seconds)}` : `${two(minutes)}:${two(seconds)}`;
}

// A project's last change, as the home cards show it: "Today", "Yesterday", a weekday within the week, then "12 Nov".
export function formatUpdated(isoTime, now = new Date()) {
  const date = new Date(isoTime);
  const startOfDay = (value) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString('en-GB', { weekday: 'long' });
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

// 1610612736 -> "1.5".
export function formatGigabytes(bytes) {
  return (bytes / 1024 ** 3).toFixed(1);
}

// "ahorra-ep3-intro.mov" -> "ahorra-ep3-intro".
export function withoutExtension(fileName) {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}
