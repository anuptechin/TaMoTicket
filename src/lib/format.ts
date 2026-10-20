export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function timeAgo(t: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

/** "2h 14m", "-1h 05m" (overdue), "38m 12s" under an hour */
export function countdown(ms: number): string {
  const neg = ms < 0;
  const abs = Math.abs(ms);
  const h = Math.floor(abs / HOUR);
  const m = Math.floor((abs % HOUR) / MIN);
  const s = Math.floor((abs % MIN) / 1000);
  const body = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(s).padStart(2, '0')}s`;
  return neg ? `-${body}` : body;
}

export function clockTime(t: number): string {
  return new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function dateTime(t: number): string {
  return new Date(t).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function shortDate(t: number): string {
  return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function duration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}

export function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
