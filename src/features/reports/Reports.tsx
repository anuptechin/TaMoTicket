import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, Printer, FileSpreadsheet, Mail, CalendarClock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { inboxLink, navigate } from '../../store/router';
import { PageHeader, Tabs, Toggle, PriorityChip } from '../../components/ui';
import { categoryCounts, computeKpis, slaByDesk } from '../../lib/metrics';
import { CHANNEL_KEYS, CHANNELS, DESK_KEYS, DESKS, PRIORITY_KEYS, ink, isOpen } from '../../lib/meta';
import { slaState } from '../../lib/sla';
import { DAY, shortDate, startOfDay } from '../../lib/format';
import { CLIENT_LABEL } from '../../config';

type Tab = 'daily' | 'weekly' | 'monthly';

const tooltipStyle = { borderRadius: 10, border: '1px solid rgb(var(--hairline))', background: 'rgb(var(--surface))', fontSize: 13 };

export function Reports() {
  const tickets = useStore((s) => s.tickets.filter((t) => !t.mergedInto));
  const schedule = useStore((s) => s.emailSchedule);
  const toggleSchedule = useStore((s) => s.toggleSchedule);
  const toast = useStore((s) => s.toast);
  const customers = useStore((s) => s.customers);
  const [tab, setTab] = useState<Tab>('daily');
  const now = Date.now();
  const k = useMemo(() => computeKpis(tickets, now), [tickets]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportAs = (fmt: string) => toast({ tone: 'success', title: `Exported ${tab} report as ${fmt}`, body: `${CLIENT_LABEL}_${tab}_report_${new Date().toISOString().slice(0, 10)}.${fmt.toLowerCase()}` });

  const today0 = startOfDay(now);
  const yesterday = tickets.filter((t) => t.createdAt >= today0 - DAY && t.createdAt < today0);
  const closedY = tickets.filter((t) => t.resolvedAt && t.resolvedAt >= today0 - DAY && t.resolvedAt < today0);
  const breachesY = closedY.filter((t) => slaState(t.sla, t.status, now, t.resolvedAt) === 'breached');
  const topIssues = categoryCounts(tickets.filter((t) => now - t.createdAt < 7 * DAY)).slice(0, 5);

  const weekly = useMemo(() => {
    const start = today0 - 6 * DAY;
    return Array.from({ length: 7 }, (_, i) => {
      const d0 = start + i * DAY;
      const row: Record<string, string | number> = { day: shortDate(d0) };
      DESK_KEYS.forEach((d) => {
        const done = tickets.filter((t) => t.desk === d && t.resolvedAt && t.resolvedAt >= d0 && t.resolvedAt < d0 + DAY);
        const met = done.filter((t) => slaState(t.sla, t.status, now, t.resolvedAt) === 'met').length;
        row[d] = done.length ? Math.round((met / done.length) * 1000) / 10 : 100;
      });
      return row;
    });
  }, [tickets]); // eslint-disable-line react-hooks/exhaustive-deps

  const matrix = DESK_KEYS.map((d) => ({
    desk: d,
    cells: PRIORITY_KEYS.map((p) => {
      const done = tickets.filter((t) => t.desk === d && t.priority === p && !isOpen(t.status) && now - t.createdAt < 7 * DAY);
      const met = done.filter((t) => slaState(t.sla, t.status, now, t.resolvedAt) === 'met').length;
      return { p, total: done.length, pct: done.length ? (met / done.length) * 100 : 100 };
    }),
  }));

  const monthly = useMemo(() => {
    const weeks = 4;
    return Array.from({ length: weeks }, (_, i) => {
      const from = now - (weeks - i) * 7 * DAY;
      const to = from + 7 * DAY;
      const w = tickets.filter((t) => t.createdAt >= from && t.createdAt < to);
      const kk = computeKpis(w, now);
      return { week: `Week ${i + 1}`, volume: w.length, csat: Math.round(kk.csat * 100) / 100, ai: Math.round(kk.aiResolution), fcr: Math.round(kk.fcr), sla: Math.round(kk.slaCompliance * 10) / 10 };
    });
  }, [tickets]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="p-5 xl:p-6 max-w-[1400px] mx-auto">
        <PageHeader
          title="Reports"
          subtitle="Daily bulletin, weekly SLA report and monthly performance, with scheduled email delivery"
          actions={
            <>
              <Tabs<Tab> value={tab} onChange={setTab} items={[{ value: 'daily', label: 'Daily bulletin' }, { value: 'weekly', label: 'Weekly SLA' }, { value: 'monthly', label: 'Monthly' }]} />
              <button className="btn-secondary" onClick={() => exportAs('PDF')}><Download size={15} /> PDF</button>
              <button className="btn-secondary" onClick={() => exportAs('XLSX')}><FileSpreadsheet size={15} /> Excel</button>
              <button className="btn-secondary" onClick={() => window.print()}><Printer size={15} /> Print</button>
            </>
          }
        />

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-4 items-start">
          <div>
            {tab === 'daily' && (
              <article className="card p-8 max-w-[860px] mx-auto shadow-sm" style={{ fontFeatureSettings: '"tnum"' }}>
                <header className="flex items-start justify-between border-b pb-4">
                  <div>
                    <div className="eyebrow">Daily operations bulletin</div>
                    <h2 className="text-[22px] font-bold tracking-tight mt-0.5">{CLIENT_LABEL} support</h2>
                    <div className="text-[13px] text-muted">{new Date(today0 - DAY).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · all desks</div>
                  </div>
                  <div className="text-right text-[13px] text-subtle">Generated 07:00 by BizSensAi<br />Distribution: support leadership</div>
                </header>
                <section className="grid grid-cols-4 gap-4 py-5 border-b">
                  {[
                    ['Tickets received', yesterday.length, { view: 'all', range: '1' }],
                    ['Resolved', closedY.length, { view: 'closed' }],
                    ['SLA compliance', `${k.slaCompliance.toFixed(1)}%`, { view: 'breached' }],
                    ['AI / self-service', `${k.aiResolution.toFixed(0)}%`, { view: 'ai' }],
                    ['Median acknowledgement', `${k.ackMedian} s`, { view: 'all' }],
                    ['Open backlog', k.open, { view: 'open' }],
                    ['CSAT', `${k.csat.toFixed(1)} / 5`, { view: 'closed' }],
                    ['Missed requests', 0, { view: 'all' }],
                  ].map(([l, v, q]) => (
                    <button key={l as string} className="text-left hover:bg-surface2 rounded-lg p-1 -m-1" onClick={() => navigate(inboxLink(q as Record<string, string>))}>
                      <div className="text-[13px] text-subtle">{l as string}</div>
                      <div className="text-[22px] font-bold num">{v as string}</div>
                    </button>
                  ))}
                </section>
                <section className="grid grid-cols-2 gap-6 py-5 border-b">
                  <div>
                    <h3 className="font-semibold text-[14px] mb-2">Top issues · last 7 days</h3>
                    <ol className="flex flex-col gap-1.5 text-[13.5px]">
                      {topIssues.map((c, i) => (
                        <li key={c.category} className="flex items-center gap-2">
                          <span className="mono text-subtle w-4">{i + 1}</span>
                          <button className="hover:text-primary" onClick={() => navigate(inboxLink({ category: c.category, view: 'all', range: '7' }))}>{c.category}</button>
                          <span className="ml-auto num font-semibold">{c.count}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[14px] mb-2">By desk</h3>
                    <table className="w-full text-[13.5px]">
                      <tbody>
                        {slaByDesk(tickets, now).map((d) => (
                          <tr key={d.desk} className="border-b last:border-0">
                            <td className="py-1.5">{DESKS[d.desk].label}</td>
                            <td className="py-1.5 text-right num">{tickets.filter((t) => t.desk === d.desk && isOpen(t.status)).length} open</td>
                            <td className="py-1.5 text-right num font-semibold">{d.compliance.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section className="py-5 border-b">
                  <h3 className="font-semibold text-[14px] mb-2">SLA breaches yesterday ({breachesY.length})</h3>
                  {breachesY.length === 0 ? (
                    <p className="text-[13.5px] text-muted">No breaches. All resolved tickets met their SLA.</p>
                  ) : (
                    <ul className="text-[13.5px] flex flex-col gap-1">
                      {breachesY.slice(0, 5).map((t) => (
                        <li key={t.id}>
                          <button className="mono font-semibold text-primary mr-2" onClick={() => navigate(`/ticket/${t.id}`)}>{t.id}</button>
                          {t.subject} <span className="text-subtle">· {customers.find((c) => c.id === t.customerId)?.city}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <section className="pt-5">
                  <h3 className="font-semibold text-[14px] mb-2">Highlights</h3>
                  <ul className="text-[13.5px] list-disc pl-5 flex flex-col gap-1">
                    <li>Recurring issue: dispatch delays from Pune WH (up 41% week on week). Warehouse Ops engaged.</li>
                    <li>Loyalty credit failures after the 02:00 batch run: 14 failures; CRM team fixing the job.</li>
                    <li>Voice bot handled 212 after-hours calls; 61% resolved without an agent.</li>
                    <li>Proactive delay alerts on WhatsApp prevented an estimated 41 inbound calls this week.</li>
                  </ul>
                </section>
              </article>
            )}

            {tab === 'weekly' && (
              <div className="flex flex-col gap-4">
                <section className="card p-4">
                  <h3 className="font-semibold text-[14px]">SLA compliance by desk · last 7 days</h3>
                  <div className="h-[260px] mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weekly} margin={{ left: -10, right: 8, top: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--hairline))" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 13, fill: 'rgb(var(--subtle))' }} tickLine={false} axisLine={false} />
                        <YAxis domain={[80, 100]} tick={{ fontSize: 13, fill: 'rgb(var(--subtle))' }} tickLine={false} axisLine={false} unit="%" />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 13 }} />
                        {DESK_KEYS.map((d) => (
                          <Bar key={d} dataKey={d} name={DESKS[d].label} fill={DESKS[d].color} radius={[4, 4, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="card">
                  <div className="px-4 h-12 border-b flex items-center font-semibold text-[14px]">Desk × priority compliance (7 days, resolved)</div>
                  <table className="w-full text-[13.5px]">
                    <thead>
                      <tr className="text-left text-[13px] text-subtle uppercase tracking-wide">
                        <th className="px-4 py-2.5">Desk</th>
                        {PRIORITY_KEYS.map((p) => <th key={p} className="px-4 py-2.5"><PriorityChip p={p} /></th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.map((r) => (
                        <tr key={r.desk} className="border-t">
                          <td className="px-4 py-2.5 font-medium">{DESKS[r.desk].label}</td>
                          {r.cells.map((c) => (
                            <td key={c.p} className="px-4 py-2.5">
                              <button onClick={() => navigate(inboxLink({ desk: r.desk, priority: c.p, view: 'closed', range: '7' }))} className="num font-semibold hover:underline" style={{ color: ink(c.pct >= 95 ? '#16A34A' : c.pct >= 85 ? '#D97706' : '#DC2626') }}>
                                {c.pct.toFixed(0)}%
                              </button>
                              <span className="text-[13px] text-subtle ml-1.5">n={c.total}</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </div>
            )}

            {tab === 'monthly' && (
              <div className="grid md:grid-cols-2 gap-4">
                <section className="card p-4">
                  <h3 className="font-semibold text-[14px]">Ticket volume by week</h3>
                  <div className="h-[220px] mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthly} margin={{ left: -14, right: 8, top: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--hairline))" vertical={false} />
                        <XAxis dataKey="week" tick={{ fontSize: 13, fill: 'rgb(var(--subtle))' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 13, fill: 'rgb(var(--subtle))' }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="volume" name="Tickets" fill="#0E7C86" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="card p-4">
                  <h3 className="font-semibold text-[14px]">AI resolution & FCR (%)</h3>
                  <div className="h-[220px] mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthly} margin={{ left: -14, right: 8, top: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--hairline))" vertical={false} />
                        <XAxis dataKey="week" tick={{ fontSize: 13, fill: 'rgb(var(--subtle))' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 13, fill: 'rgb(var(--subtle))' }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 13 }} />
                        <Line type="monotone" dataKey="ai" name="AI resolution" stroke="#7C3AED" strokeWidth={2.2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="fcr" name="FCR" stroke="#0284C7" strokeWidth={2.2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="card p-4">
                  <h3 className="font-semibold text-[14px]">SLA compliance & CSAT</h3>
                  <table className="w-full text-[13.5px] mt-2">
                    <thead><tr className="text-left text-[13px] text-subtle"><th className="py-1.5">Week</th><th>SLA</th><th>CSAT</th><th>Volume</th></tr></thead>
                    <tbody>
                      {monthly.map((m) => (
                        <tr key={m.week} className="border-t">
                          <td className="py-2">{m.week}</td>
                          <td className="num font-semibold" style={{ color: ink(m.sla >= 95 ? '#16A34A' : '#D97706') }}>{m.sla}%</td>
                          <td className="num">{m.csat.toFixed(2)}</td>
                          <td className="num">{m.volume}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
                <section className="card p-4">
                  <h3 className="font-semibold text-[14px]">Channel mix · 30 days</h3>
                  <div className="mt-3 flex flex-col gap-2">
                    {CHANNEL_KEYS.map((c) => {
                      const n = tickets.filter((t) => t.channel === c).length;
                      const pct = (n / tickets.length) * 100;
                      return (
                        <button key={c} onClick={() => navigate(inboxLink({ channel: c, view: 'all' }))} className="text-left">
                          <div className="flex justify-between text-[13px]"><span>{CHANNELS[c].label}</span><span className="num font-semibold">{pct.toFixed(0)}% · {n}</span></div>
                          <div className="h-2 rounded-full bg-hairline mt-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: CHANNELS[c].color }} /></div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}
          </div>

          <aside className="card p-4 no-print">
            <div className="flex items-center gap-2 font-semibold text-[14px]"><CalendarClock size={16} className="text-primary" /> Email schedule</div>
            <div className="mt-3 flex flex-col gap-3">
              {[
                ['daily', 'Daily bulletin', 'Every day 07:00 · leadership list'],
                ['weekly', 'Weekly SLA report', 'Monday 08:00 · supervisors'],
                ['monthly', 'Monthly dashboard', '1st of month · function head'],
              ].map(([key, l, d]) => (
                <div key={key} className="flex items-center gap-3">
                  <Mail size={15} className="text-subtle" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-medium">{l}</div>
                    <div className="text-[13px] text-subtle">{d}</div>
                  </div>
                  <Toggle
                    on={!!schedule[key]}
                    label={`Schedule ${l}`}
                    onChange={() => {
                      toggleSchedule(key);
                      toast({ tone: 'success', title: `${l} ${schedule[key] ? 'unscheduled' : 'scheduled'}` });
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="mt-4 pt-3 border-t text-[13px] text-muted">Drill-down: every number in a report opens the matching tickets.</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
