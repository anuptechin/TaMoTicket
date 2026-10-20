import type { Customer, Order } from '../types';
import { DAY } from './format';

/** Root cause by warehouse, as reported by the SAP dispatch scan. */
export const DELAY_REASONS: Record<string, string> = {
  'Pune WH': 'transporter pickup delayed',
  'Jamshedpur WH': 'stock awaiting QC release',
  'Lucknow WH': 'e-way bill generation delay',
  'Dharwad WH': 'truck breakdown en route',
  'Pantnagar WH': 'inbound stock delayed from plant',
};

/** Share of notified customers who historically would have called (used for "calls prevented"). */
export const CALLBACK_RATE = 0.72;

export interface DelayAlert {
  order: Order;
  customer: Customer;
  reason: string;
  newEta: number;
  message: string;
}

/** Open orders past their promised dispatch window that the customer has not yet been told about. */
export function detectDelays(orders: Order[], customers: Customer[], exclude: Set<string>, now: number): DelayAlert[] {
  const byId = new Map(customers.map((c) => [c.id, c]));
  return orders
    .filter((o) => !exclude.has(o.id) && !exclude.has(o.customerId))
    .filter((o) => o.status === 'Delayed' || ((o.status === 'Processing' || o.status === 'Packed') && now - o.placedAt > 3 * DAY))
    .sort((a, b) => a.placedAt - b.placedAt)
    .slice(0, 18)
    .map((order, i) => {
      const customer = byId.get(order.customerId)!;
      const reason = DELAY_REASONS[order.warehouse] ?? 'dispatch delayed';
      const newEta = now + (2 + (i % 2)) * DAY;
      const eta = new Date(newEta).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const first = customer.name.split(' ')[0];
      return {
        order,
        customer,
        reason,
        newEta,
        message: `Hi ${first} ji, an update on your order ${order.id}: dispatch from ${order.warehouse} is delayed (${reason}). New expected delivery: ${eta}. No need to call us; reply HELP if you need a person. – Parts Support`,
      };
    })
    .filter((a) => !!a.customer);
}
