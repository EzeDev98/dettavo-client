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

// 1 -> "1 clip"; 3 -> "3 clips".
export function formatClipCount(count) {
  return `${count} clip${count === 1 ? '' : 's'}`;
}

// A timeline time, floored to the second: 59600 -> "00:59". Minutes keep counting past 60.
export function formatClock(milliseconds) {
  const seconds = Math.max(0, Math.floor((milliseconds ?? 0) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

// A precise time, floored to the tenth: 1400 -> "00:01.4"; 75012300 -> "1250:12.3".
export function formatTimecode(milliseconds) {
  const tenths = Math.max(0, Math.floor((milliseconds ?? 0) / 100));
  const minutes = Math.floor(tenths / 600);
  const secondTenths = tenths % 600;
  return `${String(minutes).padStart(2, '0')}:${String(Math.floor(secondTenths / 10)).padStart(2, '0')}.${secondTenths % 10}`;
}

// A job's estimated time left (guide 9): "Less than a minute left", "About 4 min left", "About 1 h 20 min left".
export function formatTimeLeft(seconds) {
  if (seconds < 60) return 'Less than a minute left';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `About ${minutes} min left`;
  return `About ${Math.floor(minutes / 60)} h ${minutes % 60} min left`;
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
