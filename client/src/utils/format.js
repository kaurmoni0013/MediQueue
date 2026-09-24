/** Date/time formatting helpers shared across the app. */

export function to12(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function todayKey() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dateKeyOffset(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "Thu, 24 Sep 2026" style for a YYYY-MM-DD key. */
export function prettyDate(key) {
  if (!key) return '—';
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** "Today 10:30 AM" — used on appointment cards. */
export function prettyDateTime(key, hhmm) {
  if (!key) return '—';
  const base = prettyDate(key);
  const label = base.replace(new RegExp(String(new Date().getFullYear())), '').trim().replace(/, +$/, '');
  const prefix = key === todayKey() ? 'Today' : label;
  const short = prefix.replace(/\s\d{4}$/, '');
  return hhmm ? `${short} · ${to12(hhmm)}` : short;
}

export function waitLabel(minutes) {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes === 0) return 'Now';
  return `~${Math.round(minutes)} min`;
}

export function fromNow(iso) {
  if (!iso) return '';
  const diff = new Date() - new Date(iso);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}

export function ordinal(n) {
  if (!n) return '';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export const STATUS_LABELS = {
  SCHEDULED: 'Scheduled',
  WAITING: 'Waiting',
  IN_CONSULT: 'In Consult',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const STATUS_ORDER = ['SCHEDULED', 'WAITING', 'IN_CONSULT', 'COMPLETED'];