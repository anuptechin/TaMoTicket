import type { Priority, SLAPolicy, SlaState, Status, TicketSla } from '../types';

/** Working calendar. Days use JS numbering (0 = Sunday … 6 = Saturday). */
export interface BusinessCalendar {
  days: number[];
  startMin: number;
  endMin: number;
  holidays: string[];
}

export const DEFAULT_CALENDAR: BusinessCalendar = {
  days: [1, 2, 3, 4, 5, 6],
  startMin: 9 * 60,
  endMin: 18 * 60,
  holidays: ['2026-01-26', '2026-03-04', '2026-08-15', '2026-10-02', '2026-11-09', '2026-12-25'],
};

export const DEFAULT_POLICIES: SLAPolicy[] = [
  { priority: 'P1', label: 'Critical', responseH: 3, resolutionH: 12 },
  { priority: 'P2', label: 'High', responseH: 6, resolutionH: 24 },
  { priority: 'P3', label: 'Medium', responseH: 12, resolutionH: 48 },
  { priority: 'P4', label: 'Low', responseH: 24, resolutionH: 72 },
];

const MIN = 60_000;
const HOUR = 60 * MIN;

export function dateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function isWorkingDay(d: Date, cal: BusinessCalendar): boolean {
  return cal.days.includes(d.getDay()) && !cal.holidays.includes(dateKey(d));
}

function atMinute(d: Date, minute: number): Date {
  const x = new Date(d);
  x.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  return x;
}

/** Moves a time forward to the next moment that is inside business hours. */
export function nextBusinessMoment(t: number, cal: BusinessCalendar = DEFAULT_CALENDAR): number {
  let d = new Date(t);
  for (let guard = 0; guard < 400; guard++) {
    if (isWorkingDay(d, cal)) {
      const open = atMinute(d, cal.startMin).getTime();
      const close = atMinute(d, cal.endMin).getTime();
      if (d.getTime() < open) return open;
      if (d.getTime() < close) return d.getTime();
    }
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    d = atMinute(next, cal.startMin);
  }
  return t;
}

/** Adds business hours to a start time, skipping nights, non-working days and holidays. */
export function addBusinessHours(start: number, hours: number, cal: BusinessCalendar = DEFAULT_CALENDAR): number {
  let remaining = Math.round(hours * HOUR);
  let t = nextBusinessMoment(start, cal);
  for (let guard = 0; guard < 400 && remaining > 0; guard++) {
    const close = atMinute(new Date(t), cal.endMin).getTime();
    const available = close - t;
    if (remaining <= available) return t + remaining;
    remaining -= available;
    t = nextBusinessMoment(close + 1, cal);
  }
  return t;
}

/** Business milliseconds elapsed between two times. */
export function businessMsBetween(a: number, b: number, cal: BusinessCalendar = DEFAULT_CALENDAR): number {
  if (b <= a) return 0;
  let total = 0;
  let t = nextBusinessMoment(a, cal);
  for (let guard = 0; guard < 400 && t < b; guard++) {
    const close = atMinute(new Date(t), cal.endMin).getTime();
    total += Math.min(close, b) - t;
    t = nextBusinessMoment(close + 1, cal);
  }
  return total;
}

export function policyFor(priority: Priority, policies: SLAPolicy[] = DEFAULT_POLICIES): SLAPolicy {
  return policies.find((p) => p.priority === priority) ?? DEFAULT_POLICIES[2];
}

export function computeSla(
  start: number,
  priority: Priority,
  policies: SLAPolicy[] = DEFAULT_POLICIES,
  cal: BusinessCalendar = DEFAULT_CALENDAR,
): TicketSla {
  const p = policyFor(priority, policies);
  return {
    startAt: start,
    responseDueAt: addBusinessHours(start, p.responseH, cal),
    resolutionDueAt: addBusinessHours(start, p.resolutionH, cal),
    pausedMs: 0,
  };
}

export function pauseSla(sla: TicketSla, now: number): TicketSla {
  if (sla.pausedAt) return sla;
  return { ...sla, pausedAt: now };
}

/** Resuming shifts both due times by the time spent paused. */
export function resumeSla(sla: TicketSla, now: number): TicketSla {
  if (!sla.pausedAt) return sla;
  const delta = Math.max(0, now - sla.pausedAt);
  return {
    ...sla,
    pausedAt: undefined,
    pausedMs: sla.pausedMs + delta,
    responseDueAt: sla.responseDueAt + delta,
    resolutionDueAt: sla.resolutionDueAt + delta,
  };
}

/** Fraction of the resolution SLA consumed (0 … >1). */
export function slaConsumed(sla: TicketSla, now: number): number {
  const effective = sla.pausedAt ?? now;
  // Time spent paused counts neither as elapsed nor as part of the window.
  const span = sla.resolutionDueAt - sla.startAt - sla.pausedMs;
  if (span <= 0) return 1;
  return (effective - sla.startAt - sla.pausedMs) / span;
}

export function slaState(sla: TicketSla, status: Status, now: number, resolvedAt?: number): SlaState {
  if (status === 'resolved' || status === 'closed') {
    return (resolvedAt ?? now) <= sla.resolutionDueAt ? 'met' : 'breached';
  }
  if (sla.pausedAt) return 'paused';
  const c = slaConsumed(sla, now);
  if (c >= 1) return 'breached';
  if (c >= 0.75) return 'at_risk';
  return 'on_track';
}

export interface EscalationStep {
  level: number;
  who: string;
  trigger: string;
  offsetH: number | null;
}

export const ESCALATION_LADDER: EscalationStep[] = [
  { level: 1, who: 'Ticket owner', trigger: 'At 75% of SLA', offsetH: null },
  { level: 2, who: 'Supervisor', trigger: 'On breach', offsetH: 0 },
  { level: 3, who: 'Manager', trigger: 'Breach + 4 h', offsetH: 4 },
  { level: 4, who: 'Function head', trigger: 'Breach + 12 h', offsetH: 12 },
];

/** Which escalation level a ticket should be at, given how far past breach it is. */
export function escalationLevelFor(sla: TicketSla, now: number): number {
  const c = slaConsumed(sla, now);
  if (c < 0.75) return 0;
  if (c < 1) return 1;
  const over = (sla.pausedAt ?? now) - sla.resolutionDueAt;
  if (over >= 12 * HOUR) return 4;
  if (over >= 4 * HOUR) return 3;
  return 2;
}
