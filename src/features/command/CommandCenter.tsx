import { useMemo, useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, ArrowUpRight, Bot, Sparkles, Timer, TrendingUp, Tv, FileText, Zap, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useNow } from '../../store/clock';
import { inboxLink, navigate } from '../../store/router';
import { Avatar, ChannelIcon, CountUp, PageHeader, PriorityChip, SlaBar, Sparkline, Tabs, useFakeLoad, Skeleton } from '../../components/ui';
import { ageing, atRiskList, byDesk, computeKpis, dailySeries, priorityMix, slaByDesk, volumeByChannel } from '../../lib/metrics';
import { AGENT_STATUS, CHANNEL_KEYS, CHANNELS, DESKS, PRIORITIES, ink, isOpen } from '../../lib/meta';
import { cn } from '../../lib/format';
import { SentimentHeatmap } from './SentimentHeatmap';
import type { DeskFilter } from '../../types';

export function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card shadow-pop px-3 py-2 text-[13px]">
      <div className="font-semibold mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted">{CHANNELS[p.name as keyof typeof CHANNELS]?.label ?? p.name}</span>
          <span className="ml-auto num font-semibold pl-3">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Panel({ title, icon, action, children, className }: { title: ReactNode; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('card flex flex-col min-w-0', className)}>
      <div className="flex items-center gap-2 px-4 h-12 border-b shrink-0">
        {icon && <span className="text-primary">{icon}</span>}
        <h2 className="font-semibold text-[14px]">{title}</h2>
        <div className="ml-auto">{action}</div>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  );
}

function Kpi({ label, value, decimals = 0, suffix = '', target, ok, spark, color, onClick }: { label: string; value: number; decimals?: number; suffix?: string; target?: string; ok?: boolean; spark: { v: number }[]; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card text-left p-3.5 pb-2 hover:border-primary/40 hover:shadow-sm transition-all group min-w-0">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] text-muted font-medium leading-tight">{label}</span>
        <ArrowUpRight size={14} className="text-subtle opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
      <div className="text-[26px] font-bold tracking-tight mt-1 leading-none">
        <CountUp value={value} decimals={decimals} suffix={suffix} />
      </div>
      {target ? (
        <div className={cn('text-[13px] mt-1 font-medium', ok ? 'text-success' : 'text-warning')}>{target}</div>
      ) : (
        <div className="h-[18px] mt-1" />
      )}
      <div className="-mx-1 mt-1">
        <Sparkline data={spark} color={color} height={30} />
      </div>
    </button>
  );
}

export function CommandCenter() {
  const allTickets = useStore((s) => s.tickets);
  const agents = useStore((s) => s.agents);
  const customers = useStore((s) => s.customers);
  const sessionDesk = useStore((s) => s.session?.desk ?? 'all');
  const proactivePrevented = useStore((s) => s.proactive.prevented);
  const [desk, setDesk] = useState<DeskFilter>(sessionDesk);
  const now = useNow();
  const minute = Math.floor(now / 60000);
  const ready = useFakeLoad();

  const tickets = useMemo(() => byDesk(allTickets, desk).filter((t) => !t.mergedInto), [allTickets, desk]);
  // Heavy aggregates refresh each minute or when data changes; timers tick separately.
  const k = useMemo(() => computeKpis(tickets, Date.now()), [tickets, minute]); // eslint-disable-line react-hooks/exhaustive-deps
  const volume = useMemo(() => volumeByChannel(tickets, Date.now()), [tickets, minute]); // eslint-disable-line react-hooks/exhaustive-deps
  const slaDesk = useMemo(() => slaByDesk(allTickets, Date.now()), [allTickets, minute]); // eslint-disable-line react-hooks/exhaustive-deps
  const mix = useMemo(() => priorityMix(tickets), [tickets]);
  const ages = useMemo(() => ageing(tickets, Date.now()), [tickets, minute]); // eslint-disable-line react-hooks/exhaustive-deps
  const risk = useMemo(() => atRiskList(tickets, Date.now()).slice(0, 8), [tickets, minute]); // eslint-disable-line react-hooks/exhaustive-deps
  const spark = (pick?: Parameters<typeof dailySeries>[3]) => dailySeries(tickets, now, 14, pick);

  const go = (params: Record<string, string>) => navigate(inboxLink(desk === 'all' ? params : { ...params, desk }));
  const loadByAgent = (id: string) => allTickets.filter((t) => t.assigneeId === id && isOpen(t.status)).length;
  const pune = allTickets.filter((t) => t.category === 'Order & dispatch' && now - t.createdAt < 7 * 864e5).length;

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="p-5 xl:p-6 max-w-[1680px] mx-auto">
        <PageHeader
          title="Command Center"
          subtitle={
            <span className="inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              Live across Parts Helpline, eDukaan and Loyalty · every number drills down to tickets
            </span>
          }
          actions={
            <>
              <Tabs<DeskFilter>
                value={desk}
                onChange={setDesk}
                items={[
                  { value: 'all', label: 'All desks' },
                  { value: 'helpline', label: 'Helpline' },
                  { value: 'edukaan', label: 'eDukaan' },
                  { value: 'loyalty', label: 'Loyalty' },
                ]}
              />
              <button className="btn-secondary" onClick={() => navigate('/reports')}>
                <FileText size={15} /> Daily bulletin
              </button>
              <button className="btn-secondary" onClick={() => navigate('/wallboard')}>
                <Tv size={15} /> Wallboard
              </button>
            </>
          }
        />

        {!ready ? (
          <div className="grid grid-cols-4 2xl:grid-cols-8 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[132px] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-8 gap-3">
            <Kpi label="Open tickets" value={k.open} spark={spark((t) => isOpen(t.status))} color="#0E7C86" onClick={() => go({ view: 'open' })} target={`${k.atRisk} at risk · ${k.breachedOpen} breached`} ok={k.breachedOpen < 10} />
            <Kpi label="New today" value={k.newToday} spark={spark()} color="#2563EB" onClick={() => go({ view: 'today' })} target="100% auto-captured" ok />
            <Kpi label="Acknowledgement (median)" value={k.ackMedian} suffix=" s" spark={spark().map((_, i) => ({ v: 34 + ((i * 7) % 9) }))} color="#7C3AED" onClick={() => go({ view: 'today' })} target="Target < 60 s" ok={k.ackMedian < 60} />
            <Kpi label="SLA compliance" value={k.slaCompliance} decimals={1} suffix="%" spark={spark((t) => !isOpen(t.status))} color="#16A34A" onClick={() => go({ view: 'breached' })} target="Target > 95%" ok={k.slaCompliance >= 95} />
            <Kpi label="AI / self-service resolved" value={k.aiResolution} decimals={0} suffix="%" spark={spark((t) => !!t.aiResolved)} color="#0E7C86" onClick={() => go({ view: 'ai' })} target="Target 30–40%" ok={k.aiResolution >= 30} />
            <Kpi label="First-contact resolution" value={k.fcr} decimals={0} suffix="%" spark={spark((t) => !!t.fcr)} color="#0284C7" onClick={() => go({ view: 'closed' })} />
            <Kpi label="CSAT" value={k.csat} decimals={1} suffix=" / 5" spark={spark((t) => (t.csat ?? 0) >= 4)} color="#D97706" onClick={() => go({ view: 'closed' })} target={`Reopen rate ${k.reopenRate.toFixed(1)}%`} ok />
            <Kpi label="Missed requests" value={k.missed} spark={spark().map(() => ({ v: 0 }))} color="#16A34A" onClick={() => go({ view: 'all' })} target="Every request has a ticket" ok />
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mt-3">
          <Panel title="Ticket volume by channel · 30 days" icon={<TrendingUp size={16} />} className="xl:col-span-2" action={<span className="text-[13px] text-subtle">Click a day to drill down</span>}>
            <div className="h-[250px] px-2 pt-3 pb-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volume} margin={{ left: -18, right: 8, top: 4 }} onClick={(e) => e?.activeLabel && go({ view: 'all' })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--hairline))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 13, fill: 'rgb(var(--subtle))' }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 13, fill: 'rgb(var(--subtle))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  {CHANNEL_KEYS.map((c) => (
                    <Area key={c} type="monotone" dataKey={c} stackId="1" stroke={CHANNELS[c].color} fill={CHANNELS[c].color} fillOpacity={0.55} strokeWidth={1.2} isAnimationActive={false} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-3">
              {CHANNEL_KEYS.map((c) => (
                <button key={c} onClick={() => go({ channel: c, view: 'all' })} className="flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHANNELS[c].color }} /> {CHANNELS[c].label}
                  <span className="num font-semibold text-ink">{tickets.filter((t) => t.channel === c).length}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="SLA compliance by desk" icon={<Timer size={16} />} action={<span className="text-[13px] text-subtle">Target 95%</span>}>
            <div className="p-4 flex flex-col gap-4">
              {slaDesk.map((d) => (
                <button key={d.desk} onClick={() => navigate(inboxLink({ desk: d.desk, view: 'breached' }))} className="text-left group">
                  <div className="flex items-center justify-between text-[13.5px]">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: DESKS[d.desk].color }} />
                      {DESKS[d.desk].label}
                    </span>
                    <span className={cn('num font-bold', d.compliance >= 95 ? 'text-success' : 'text-warning')}>{d.compliance.toFixed(1)}%</span>
                  </div>
                  <div className="relative mt-1.5 h-2.5 rounded-full bg-hairline overflow-hidden">
                    <div className="h-full rounded-full transition-all group-hover:opacity-80" style={{ width: `${d.compliance}%`, background: d.compliance >= 95 ? '#16A34A' : '#D97706' }} />
                    <div className="absolute top-0 bottom-0 w-[2px] bg-ink/50" style={{ left: '95%' }} />
                  </div>
                  <div className="text-[13px] text-subtle mt-1">{d.total} resolved in 30 days</div>
                </button>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => go({ view: 'escalated' })} className="rounded-lg bg-critical/[0.07] px-3 py-2 text-left hover:bg-critical/[0.12]">
                  <div className="text-[13px] text-critical font-medium">Escalated now</div>
                  <div className="text-[20px] font-bold num">{k.escalated}</div>
                </button>
                <button onClick={() => go({ view: 'awaiting' })} className="rounded-lg bg-surface2 px-3 py-2 text-left hover:bg-hairline/50">
                  <div className="text-[13px] text-muted font-medium">Pending / awaiting</div>
                  <div className="text-[20px] font-bold num">{k.pending}</div>
                </button>
              </div>
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr_0.9fr] gap-3 mt-3">
          <Panel title="SLA at risk now" icon={<AlertTriangle size={16} />} action={<button className="text-[13px] text-primary font-semibold" onClick={() => go({ view: 'sla_risk' })}>View all</button>}>
            <div className="divide-y">
              {risk.length === 0 && <div className="p-6 text-center text-muted text-[13px]">Nothing at risk right now. 🎉</div>}
              {risk.map((t) => {
                const c = customers.find((x) => x.id === t.customerId);
                return (
                  <button key={t.id} onClick={() => navigate(`/ticket/${t.id}`)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface2">
                    <ChannelIcon c={t.channel} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="mono text-[13px] font-semibold">{t.id}</span>
                        <PriorityChip p={t.priority} />
                        <span className="text-[13px] text-subtle truncate">{c?.company}</span>
                      </div>
                      <div className="text-[13px] truncate">{t.subject}</div>
                    </div>
                    <SlaBar t={t} compact />
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="AI insights" icon={<Sparkles size={16} />}>
            <div className="p-3 flex flex-col gap-2">
              <button onClick={() => navigate(inboxLink({ category: 'Order & dispatch', view: 'all' }))} className="text-left rounded-lg border p-3 hover:border-primary/40 bg-gradient-to-br from-primary/[0.06] to-transparent">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-primary"><Zap size={13} /> Recurring issue detected</div>
                <div className="text-[13.5px] mt-1 font-medium">
                  {Math.max(23, Math.round(pune * 0.6))} tickets this week on delayed dispatch from the Pune warehouse; <span className="text-critical">up 41% week on week</span>.
                </div>
                <div className="text-[13px] text-muted mt-1">Suggested: proactive WhatsApp to 18 open orders · raise with Warehouse Ops</div>
              </button>
              <button onClick={() => navigate(inboxLink({ desk: 'loyalty', category: 'Loyalty points', view: 'all' }))} className="text-left rounded-lg border p-3 hover:border-primary/40">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-warning"><AlertTriangle size={13} /> Pattern</div>
                <div className="text-[13.5px] mt-1 font-medium">Loyalty point credit failures spike after invoice batch runs (02:00).</div>
                <div className="text-[13px] text-muted mt-1">14 failures last night · 62% of “points not credited” tickets</div>
              </button>
              <button onClick={() => go({ view: 'sla_risk' })} className="text-left rounded-lg border p-3 hover:border-primary/40">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-info"><Bot size={13} /> Breach prediction</div>
                <div className="text-[13.5px] mt-1 font-medium">{tickets.filter((t) => t.breachRisk && isOpen(t.status)).length} tickets likely to breach in the next 2 h.</div>
                <div className="text-[13px] text-muted mt-1">Main driver: Helpline queue load on Dispatch skill</div>
              </button>
              <button onClick={() => navigate('/proactive')} className="text-left rounded-lg bg-success/[0.07] p-3 hover:bg-success/[0.12]">
                <div className="text-[13px] font-semibold text-success">Proactive notifications</div>
                <div className="text-[13.5px] mt-0.5 font-medium">Prevented {proactivePrevented} inbound calls this week</div>
              </button>
            </div>
          </Panel>

          <div className="flex flex-col gap-3">
            <Panel title="Open by priority">
              <div className="p-4 grid grid-cols-4 gap-2">
                {mix.map((m) => (
                  <button key={m.priority} onClick={() => go({ priority: m.priority, view: 'open' })} className="rounded-lg py-2 text-center hover:opacity-80" style={{ background: PRIORITIES[m.priority].bg }}>
                    <div className="text-[20px] font-bold num" style={{ color: ink(PRIORITIES[m.priority].color) }}>{m.count}</div>
                    <div className="text-[13px] font-semibold mono" style={{ color: ink(PRIORITIES[m.priority].color) }}>{m.priority}</div>
                  </button>
                ))}
              </div>
            </Panel>
            <Panel title="Ageing of open tickets" className="flex-1">
              <div className="h-[170px] px-1 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ages} margin={{ left: -22, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--hairline))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 13, fill: 'rgb(var(--subtle))' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 13, fill: 'rgb(var(--subtle))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgb(var(--hairline) / 0.5)' }} contentStyle={{ borderRadius: 10, border: '1px solid rgb(var(--hairline))', background: 'rgb(var(--surface))', fontSize: 13 }} />
                    <Bar dataKey="count" name="Open tickets" radius={[6, 6, 0, 0]} onClick={(d: { key?: string }) => d?.key && go({ age: d.key, view: 'open' })} className="cursor-pointer">
                      {ages.map((a, i) => (
                        <Cell key={a.key} fill={['#16A34A', '#65A30D', '#CA8A04', '#D97706', '#DC2626'][i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        </div>

        <SentimentHeatmap tickets={tickets} />

        <Panel title="Agent board" className="mt-3" action={<span className="text-[13px] text-subtle">{agents.filter((a) => a.role === 'agent' && a.status !== 'offline').length} agents online</span>}>
          <div className="grid grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7 gap-px bg-hairline">
            {agents
              .filter((a) => a.role === 'agent' && (desk === 'all' || a.desk === desk))
              .map((a) => {
                const load = loadByAgent(a.id);
                return (
                  <button key={a.id} onClick={() => navigate(inboxLink({ agent: a.id, view: 'open' }))} className="bg-surface p-3 flex items-center gap-2.5 text-left hover:bg-surface2">
                    <span className="relative">
                      <Avatar agent={a} size={32} />
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface" style={{ background: AGENT_STATUS[a.status].color }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold truncate">{a.name}</span>
                      <span className="block text-[13px] text-subtle">{DESKS[a.desk as keyof typeof DESKS]?.short} · {AGENT_STATUS[a.status].label}</span>
                    </span>
                    <span className="text-right leading-tight">
                      <span className={cn('block text-[14px] font-bold num', load > 8 && 'text-warning')}>{load}</span>
                      <span className="block text-[13px] text-subtle">open</span>
                    </span>
                    <span className="text-right leading-tight pl-1">
                      <span className="block text-[14px] font-bold num">{a.handledToday}</span>
                      <span className="block text-[13px] text-subtle">today</span>
                    </span>
                    <ChevronRight size={14} className="text-subtle" />
                  </button>
                );
              })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
