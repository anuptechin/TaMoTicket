import { describe, expect, it } from 'vitest';
import { buildSeed } from '../data/seed';
import { detectDelays } from './proactive';
import { effortScore, sentimentHeatmap } from './metrics';

const NOW = new Date(2026, 9, 21, 11, 0).getTime();
const seed = buildSeed(NOW);
const heroes = new Set(Object.values(seed.heroes));

describe('proactive delay detection', () => {
  const alerts = detectDelays(seed.orders, seed.customers, heroes, NOW);

  it('finds a meaningful batch of delayed orders to notify', () => {
    expect(alerts.length).toBeGreaterThanOrEqual(8);
    expect(alerts.length).toBeLessThanOrEqual(18);
  });

  it('never messages storyline customers or already-notified orders', () => {
    alerts.forEach((a) => expect(heroes.has(a.customer.id)).toBe(false));
    const again = detectDelays(seed.orders, seed.customers, new Set([...heroes, ...alerts.map((a) => a.order.id)]), NOW);
    again.forEach((a) => expect(alerts.some((x) => x.order.id === a.order.id)).toBe(false));
  });

  it('writes a personalised message with a future ETA and no ticket needed', () => {
    alerts.forEach((a) => {
      expect(a.newEta).toBeGreaterThan(NOW);
      expect(a.message).toContain(a.order.id);
      expect(a.message).toContain(a.customer.name.split(' ')[0]);
      expect(a.message).toMatch(/No need to call/);
    });
  });
});

describe('sentiment heatmap and customer effort', () => {
  const { cats, cells, deskCes } = sentimentHeatmap(seed.tickets);

  it('keeps effort scores on the 1–7 scale', () => {
    seed.tickets.forEach((t) => {
      const s = effortScore(t);
      expect(s).toBeGreaterThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(7);
    });
    deskCes.forEach((d) => expect(d.ces).toBeGreaterThan(3));
  });

  it('covers every desk × category with ticket counts that add up', () => {
    expect(cats.length).toBeGreaterThanOrEqual(8);
    expect(cells.reduce((s, c) => s + c.n, 0)).toBe(seed.tickets.length);
  });

  it('shows a real pattern: delays and wrong parts are more negative than pricing', () => {
    const neg = (cat: string) => {
      const cs = cells.filter((c) => c.category === cat && c.n > 0);
      return cs.reduce((s, c) => s + c.negative * c.n, 0) / cs.reduce((s, c) => s + c.n, 0);
    };
    expect(neg('Order & dispatch')).toBeGreaterThan(neg('Pricing'));
    expect(neg('Wrong / damaged part')).toBeGreaterThan(neg('Invoice & GST'));
  });
});
