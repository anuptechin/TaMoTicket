import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BellRing, Check, CheckCheck, Loader2, PhoneOff, Radar, Send, MessageCircle, Clock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useRoute } from '../../store/router';
import { useNow } from '../../store/clock';
import { Chip, CountUp, EmptyState, PageHeader } from '../../components/ui';
import { CALLBACK_RATE, detectDelays, type DelayAlert } from '../../lib/proactive';
import { cn, clockTime, shortDate, timeAgo } from '../../lib/format';

type Phase = 'idle' | 'scanning' | 'detected' | 'sending' | 'done';
type SendState = 'queued' | 'sending' | 'delivered' | 'read';

const SCAN_STEPS = ['Reading open orders from eDukaan', 'Checking SAP dispatch against promised dates', 'Grouping by root cause per warehouse'];

let lastRun = '';

export function Proactive() {
  const { query } = useRoute();
  const orders = useStore((s) => s.orders);
  const customers = useStore((s) => s.customers);
  const heroes = useStore((s) => s.heroes);
  const proactive = useStore((s) => s.proactive);
  const now = useNow();
  const [phase, setPhase] = useState<Phase>('idle');
  const [scanStep, setScanStep] = useState(0);
  const [alerts, setAlerts] = useState<DelayAlert[]>([]);
  const [status, setStatus] = useState<Record<string, SendState>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clear, []);
  const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  // Hero customers are kept out so the scripted storyline (their calls) still makes sense.
  const exclude = useMemo(() => new Set([...proactive.sentOrderIds, ...Object.values(heroes)]), [proactive.sentOrderIds, heroes]);

  const scan = (thenSend: boolean) => {
    clear();
    setPhase('scanning');
    setScanStep(0);
    setStatus({});
    SCAN_STEPS.forEach((_, i) => at(700 * (i + 1), () => setScanStep(i + 1)));
    at(700 * SCAN_STEPS.length + 500, () => {
      const found = detectDelays(useStore.getState().orders, useStore.getState().customers, exclude, Date.now());
      setAlerts(found);
      setSelected(found[0]?.order.id ?? null);
      setPhase('detected');
      useStore.getState().pushIntegrationEvent('sap', `Delay scan: ${found.length} open orders past promised dispatch`);
      if (thenSend && found.length) at(1500, () => send(found));
    });
  };

  const send = (list: DelayAlert[] = alerts) => {
    if (!list.length) return;
    clear();
    setPhase('sending');
    setStatus(Object.fromEntries(list.map((a) => [a.order.id, 'queued' as SendState])));
    list.forEach((a, i) => {
      at(350 * i + 200, () => {
        setStatus((s) => ({ ...s, [a.order.id]: 'sending' }));
        setSelected(a.order.id);
      });
      at(350 * i + 550, () => setStatus((s) => ({ ...s, [a.order.id]: 'delivered' })));
      at(350 * i + 1600 + (i % 4) * 300, () => setStatus((s) => ({ ...s, [a.order.id]: i % 9 === 4 ? 'delivered' : 'read' })));
    });
    at(350 * list.length + 2600, () => {
      const prevented = Math.round(list.length * CALLBACK_RATE);
      const reasons = [...new Set(list.map((a) => `${a.order.warehouse}: ${a.reason}`))];
      const s = useStore.getState();
      s.recordProactive(
        { reason: reasons.length === 1 ? reasons[0] : `${reasons[0]} (+${reasons.length - 1} more)`, count: list.length, prevented, orderIds: list.map((a) => a.order.id) },
        Object.fromEntries(list.map((a) => [a.order.id, a.newEta])),
      );
      s.pushIntegrationEvent('smartflo-wa', `Template "delay_alert" delivered to ${list.length} customers`);
      s.notify({ title: 'Proactive notifications sent', body: `${list.length} customers told about delays before they called · ~${prevented} calls prevented`, tone: 'success' });
      s.toast({ tone: 'success', title: `WhatsApp sent to ${list.length} customers`, body: `About ${prevented} inbound calls prevented` });
      setPhase('done');
    });
  };

  useEffect(() => {
    const run = query.get('run');
    if (query.get('play') && run && run !== lastRun) {
      lastRun = run;
      scan(true);
      return () => {
        clear();
        lastRun = '';
      };
    }
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const pending = useMemo(() => detectDelays(orders, customers, exclude, now), [orders, customers, exclude, Math.floor(now / 60000)]); // eslint-disable-line react-hooks/exhaustive-deps
  const sel = alerts.find((a) => a.order.id === selected);
  const delivered = Object.values(status).filter((x) => x === 'delivered' || x === 'read').length;
  const read = Object.values(status).filter((x) => x === 'read').length;
  const weekCount = proactive.campaigns.filter((c) => now - c.at < 7 * 864e5).reduce((s, c) => s + c.count, 0);
  const busy = phase === 'scanning' || phase === 'sending';

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="p-5 xl:p-6 max-w-[1500px] mx-auto">
        <PageHeader
          title="Proactive notifications"
          subtitle="Spot delays in SAP and eDukaan, and tell customers on WhatsApp before they have to call"
          actions={
            <>
              <button className="btn-secondary" onClick={() => scan(false)} disabled={busy}>
                <Radar size={15} /> Scan for delays
              </button>
              <button className="btn-primary" onClick={() => send()} disabled={busy || phase !== 'detected' || !alerts.length}>
                <Send size={15} /> Send WhatsApp to {phase === 'detected' ? alerts.length : ''} customers
              </button>
            </>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { l: 'Inbound calls prevented · 7 days', v: proactive.prevented, icon: PhoneOff, tone: 'text-success' },
            { l: 'Customers notified · 7 days', v: weekCount, icon: MessageCircle, tone: 'text-primary' },
            { l: 'Read rate', v: 92, suffix: '%', icon: CheckCheck, tone: 'text-info' },
            { l: 'Delayed orders not yet notified', v: pending.length, icon: Clock, tone: pending.length ? 'text-warning' : 'text-success' },
          ].map((k) => (
            <div key={k.l} className="card p-4">
              <div className="flex items-center gap-2 text-[13px] text-muted font-medium">
                <k.icon size={15} className={k.tone} /> {k.l}
              </div>
              <div className="text-[28px] font-bold mt-1 leading-none">
                <CountUp value={k.v} suffix={k.suffix ?? ''} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4 mt-4 items-start">
          <section className="card overflow-hidden">
            <div className="flex items-center gap-2 px-4 h-12 border-b">
              <BellRing size={16} className="text-primary" />
              <h2 className="font-semibold text-[14px]">Delay detection</h2>
              {phase === 'sending' && <Chip tone="info" className="ml-auto"><Loader2 size={12} className="animate-spin" /> Sending {delivered}/{alerts.length}</Chip>}
              {phase === 'done' && <Chip tone="success" className="ml-auto"><Check size={12} /> {delivered} delivered · {read} read</Chip>}
            </div>

            {phase === 'idle' && (
              <EmptyState
                icon={<Radar size={22} />}
                title={`${pending.length} open orders are past their promised dispatch`}
                body="Run a scan to find them in SAP, work out why, and message each customer with a new delivery date before they call."
                action={<button className="btn-primary" onClick={() => scan(true)}><Radar size={15} /> Scan and notify</button>}
              />
            )}

            {phase === 'scanning' && (
              <div className="p-6 flex flex-col gap-3">
                {SCAN_STEPS.map((st, i) => (
                  <div key={st} className={cn('flex items-center gap-2.5 text-[14px]', scanStep < i && 'text-subtle')}>
                    <span className={cn('h-6 w-6 rounded-full flex items-center justify-center', scanStep > i ? 'bg-success text-white' : scanStep === i ? 'bg-primary/15 text-primary' : 'border')}>
                      {scanStep > i ? <Check size={13} /> : scanStep === i ? <Loader2 size={13} className="animate-spin" /> : null}
                    </span>
                    {st}
                  </div>
                ))}
              </div>
            )}

            {(phase === 'detected' || phase === 'sending' || phase === 'done') && (
              alerts.length === 0 ? (
                <EmptyState icon={<Check size={22} />} title="No delays to report" body="Every open order is on time, or its customer has already been told." />
              ) : (
                <div>
                  <div className="px-4 py-2.5 border-b bg-surface2 text-[13px] flex flex-wrap gap-2 items-center">
                    <span className="font-semibold">{alerts.length} orders delayed</span>
                    {[...new Set(alerts.map((a) => a.order.warehouse))].map((w) => (
                      <Chip key={w}>{w} · {alerts.filter((a) => a.order.warehouse === w).length}</Chip>
                    ))}
                  </div>
                  <div className="max-h-[440px] overflow-y-auto scroll-thin">
                    {alerts.map((a, i) => {
                      const st = status[a.order.id];
                      return (
                        <motion.button
                          key={a.order.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: phase === 'detected' ? i * 0.04 : 0 }}
                          onClick={() => setSelected(a.order.id)}
                          className={cn('w-full grid grid-cols-[96px_minmax(0,1fr)_minmax(0,1.2fr)_110px] gap-3 items-center px-4 py-2.5 border-b text-left hover:bg-surface2', selected === a.order.id && 'bg-primary/[0.05]')}
                        >
                          <span className="mono text-[13px] font-semibold">{a.order.id}</span>
                          <span className="min-w-0 leading-tight">
                            <span className="block text-[13.5px] truncate">{a.customer.name}</span>
                            <span className="block text-[13px] text-subtle truncate">{a.customer.company} · {a.customer.city}</span>
                          </span>
                          <span className="min-w-0 leading-tight">
                            <span className="block text-[13px] truncate">{a.order.warehouse}: {a.reason}</span>
                            <span className="block text-[13px] text-subtle">New ETA {shortDate(a.newEta)}</span>
                          </span>
                          <span className="justify-self-end">
                            {!st && <Chip tone="warning">Not notified</Chip>}
                            {st === 'queued' && <Chip>Queued</Chip>}
                            {st === 'sending' && <Chip tone="info"><Loader2 size={11} className="animate-spin" /> Sending</Chip>}
                            {st === 'delivered' && <Chip tone="success"><Check size={11} /> Delivered</Chip>}
                            {st === 'read' && <Chip tone="success"><CheckCheck size={11} /> Read</Chip>}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </section>

          <div className="flex flex-col gap-4">
            <section className="card p-4">
              <div className="eyebrow">WhatsApp message</div>
              {sel ? (
                <div className="mt-2 rounded-xl p-3" style={{ background: '#ECE5DD' }}>
                  <div className="max-w-[92%] rounded-lg rounded-tl-none bg-white px-2.5 py-1.5 text-[13.5px] text-[#111b21] shadow-sm">
                    <div className="text-[13px] font-semibold text-[#0A6670]">BizSensAi Parts Support</div>
                    {sel.message}
                    <div className="text-[13px] text-[#54656f] text-right mt-0.5 flex items-center justify-end gap-1">
                      {clockTime(now)} {status[sel.order.id] === 'read' && <CheckCheck size={13} className="text-[#1d7fb5]" />}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[13.5px] text-muted mt-2">Scan to preview the message each customer receives. It uses the approved template “delay_alert” on TTSL Smartflo.</p>
              )}
            </section>
            <section className="card p-4">
              <div className="eyebrow">Recent campaigns</div>
              <div className="mt-2 flex flex-col gap-2">
                {proactive.campaigns.slice(0, 5).map((c) => (
                  <div key={c.id} className="rounded-lg border p-2.5">
                    <div className="text-[13.5px] font-medium leading-snug">{c.reason}</div>
                    <div className="text-[13px] text-muted mt-0.5 flex justify-between gap-2">
                      <span>{c.count} customers · ~{c.prevented} calls prevented</span>
                      <span className="text-subtle shrink-0">{timeAgo(c.at, now)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
