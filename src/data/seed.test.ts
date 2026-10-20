import { describe, expect, it } from 'vitest';
import { buildSeed } from './seed';
import { computeKpis } from '../lib/metrics';
import { copilotFor } from '../lib/copilot';
import { slaConsumed } from '../lib/sla';
import { CATEGORIES, isOpen } from '../lib/meta';
import { CALL_SCRIPTS, SEED_TRANSCRIPTS } from './scripts';

const NOW = new Date(2026, 9, 21, 11, 0).getTime();
const seed = buildSeed(NOW);

describe('seed data', () => {
  it('has the agreed volumes', () => {
    expect(seed.tickets).toHaveLength(320);
    expect(seed.customers).toHaveLength(70);
    expect(seed.agents.filter((a) => a.role === 'agent')).toHaveLength(14);
    expect(seed.agents).toHaveLength(18);
    expect(seed.kb.filter((k) => !k.draft).length).toBeGreaterThanOrEqual(35);
  });

  it('is identical on every reset', () => {
    const again = buildSeed(NOW);
    expect(JSON.stringify(again)).toBe(JSON.stringify(seed));
  });

  it('has unique ticket, customer and interaction IDs', () => {
    expect(new Set(seed.tickets.map((t) => t.id)).size).toBe(320);
    expect(new Set(seed.customers.map((c) => c.id)).size).toBe(70);
    const iids = seed.tickets.flatMap((t) => t.interactions.map((i) => i.id));
    expect(new Set(iids).size).toBe(iids.length);
    expect(seed.nextNo).toBe(10101 + 320);
  });

  it('spreads tickets over desks roughly 55 / 20 / 25', () => {
    const share = (d: string) => seed.tickets.filter((t) => t.desk === d).length / 320;
    expect(share('helpline')).toBeGreaterThan(0.45);
    expect(share('helpline')).toBeLessThan(0.65);
    expect(share('edukaan')).toBeGreaterThan(0.12);
    expect(share('loyalty')).toBeGreaterThan(0.17);
  });

  it('keeps every reference valid', () => {
    const cust = new Set(seed.customers.map((c) => c.id));
    const agents = new Set(seed.agents.map((a) => a.id));
    seed.tickets.forEach((t) => {
      expect(cust.has(t.customerId)).toBe(true);
      if (t.assigneeId) expect(agents.has(t.assigneeId)).toBe(true);
      t.interactions.forEach((i) => {
        if (i.call?.transcriptKey) expect(SEED_TRANSCRIPTS[i.call.transcriptKey] ?? CALL_SCRIPTS[i.call.transcriptKey]).toBeTruthy();
      });
    });
    Object.values(seed.heroTickets).forEach((id) => expect(seed.tickets.some((t) => t.id === id)).toBe(true));
    Object.values(seed.heroes).forEach((id) => expect(cust.has(id)).toBe(true));
  });

  it('never creates tickets in the future and keeps SLA windows positive', () => {
    seed.tickets.forEach((t) => {
      expect(t.createdAt).toBeLessThanOrEqual(NOW);
      expect(t.sla.resolutionDueAt).toBeGreaterThan(t.sla.startAt);
      if (t.resolvedAt) expect(t.resolvedAt).toBeLessThanOrEqual(NOW);
    });
  });

  it('keeps seeded overdue times readable (under 8 h)', () => {
    seed.tickets.filter((t) => isOpen(t.status)).forEach((t) => {
      expect(NOW - t.sla.resolutionDueAt).toBeLessThan(8 * 3_600_000);
    });
  });

  it('marks already-warned tickets so the SLA monitor does not spam on load', () => {
    seed.tickets.filter((t) => isOpen(t.status) && slaConsumed(t.sla, NOW) >= 0.75).forEach((t) => {
      expect(t.sla.warned).toBe(true);
      expect(t.escalationLevel).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('headline KPIs from the seed', () => {
  // The demo can be reset at any hour on any day: check every 3 h across a full week.
  const moments: number[] = [];
  for (let day = 0; day < 7; day++) for (let h = 0; h < 24; h += 3) moments.push(new Date(2026, 9, 19 + day, h, 17).getTime());

  it.each(moments.map((m) => [new Date(m).toString().slice(0, 21), m]))('meets the client targets when reset at %s', (_label, m) => {
    const s = buildSeed(m as number);
    const k = computeKpis(s.tickets, m as number);
    expect(s.tickets).toHaveLength(320);
    expect(k.slaCompliance).toBeGreaterThan(95);
    expect(k.aiResolution).toBeGreaterThanOrEqual(30);
    expect(k.aiResolution).toBeLessThanOrEqual(40);
    expect(k.ackMedian).toBeLessThan(60);
    expect(k.csat).toBeGreaterThan(4.3);
    expect(k.missed).toBe(0);
    expect(k.open).toBeGreaterThan(30);
    expect(k.open).toBeLessThan(80);
  });
});

describe('copilot', () => {
  it('has replies and actions for every category', () => {
    CATEGORIES.forEach((category) => {
      const t = { ...seed.tickets[0], category };
      const v = copilotFor(t, seed.customers[0], seed.orders);
      expect(v.actions.length).toBeGreaterThan(0);
      expect(v.replies.formal.length).toBeGreaterThan(20);
      expect(v.replies.hindi.length).toBeGreaterThan(10);
    });
  });
});
