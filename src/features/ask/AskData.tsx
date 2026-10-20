import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Sparkles, Send, Loader2, ArrowRight, Database } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { navigate } from '../../store/router';
import { ChannelIcon, Chip, PageHeader, PriorityChip, StatusBadge } from '../../components/ui';
import { aiComplete, latency } from '../../services/ai';
import { categoryCounts, computeKpis, slaByDesk } from '../../lib/metrics';
import { CHANNEL_KEYS, CHANNELS, DESK_KEYS, DESKS, isOpen } from '../../lib/meta';
import { slaState } from '../../lib/sla';
import { DAY, HOUR, shortDate, startOfDay } from '../../lib/format';
import type { Customer, Ticket } from '../../types';

interface Answer {
  q: string;
  text: string;
  chart?: { label: string; value: number; color?: string }[];
  unit?: string;
  tickets: Ticket[];
  sql: string;
  live?: boolean;
}

const SAMPLES = [
  'How many P1 tickets breached SLA in eDukaan this week?',
  'Top 5 recurring issues for Pune dealers',
  'Which channel has the slowest first response?',
  'Show Loyalty tickets open for more than 48 hours',
  'What is the AI resolution rate by desk?',
  'Which agents have the highest CSAT?',
  'How many tickets came from WhatsApp today?',
  'Compare SLA compliance across desks',
];

function answerFor(q: string, tickets: Ticket[], customers: Customer[], agents: ReturnType<typeof useStore.getState>['agents']): Answer | null {
  const s = q.toLowerCase();
  const now = Date.now();
  const week = tickets.filter((t) => now - t.createdAt < 7 * DAY);
  if (s.includes('p1') && s.includes('breach')) {
    const desk = s.includes('loyalty') ? 'loyalty' : s.includes('helpline') ? 'helpline' : 'edukaan';
    const all = week.filter((t) => t.desk === desk && t.priority === 'P1');
    const br = all.filter((t) => slaState(t.sla, t.status, now, t.resolvedAt) === 'breached');
    const days = Array.from({ length: 7 }, (_, i) => {
      const d0 = startOfDay(now) - (6 - i) * DAY;
      return { label: shortDate(d0), value: all.filter((t) => t.createdAt >= d0 && t.createdAt < d0 + DAY).length, color: '#0E7C86' };
    });
    return {
      q,
      text: `${br.length} of ${all.length} P1 tickets on ${DESKS[desk].label} breached SLA in the last 7 days (${all.length ? ((1 - br.length / all.length) * 100).toFixed(0) : 100}% compliance). The chart shows P1 volume per day.`,
      chart: days,
      tickets: br.length ? br : all,
      sql: `SELECT id FROM tickets WHERE desk='${desk}' AND priority='P1' AND created_at > now()-7d AND sla_state='breached'`,
    };
  }
  if (s.includes('pune') || s.includes('recurring')) {
    const city = 'Pune';
    const ids = new Set(customers.filter((c) => c.city === city).map((c) => c.id));
    const ts = tickets.filter((t) => ids.has(t.customerId));
    const top = categoryCounts(ts).slice(0, 5);
    return {
      q,
      text: `Pune customers raised ${ts.length} tickets in 30 days. The top issue is "${top[0]?.category}" (${top[0]?.count}), driven by dispatch delays from Pune WH.`,
      chart: top.map((c, i) => ({ label: c.category, value: c.count, color: i === 0 ? '#0E7C86' : '#94A3B8' })),
      tickets: ts.slice(-12).reverse(),
      sql: `SELECT category, count(*) FROM tickets JOIN customers USING(customer_id) WHERE city='Pune' GROUP BY 1 ORDER BY 2 DESC LIMIT 5`,
    };
  }
  if (s.includes('slowest') || s.includes('first response')) {
    const rows = CHANNEL_KEYS.map((c) => {
      const r = tickets.filter((t) => t.channel === c && t.sla.respondedAt);
      const avg = r.length ? r.reduce((a, t) => a + (t.sla.respondedAt! - t.createdAt), 0) / r.length / HOUR : 0;
      return { label: CHANNELS[c].label, value: Math.round(avg * 10) / 10, color: CHANNELS[c].color };
    }).sort((a, b) => b.value - a.value);
    return {
      q,
      text: `${rows[0].label} has the slowest average first response at ${rows[0].value} h; ${rows[rows.length - 1].label} is fastest at ${rows[rows.length - 1].value} h. All channels are within the P3 response target.`,
      chart: rows,
      unit: ' h',
      tickets: [],
      sql: `SELECT channel, avg(first_response_at - created_at) FROM tickets GROUP BY channel ORDER BY 2 DESC`,
    };
  }
  if (s.includes('48')) {
    const ts = tickets.filter((t) => t.desk === 'loyalty' && isOpen(t.status) && now - t.createdAt > 48 * HOUR);
    return { q, text: `${ts.length} Loyalty tickets have been open for more than 48 hours.`, tickets: ts, sql: `SELECT * FROM tickets WHERE desk='loyalty' AND status IN ('new','open','pending','awaiting') AND created_at < now()-48h` };
  }
  if (s.includes('ai resolution') || (s.includes('ai') && s.includes('desk'))) {
    const rows = DESK_KEYS.map((d) => ({ label: DESKS[d].label, value: Math.round(computeKpis(tickets.filter((t) => t.desk === d), now).aiResolution), color: DESKS[d].color }));
    return { q, text: `AI and self-service resolve ${Math.round(computeKpis(tickets, now).aiResolution)}% overall. Loyalty leads because balance and credit queries are fully automated.`, chart: rows, unit: '%', tickets: tickets.filter((t) => t.aiResolved).slice(-10).reverse(), sql: `SELECT desk, avg(ai_resolved::int) FROM tickets WHERE status IN ('resolved','closed') GROUP BY desk` };
  }
  if (s.includes('csat') && s.includes('agent')) {
    const rows = agents.filter((a) => a.role === 'agent').sort((a, b) => b.csat - a.csat).slice(0, 6).map((a, i) => ({ label: a.name.split(' ')[0], value: a.csat, color: i === 0 ? '#D97706' : '#94A3B8' }));
    return { q, text: `${rows[0].label} has the highest CSAT at ${rows[0].value}/5 this month, followed by ${rows[1].label} (${rows[1].value}).`, chart: rows, unit: '', tickets: [], sql: `SELECT agent, avg(csat) FROM tickets WHERE csat IS NOT NULL GROUP BY agent ORDER BY 2 DESC` };
  }
  if (s.includes('whatsapp')) {
    const ts = tickets.filter((t) => t.channel === 'whatsapp' && t.createdAt >= startOfDay(now));
    return { q, text: `${ts.length} tickets came in on WhatsApp today; ${ts.filter((t) => t.aiResolved).length} were resolved by the bot.`, tickets: ts, sql: `SELECT * FROM tickets WHERE channel='whatsapp' AND created_at >= today()` };
  }
  if (s.includes('sla') && (s.includes('compare') || s.includes('desk'))) {
    const rows = slaByDesk(tickets, now).map((d) => ({ label: DESKS[d.desk].label, value: d.compliance, color: d.compliance >= 95 ? '#16A34A' : '#D97706' }));
    return { q, text: `All desks are tracked against the 95% target. ${rows.sort((a, b) => b.value - a.value)[0].label} leads at ${rows[0].value}%.`, chart: rows, unit: '%', tickets: tickets.filter((t) => slaState(t.sla, t.status, now, t.resolvedAt) === 'breached').slice(0, 10), sql: `SELECT desk, avg((resolved_at <= resolution_due)::int) FROM tickets WHERE status IN ('resolved','closed') GROUP BY desk` };
  }
  return null;
}

export function AskData() {
  const tickets = useStore((s) => s.tickets.filter((t) => !t.mergedInto));
  const customers = useStore((s) => s.customers);
  const agents = useStore((s) => s.agents);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const ask = async (question: string) => {
    if (!question.trim()) return;
    setBusy(true);
    setQ('');
    await latency(500, 900);
    let a = answerFor(question, tickets, customers, agents);
    if (!a) {
      const k = computeKpis(tickets, Date.now());
      const context = `Data: ${k.total} tickets in 30 days, ${k.open} open, SLA compliance ${k.slaCompliance.toFixed(1)}%, AI resolution ${k.aiResolution.toFixed(0)}%, CSAT ${k.csat.toFixed(2)}, median acknowledgement ${k.ackMedian}s. Desks: Parts Helpline, eDukaan, Loyalty. Top categories: ${categoryCounts(tickets).slice(0, 5).map((c) => `${c.category} ${c.count}`).join(', ')}.`;
      const res = await aiComplete(`${context}\nQuestion: ${question}\nAnswer in two sentences using only the data given.`, `I can answer questions about ticket volumes, SLA compliance, channels, desks, agents and recurring issues. Try: “${SAMPLES[1]}”.`, 'You are an analytics assistant for a customer support team.');
      a = { q: question, text: res.text, tickets: [], sql: '-- free-form question', live: res.live };
    }
    setAnswers((prev) => [a!, ...prev]);
    setBusy(false);
  };

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="p-5 xl:p-6 max-w-[1100px] mx-auto">
        <PageHeader title="Ask your data" subtitle="Ask in plain English. Answers come with a chart and the tickets behind them." />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
          className="card p-2 flex items-center gap-2 shadow-sm"
        >
          <Sparkles size={18} className="text-primary ml-2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 h-11 bg-transparent outline-none text-[15px] placeholder:text-subtle" placeholder="How many P1 tickets breached SLA in eDukaan this week?" aria-label="Ask a question" />
          <button className="btn-primary h-10" disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Ask
          </button>
        </form>
        <div className="flex flex-wrap gap-2 mt-3">
          {SAMPLES.map((s) => (
            <button key={s} onClick={() => ask(s)} disabled={busy} className="rounded-full border bg-surface px-3 h-8 text-[13px] text-muted hover:text-primary hover:border-primary/40">
              {s}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {busy && (
            <div className="card p-5 flex items-center gap-3 text-[13.5px] text-muted">
              <Loader2 size={16} className="animate-spin text-primary" /> Translating the question, querying 30 days of tickets…
            </div>
          )}
          {answers.map((a, i) => (
            <div key={answers.length - i} className="card overflow-hidden">
              <div className="px-5 pt-4">
                <div className="text-[13px] text-subtle">You asked</div>
                <div className="text-[15px] font-semibold">{a.q}</div>
                <div className="mt-3 flex gap-2.5">
                  <span className="h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br from-primary to-[#4F46E5] text-white flex items-center justify-center"><Sparkles size={14} /></span>
                  <p className="text-[14px] leading-relaxed">{a.text}</p>
                </div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Chip><Database size={11} /> <span className="mono text-[13px] truncate max-w-[520px]">{a.sql}</span></Chip>
                  {a.live && <Chip tone="primary">Claude</Chip>}
                </div>
              </div>
              {a.chart && (
                <div className="h-[200px] px-3 pt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={a.chart} margin={{ left: -14, right: 8, top: 6 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--hairline))" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 13, fill: 'rgb(var(--subtle))' }} tickLine={false} axisLine={false} interval={0} />
                      <YAxis tick={{ fontSize: 13, fill: 'rgb(var(--subtle))' }} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(v: number) => `${v}${a.unit ?? ''}`} contentStyle={{ borderRadius: 10, border: '1px solid rgb(var(--hairline))', background: 'rgb(var(--surface))', fontSize: 13 }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {a.chart.map((c, j) => <Cell key={j} fill={c.color ?? '#0E7C86'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {a.tickets.length > 0 && (
                <div className="border-t mt-3">
                  <div className="px-5 py-2 text-[13px] text-subtle font-semibold uppercase tracking-wide">{a.tickets.length} tickets</div>
                  {a.tickets.slice(0, 8).map((t) => (
                    <button key={t.id} onClick={() => navigate(`/ticket/${t.id}`)} className="w-full flex items-center gap-3 px-5 py-2 border-t hover:bg-surface2 text-left">
                      <ChannelIcon c={t.channel} size={26} />
                      <span className="mono text-[13px] font-semibold w-[78px]">{t.id}</span>
                      <span className="text-[13.5px] truncate flex-1">{t.subject}</span>
                      <span className="text-[13px] text-subtle hidden md:inline">{custMap.get(t.customerId)?.city}</span>
                      <PriorityChip p={t.priority} />
                      <StatusBadge s={t.status} />
                      <ArrowRight size={14} className="text-subtle" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {answers.length === 0 && !busy && (
            <div className="text-center text-muted text-[13.5px] py-10">Pick a sample question above to see an answer with its chart and tickets.</div>
          )}
        </div>
      </div>
    </div>
  );
}
