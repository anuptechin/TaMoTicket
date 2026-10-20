import { describe, expect, it } from 'vitest';
import {
  addBusinessHours,
  businessMsBetween,
  computeSla,
  escalationLevelFor,
  nextBusinessMoment,
  pauseSla,
  resumeSla,
  slaState,
  type BusinessCalendar,
} from './sla';

const cal: BusinessCalendar = {
  days: [1, 2, 3, 4, 5, 6],
  startMin: 9 * 60,
  endMin: 18 * 60,
  holidays: ['2026-10-02'],
};

const H = 3_600_000;
// Local-time constructor so tests are timezone independent. Month is 0-based (9 = October).
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime();

describe('nextBusinessMoment', () => {
  it('keeps a time inside business hours', () => {
    expect(nextBusinessMoment(at(19, 11), cal)).toBe(at(19, 11)); // Monday
  });
  it('snaps an early-morning time to opening', () => {
    expect(nextBusinessMoment(at(19, 7, 30), cal)).toBe(at(19, 9));
  });
  it('moves an evening time to the next working morning', () => {
    expect(nextBusinessMoment(at(19, 20), cal)).toBe(at(20, 9));
  });
  it('skips Sunday', () => {
    expect(nextBusinessMoment(at(18, 12), cal)).toBe(at(19, 9)); // Sunday → Monday
  });
  it('skips a holiday', () => {
    expect(nextBusinessMoment(at(2, 10), cal)).toBe(at(3, 9)); // Fri 2 Oct holiday → Sat 3 Oct
  });
});

describe('addBusinessHours', () => {
  it('adds within the same day', () => {
    expect(addBusinessHours(at(19, 10), 3, cal)).toBe(at(19, 13));
  });
  it('rolls over the end of the day', () => {
    // 16:00 + 3 h = 2 h today, 1 h tomorrow → 10:00 next day
    expect(addBusinessHours(at(19, 16), 3, cal)).toBe(at(20, 10));
  });
  it('treats Saturday as a working day and skips Sunday', () => {
    // Sat 24 Oct 17:00 + 2 h → 1 h Sat, 1 h Monday → Mon 26 Oct 10:00
    expect(addBusinessHours(at(24, 17), 2, cal)).toBe(at(26, 10));
  });
  it('skips a holiday in the middle', () => {
    // Thu 1 Oct 17:00 + 2 h → 1 h Thu, holiday Fri, 1 h Sat → Sat 3 Oct 10:00
    expect(addBusinessHours(at(1, 17), 2, cal)).toBe(at(3, 10));
  });
  it('starts the clock at opening for after-hours tickets', () => {
    expect(addBusinessHours(at(19, 22), 3, cal)).toBe(at(20, 12));
  });
  it('handles a 72 h P4 window across many days', () => {
    // 9 h per day → 72 h = 8 working days. Mon 19 Oct 09:00 → end of Tue 27 Oct (Sunday skipped)
    expect(addBusinessHours(at(19, 9), 72, cal)).toBe(at(27, 18));
  });
});

describe('businessMsBetween', () => {
  it('counts only working time', () => {
    expect(businessMsBetween(at(19, 16), at(20, 10), cal)).toBe(3 * H);
  });
  it('returns zero for reversed ranges', () => {
    expect(businessMsBetween(at(20, 10), at(19, 10), cal)).toBe(0);
  });
  it('is the inverse of addBusinessHours', () => {
    const start = at(23, 15, 30);
    const end = addBusinessHours(start, 12, cal);
    expect(businessMsBetween(start, end, cal)).toBe(12 * H);
  });
});

describe('computeSla and state', () => {
  it('uses the P1 3 h / 12 h policy', () => {
    const sla = computeSla(at(19, 9), 'P1', undefined, cal);
    expect(sla.responseDueAt).toBe(at(19, 12));
    expect(sla.resolutionDueAt).toBe(at(20, 12));
  });
  it('moves through on track → at risk → breached', () => {
    const sla = { startAt: 0, responseDueAt: 50, resolutionDueAt: 100, pausedMs: 0 };
    expect(slaState(sla, 'open', 50)).toBe('on_track');
    expect(slaState(sla, 'open', 80)).toBe('at_risk');
    expect(slaState(sla, 'open', 120)).toBe('breached');
  });
  it('reports met or breached for closed tickets', () => {
    const sla = { startAt: 0, responseDueAt: 50, resolutionDueAt: 100, pausedMs: 0 };
    expect(slaState(sla, 'closed', 999, 90)).toBe('met');
    expect(slaState(sla, 'resolved', 999, 140)).toBe('breached');
  });
});

describe('pause and resume', () => {
  it('freezes the clock while paused and extends due times on resume', () => {
    const sla = { startAt: 0, responseDueAt: 50, resolutionDueAt: 100, pausedMs: 0 };
    const paused = pauseSla(sla, 60);
    expect(slaState(paused, 'awaiting', 500)).toBe('paused');
    const resumed = resumeSla(paused, 90);
    expect(resumed.resolutionDueAt).toBe(130);
    expect(resumed.pausedMs).toBe(30);
    // 65 active units of a 100-unit window: still on track; 80 active units: at risk
    expect(slaState(resumed, 'open', 95)).toBe('on_track');
    expect(slaState(resumed, 'open', 110)).toBe('at_risk');
  });
  it('pausing twice is a no-op', () => {
    const sla = pauseSla({ startAt: 0, responseDueAt: 5, resolutionDueAt: 10, pausedMs: 0 }, 3);
    expect(pauseSla(sla, 8).pausedAt).toBe(3);
  });
});

describe('escalation ladder', () => {
  const sla = { startAt: 0, responseDueAt: 6 * H, resolutionDueAt: 12 * H, pausedMs: 0 };
  it('escalates by time past breach', () => {
    expect(escalationLevelFor(sla, 6 * H)).toBe(0);
    expect(escalationLevelFor(sla, 10 * H)).toBe(1);
    expect(escalationLevelFor(sla, 13 * H)).toBe(2);
    expect(escalationLevelFor(sla, 17 * H)).toBe(3);
    expect(escalationLevelFor(sla, 25 * H)).toBe(4);
  });
});
