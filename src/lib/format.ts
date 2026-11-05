/** Readout formatting. Fixed widths so values update in place. */

export function formatLat(lat: number, digits = 4) {
  const v = Math.abs(lat).toFixed(digits).padStart(digits + 3, '0');
  return `${v}° ${lat >= 0 ? 'N' : 'S'}`;
}

export function formatLon(lon: number, digits = 4) {
  const v = Math.abs(lon).toFixed(digits).padStart(digits + 4, '0');
  return `${v}° ${lon >= 0 ? 'E' : 'W'}`;
}

const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0');

/** 3 725 000 ms → "01:02:05". Negative values clamp to zero. */
export function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(s / 3600)}:${pad((s / 60) % 60)}:${pad(s % 60)}`;
}

/** "2026-11-05 14:32:07" in UTC. */
export function formatUtc(ms: number) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(
    d.getUTCHours()
  )}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export function formatUtcTime(ms: number) {
  const d = new Date(ms);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** "10 Dec 2026" */
export function formatDate(iso: string) {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "09:42 UTC" */
export function formatTimeUtc(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

/** "Six" for 6; digits above twelve. Capitalized for the start of a sentence. */
export function countWord(n: number) {
  return WORDS[n] ?? String(n);
}
