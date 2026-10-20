import { useMemo } from 'react';
import { AlertTriangle, Award, Building2, IdCard, MapPin, Package, Phone, Mail, Languages, Star, Truck } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { navigate } from '../../store/router';
import { Avatar, Chip, Sparkline, StatusBadge } from '../../components/ui';
import { cn, DAY, shortDate, timeAgo } from '../../lib/format';
import type { Customer, Ticket } from '../../types';

const TYPE_LABEL: Record<Customer['type'], string> = {
  dealer: 'Dealer',
  retailer: 'Retailer',
  garage: 'Garage / mechanic',
  fleet: 'Fleet owner',
  loyalty: 'Loyalty member · mechanic',
};

const ORDER_TONE: Record<string, 'success' | 'warning' | 'critical' | 'info' | 'neutral'> = {
  Delivered: 'success',
  Delayed: 'critical',
  'In transit': 'info',
  Dispatched: 'info',
  Packed: 'neutral',
  Processing: 'warning',
};

export function Customer360({ customer, ticket }: { customer: Customer; ticket: Ticket }) {
  const tickets = useStore((s) => s.tickets);
  const orders = useStore((s) => s.orders);
  const ledger = useStore((s) => s.ledger[customer.id]);
  const now = Date.now();

  const history = useMemo(() => tickets.filter((t) => t.customerId === customer.id).sort((a, b) => b.createdAt - a.createdAt), [tickets, customer.id]);
  const recent7 = history.filter((t) => now - t.createdAt < 7 * DAY).length;
  const custOrders = orders.filter((o) => o.customerId === customer.id).sort((a, b) => b.placedAt - a.placedAt);
  const sentiment = customer.sentimentTrend.map((v) => ({ v }));
  const lastSent = customer.sentimentTrend[customer.sentimentTrend.length - 1];

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <Avatar name={customer.name} size={44} />
          <div className="min-w-0">
            <div className="font-bold text-[15px] leading-tight">{customer.name}</div>
            <div className="text-[13px] text-muted flex items-center gap-1 mt-0.5"><Building2 size={13} /> <span className="truncate">{customer.company}</span></div>
            <div className="text-[13px] text-muted flex items-center gap-1"><MapPin size={13} /> {customer.city}, {customer.state}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          <Chip tone="primary">{TYPE_LABEL[customer.type]}</Chip>
          <Chip>{customer.segment}</Chip>
          {customer.tier && <Chip tone="warning"><Award size={11} /> {customer.tier}</Chip>}
        </div>
        {recent7 >= 2 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-warning/10 text-warning px-2.5 py-2 text-[13px] font-semibold">
            <AlertTriangle size={15} /> Contacted {Math.max(3, recent7)} times in 7 days
          </div>
        )}
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
          <dt className="text-subtle flex items-center gap-1"><Phone size={12} /> Mobile</dt>
          <dd className="mono text-right">{customer.mobile}</dd>
          <dt className="text-subtle flex items-center gap-1"><Mail size={12} /> Email</dt>
          <dd className="text-right truncate">{customer.email}</dd>
          {customer.dealerCode && (
            <>
              <dt className="text-subtle flex items-center gap-1"><IdCard size={12} /> {customer.type === 'dealer' ? 'Dealer code' : 'Retailer code'}</dt>
              <dd className="mono text-right">{customer.dealerCode}</dd>
            </>
          )}
          {customer.loyaltyId && (
            <>
              <dt className="text-subtle flex items-center gap-1"><Award size={12} /> Loyalty ID</dt>
              <dd className="mono text-right">{customer.loyaltyId}</dd>
            </>
          )}
          {customer.gstin && (
            <>
              <dt className="text-subtle">GSTIN</dt>
              <dd className="mono text-right text-[13px]">{customer.gstin}</dd>
            </>
          )}
          <dt className="text-subtle flex items-center gap-1"><Languages size={12} /> Language</dt>
          <dd className="text-right">{customer.language}</dd>
          <dt className="text-subtle">Customer since</dt>
          <dd className="text-right num">{customer.since}</dd>
        </dl>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <button onClick={() => navigate(`/inbox?view=all&q=${encodeURIComponent(customer.name)}`)} className="rounded-lg bg-surface2 py-2 hover:bg-hairline/50">
            <div className="text-[18px] font-bold num">{history.length}</div>
            <div className="text-[13px] text-subtle">Lifetime tickets</div>
          </button>
          <div className="rounded-lg bg-surface2 py-2">
            <div className="text-[18px] font-bold num flex items-center justify-center gap-0.5">{customer.csat.toFixed(1)}<Star size={13} className="text-warning fill-warning" /></div>
            <div className="text-[13px] text-subtle">CSAT</div>
          </div>
          <div className="rounded-lg bg-surface2 py-2">
            <div className={cn('text-[18px] font-bold num', lastSent < 0.45 ? 'text-critical' : lastSent < 0.6 ? 'text-warning' : 'text-success')}>{lastSent < 0.45 ? 'Low' : lastSent < 0.6 ? 'Mixed' : 'Good'}</div>
            <div className="text-[13px] text-subtle">Sentiment</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-[13px] text-subtle"><span>Sentiment trend · 6 contacts</span><span>{lastSent < customer.sentimentTrend[0] ? '↓ declining' : '↑ improving'}</span></div>
          <Sparkline data={sentiment} color={lastSent < 0.45 ? '#DC2626' : '#16A34A'} height={36} />
        </div>
      </div>

      {customer.points != null && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Loyalty points</span>
            <Chip tone="warning">{customer.tier}</Chip>
          </div>
          <div className="text-[24px] font-bold num mt-1">{customer.points.toLocaleString('en-IN')}</div>
          <div className="mt-2 flex flex-col gap-1.5">
            {(ledger ?? []).slice(0, 4).map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-[13px]">
                <span className="text-subtle w-[46px] shrink-0">{shortDate(e.at)}</span>
                <span className={cn('truncate flex-1', e.points === 0 && 'text-warning font-medium')}>{e.text}</span>
                <span className={cn('num font-semibold', e.points > 0 ? 'text-success' : e.points < 0 ? 'text-critical' : 'text-warning')}>{e.points === 0 ? 'pending' : `${e.points > 0 ? '+' : ''}${e.points}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {custOrders.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow flex items-center gap-1"><Package size={13} /> Orders · eDukaan / SAP</span>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {custOrders.slice(0, 3).map((o) => (
              <div key={o.id} className={cn('rounded-lg border p-2.5', o.id === ticket.entities?.orderId && 'border-primary/50 bg-primary/[0.04]')}>
                <div className="flex items-center justify-between gap-2">
                  <span className="mono text-[13px] font-semibold">{o.id}</span>
                  <Chip tone={ORDER_TONE[o.status]}>{o.status === 'Delayed' && <Truck size={11} />}{o.status}</Chip>
                </div>
                <div className="text-[13px] text-muted mt-1 truncate">{o.items[0].qty} × {o.items[0].name}</div>
                <div className="text-[13px] text-subtle mt-0.5 flex justify-between">
                  <span>{o.warehouse}</span>
                  <span className="mono">{o.tracking ?? o.invoice ?? ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4">
        <span className="eyebrow">Previous tickets</span>
        <div className="mt-2 flex flex-col">
          {history.filter((t) => t.id !== ticket.id).slice(0, 5).map((t) => (
            <button key={t.id} onClick={() => navigate(`/ticket/${t.id}`)} className="text-left py-2 border-b last:border-0 hover:bg-surface2 -mx-2 px-2 rounded">
              <div className="flex items-center gap-2">
                <span className="mono text-[13px] font-semibold">{t.id}</span>
                <StatusBadge s={t.status} />
                <span className="ml-auto text-[13px] text-subtle">{timeAgo(t.createdAt)}</span>
              </div>
              <div className="text-[13px] truncate mt-0.5">{t.subject}</div>
            </button>
          ))}
          {history.length <= 1 && <div className="text-[13px] text-muted py-2">First contact from this customer.</div>}
        </div>
      </div>
    </div>
  );
}
