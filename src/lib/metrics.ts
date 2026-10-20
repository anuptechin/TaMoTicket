import type { Channel, Desk, DeskFilter, Priority, Ticket } from '../types';
import { CHANNEL_KEYS, DESK_KEYS, isOpen, PRIORITY_KEYS } from './meta';
import { slaConsumed, slaState } from './sla';
import { DAY, HOUR, shortDate, startOfDay } from './format';

export const byDesk = (tickets: Ticket[], desk: DeskFilter) => (desk === 'all' ? tickets : tickets.filter((t) => t.desk === desk));

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export interface Kpis {
  open: number;
  newToday: number;
  ackMedian: number;
  slaCompliance: number;
  aiResolution: number;
  fcr: number;
  csat: number;
  missed: number;
  atRisk: number;
  breachedOpen: number;
  escalated: number;
  reopenRate: number;
  pending: number;
  closed: number;
  total: number;
}

export function computeKpis(all: Ticket[], now: number): Kpis {
  const tickets = all.filter((t) => !t.mergedInto);
  const done = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed');
  const open = tickets.filter((t) => isOpen(t.status));
  const met = done.filter((t) => slaState(t.sla, t.status, now, t.resolvedAt) === 'met').length;
  const rated = done.filter((t) => t.csat);
  return {
    open: open.length,
    newToday: tickets.filter((t) => t.createdAt >= startOfDay(now)).length,
    ackMedian: median(tickets.map((t) => t.ackSec)),
    slaCompliance: done.length ? (met / done.length) * 100 : 100,
    aiResolution: done.length ? (done.filter((t) => t.aiResolved).length / done.length) * 100 : 0,
    fcr: done.length ? (done.filter((t) => t.fcr).length / done.length) * 100 : 0,
    csat: rated.length ? rated.reduce((s, t) => s + (t.csat ?? 0), 0) / rated.length : 0,
    missed: 0,
    atRisk: open.filter((t) => slaState(t.sla, t.status, now) === 'at_risk').length,
    breachedOpen: open.filter((t) => slaState(t.sla, t.status, now) === 'breached').length,
    escalated: open.filter((t) => t.escalationLevel >= 2).length,
    reopenRate: done.length ? (done.filter((t) => t.reopened).length / done.length) * 100 : 0,
    pending: tickets.filter((t) => t.status === 'pending' || t.status === 'awaiting').length,
    closed: done.length,
    total: tickets.length,
  };
}

/** Daily counts for the last `days` days (oldest first). */
export function dailySeries(tickets: Ticket[], now: number, days: number, pick: (t: Ticket) => boolean = () => true) {
  const start = startOfDay(now) - (days - 1) * DAY;
  const out = Array.from({ length: days }, (_, i) => ({ day: shortDate(start + i * DAY), v: 0 }));
  tickets.forEach((t) => {
    const idx = Math.floor((t.createdAt - start) / DAY);
    if (idx >= 0 && idx < days && pick(t)) out[idx].v++;
  });
  return out;
}

export function volumeByChannel(tickets: Ticket[], now: number, days = 30) {
  const start = startOfDay(now) - (days - 1) * DAY;
  const out = Array.from({ length: days }, (_, i) => {
    const row: Record<string, number | string> = { day: shortDate(start + i * DAY) };
    CHANNEL_KEYS.forEach((c) => (row[c] = 0));
    return row;
  });
  tickets.forEach((t) => {
    const idx = Math.floor((t.createdAt - start) / DAY);
    if (idx >= 0 && idx < days) (out[idx][t.channel] as number)++;
  });
  return out;
}

export function slaByDesk(tickets: Ticket[], now: number) {
  return DESK_KEYS.map((desk) => {
    const done = tickets.filter((t) => t.desk === desk && (t.status === 'resolved' || t.status === 'closed'));
    const met = done.filter((t) => slaState(t.sla, t.status, now, t.resolvedAt) === 'met').length;
    return { desk, compliance: done.length ? Math.round((met / done.length) * 1000) / 10 : 100, total: done.length };
  });
}

export function priorityMix(tickets: Ticket[]) {
  return PRIORITY_KEYS.map((p: Priority) => ({ priority: p, count: tickets.filter((t) => t.priority === p && isOpen(t.status)).length }));
}

export const AGEING_BUCKETS = [
  { key: '0-4', label: '0–4 h', min: 0, max: 4 },
  { key: '4-12', label: '4–12 h', min: 4, max: 12 },
  { key: '12-24', label: '12–24 h', min: 12, max: 24 },
  { key: '24-48', label: '24–48 h', min: 24, max: 48 },
  { key: '48+', label: '48 h+', min: 48, max: Infinity },
];

export function ageing(tickets: Ticket[], now: number) {
  return AGEING_BUCKETS.map((b) => ({
    ...b,
    count: tickets.filter((t) => {
      if (!isOpen(t.status)) return false;
      const h = (now - t.createdAt) / HOUR;
      return h >= b.min && h < b.max;
    }).length,
  }));
}

export function channelSplit(tickets: Ticket[]) {
  return CHANNEL_KEYS.map((c: Channel) => ({ channel: c, count: tickets.filter((t) => t.channel === c).length }));
}

export function atRiskList(tickets: Ticket[], now: number) {
  return tickets
    .filter((t) => isOpen(t.status) && !t.sla.pausedAt)
    .map((t) => ({ t, c: slaConsumed(t.sla, now) }))
    .filter((x) => x.c >= 0.7)
    .sort((a, b) => a.t.sla.resolutionDueAt - now - (b.t.sla.resolutionDueAt - now))
    .map((x) => x.t);
}

/**
 * Customer effort score on a 1–7 scale (7 = effortless): every extra customer contact,
 * transfer, escalation or reopen costs the customer effort.
 */
export function effortScore(t: Ticket): number {
  const contacts = t.interactions.filter((i) => i.direction === 'in' && i.type !== 'event' && i.type !== 'note').length;
  const points =
    Math.max(0, contacts - 1) * 1.2 +
    (t.transfer ? 1.2 : 0) +
    (t.reopened ? 1.5 : 0) +
    (t.escalationLevel >= 2 ? 1 : 0) +
    (t.sentiment === 'negative' ? 1.8 : 0) -
    (t.aiResolved ? 0.6 : 0);
  return Math.min(7, Math.max(1, 6.8 - points));
}

export interface HeatCell {
  desk: Desk;
  category: string;
  n: number;
  negative: number;
  ces: number;
}

/** Sentiment and effort by desk × category over the given tickets. */
export function sentimentHeatmap(tickets: Ticket[]) {
  const cats = categoryCounts(tickets).map((c) => c.category);
  const cells: HeatCell[] = [];
  DESK_KEYS.forEach((desk) =>
    cats.forEach((category) => {
      const ts = tickets.filter((t) => t.desk === desk && t.category === category);
      cells.push({
        desk,
        category,
        n: ts.length,
        negative: ts.length ? ts.filter((t) => t.sentiment === 'negative').length / ts.length : 0,
        ces: ts.length ? ts.reduce((s, t) => s + effortScore(t), 0) / ts.length : 0,
      });
    }),
  );
  const deskCes = DESK_KEYS.map((desk) => {
    const ts = tickets.filter((t) => t.desk === desk);
    return { desk, ces: ts.length ? ts.reduce((s, t) => s + effortScore(t), 0) / ts.length : 0, negative: ts.length ? ts.filter((t) => t.sentiment === 'negative').length / ts.length : 0 };
  });
  return { cats: cats.filter((c) => cells.some((x) => x.category === c && x.n > 0)), cells, deskCes };
}

export function categoryCounts(tickets: Ticket[]) {
  const m = new Map<string, number>();
  tickets.forEach((t) => m.set(t.category, (m.get(t.category) ?? 0) + 1));
  return [...m.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
}
