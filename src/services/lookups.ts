import { latency } from './ai';
import { useStore } from '../store/useStore';
import { ACTION_LABELS, type ActionId } from '../lib/copilot';
import { DAY, HOUR, inr, shortDate } from '../lib/format';
import type { LookupData, Ticket } from '../types';

/** Runs a "next best action" against the simulated connected systems and logs a result card on the ticket. */
export async function runAction(action: ActionId, ticketId: string): Promise<LookupData> {
  await latency(450, 900);
  const s = useStore.getState();
  const t = s.tickets.find((x) => x.id === ticketId) as Ticket;
  const c = s.customers.find((x) => x.id === t.customerId);
  const order = s.orders.find((o) => o.id === t.entities?.orderId) ?? s.orders.find((o) => o.customerId === t.customerId);
  const now = Date.now();
  const orderId = order?.id ?? t.entities?.orderId ?? 'ED-558210';
  const part = order?.items[0];
  let data: LookupData;

  switch (action) {
    case 'sap_dispatch':
      data = {
        title: `Dispatch status · ${orderId}`,
        source: 'SAP',
        tone: order?.status === 'Delayed' ? 'warning' : 'info',
        rows: [
          ['Delivery document', '80045' + orderId.slice(-3) + '7'],
          ['Warehouse', order?.warehouse ?? 'Pune WH'],
          ['Stock allocated', part ? `Yes (${part.qty}/${part.qty})` : 'Yes'],
          ['Transporter pickup', order?.status === 'Delayed' ? 'Pending · slot 16:00 today' : order?.status ?? 'Dispatched'],
          ['Expected dispatch', order?.status === 'Delayed' ? 'Tomorrow 11:00' : shortDate(order?.placedAt ?? now)],
        ],
      };
      s.pushIntegrationEvent('sap', `Dispatch lookup ${orderId} from ${t.id}`);
      break;
    case 'send_tracking':
      data = {
        title: 'Tracking sent on WhatsApp',
        source: 'TTSL Smartflo · WhatsApp',
        tone: 'success',
        rows: [
          ['Template', 'order_tracking_v2'],
          ['Tracking', order?.tracking ?? 'TRK-88213407'],
          ['Delivered to', c?.mobile ?? ''],
          ['Status', 'Delivered ✓✓'],
        ],
      };
      s.addInteraction(ticketId, { type: 'whatsapp', at: now + 1, direction: 'out', author: 'BizSensAi', body: `Tracking for ${orderId}: ${order?.tracking ?? 'TRK-88213407'}. Track live: bizsensai.link/t/${(order?.tracking ?? '').slice(-6)}` });
      break;
    case 'resend_invoice': {
      const inv = t.entities?.invoice ?? order?.invoice ?? 'INV-2026-44310';
      data = {
        title: `Invoice ${inv} sent on WhatsApp`,
        source: 'SAP → TTSL Smartflo · WhatsApp',
        tone: 'success',
        rows: [
          ['Document', `${inv}.pdf (GST tax invoice)`],
          ['GSTIN verified', c?.gstin ?? 'Not applicable'],
          ['Sent to', c?.mobile ?? ''],
          ['Status', 'Delivered ✓✓'],
        ],
      };
      s.addInteraction(ticketId, { type: 'whatsapp', at: now + 1, direction: 'out', author: 'BizSensAi', body: `Here is your invoice ${inv}.`, media: `${inv}.pdf` });
      s.pushIntegrationEvent('sap', `Invoice PDF fetched ${inv}`);
      break;
    }
    case 'credit_points': {
      const inv = t.entities?.invoice ?? 'INV-2026-44817';
      const pts = 640;
      s.creditPoints(t.customerId, pts, `Manual credit: invoice ${inv}`, inv);
      const bal = useStore.getState().customers.find((x) => x.id === t.customerId)?.points ?? 0;
      data = {
        title: `${pts} points credited`,
        source: 'Loyalty CRM',
        tone: 'success',
        rows: [
          ['Member', `${c?.name} · ${c?.loyaltyId ?? ''}`],
          ['Invoice', inv],
          ['Reason code', 'BATCH-FAIL'],
          ['New balance', `${bal.toLocaleString('en-IN')} points`],
        ],
      };
      s.pushIntegrationEvent('loyalty-crm', `Points credited: ${c?.loyaltyId} +${pts}`);
      break;
    }
    case 'escalate_warehouse':
      data = {
        title: 'Escalated to Warehouse Ops',
        source: 'Microsoft Teams · #warehouse-ops',
        tone: 'warning',
        rows: [
          ['Task', `WH-TSK-${2200 + (parseInt(ticketId.slice(-3)) % 90)}`],
          ['Owner', `${order?.warehouse ?? 'Pune WH'} shift lead`],
          ['Due', new Date(now + 4 * HOUR).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })],
          ['Context shared', 'Full ticket timeline + order lines'],
        ],
      };
      s.pushIntegrationEvent('teams', `Adaptive card posted to Warehouse Ops for ${ticketId}`);
      break;
    case 'check_payment':
      data = {
        title: 'Gateway transaction lookup',
        source: 'eDukaan Admin · Payments',
        tone: 'warning',
        rows: [
          ['Txn 1', `pay_Nk82…a1 · ${inr(18450)} · Captured`],
          ['Txn 2', `pay_Nk82…c7 · ${inr(18450)} · Duplicate`],
          ['Refund', 'Initiated · ARN 7421 9930 1182'],
          ['ETA', '5–7 working days'],
        ],
      };
      s.pushIntegrationEvent('edukaan', `Payment lookup for ${ticketId}`);
      break;
    case 'reset_portal':
      data = {
        title: 'Reset link sent',
        source: 'eDukaan Admin',
        tone: 'success',
        rows: [
          ['Retailer', c?.dealerCode ?? c?.company ?? ''],
          ['Mobile updated', c?.mobile ?? ''],
          ['Link expires', '30 minutes'],
        ],
      };
      s.pushIntegrationEvent('edukaan', `Retailer password reset sent for ${ticketId}`);
      break;
    case 'check_stock':
      data = {
        title: `Stock · ${part?.partNo ?? t.entities?.partNo ?? 'PRT-27014-BRK'}`,
        source: 'SAP',
        tone: 'info',
        rows: [
          ['Pune WH', '1,240 units'],
          ['Jamshedpur WH', '310 units'],
          ['Lucknow WH', '86 units'],
          ['Nearest to customer', `${c?.city ?? ''} → 1 day transit`],
        ],
      };
      break;
    case 'supersession':
      data = {
        title: 'Supersession chain',
        source: 'PLM',
        tone: 'info',
        rows: [
          ['Old part', t.entities?.partNo ?? 'PRT-61877-FPM'],
          ['New part', (t.entities?.partNo ?? 'PRT-61877-FPM').replace(/.$/, 'N')],
          ['Interchangeability', 'Two-way'],
          ['Effective from', shortDate(now - 40 * DAY)],
        ],
      };
      s.pushIntegrationEvent('plm', `Supersession lookup for ${ticketId}`);
      break;
    case 'warranty_status':
      data = {
        title: 'Warranty claim WC-20931',
        source: 'IPMS',
        tone: 'success',
        rows: [
          ['Stage', 'Approved'],
          ['Credit note', 'In 2 working days'],
          ['Amount', inr(14200)],
        ],
      };
      s.pushIntegrationEvent('ipms', `Claim status fetched for ${ticketId}`);
      break;
    case 'schedule_pickup':
      data = {
        title: 'Return pickup scheduled',
        source: 'SAP · Returns',
        tone: 'success',
        rows: [
          ['Return order', `RO-${60000 + (parseInt(ticketId.slice(-3)) % 900)}`],
          ['Pickup', `${shortDate(now + DAY)}, 10:00–14:00`],
          ['Replacement', 'Dispatched from nearest warehouse'],
        ],
      };
      break;
  }

  s.addInteraction(ticketId, { type: 'lookup', at: now, author: ACTION_LABELS[action], lookup: data });
  s.audit(ACTION_LABELS[action], ticketId);
  return data;
}
