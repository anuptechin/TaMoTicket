import { useMemo, useState } from 'react';
import { Save, Bell, Users, Briefcase, Crown, CalendarDays, Plus, Trash2, Clock, PauseCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PageHeader, PriorityChip, Toggle, Chip } from '../../components/ui';
import { computeSla } from '../../lib/sla';
import { PRIORITIES, ink } from '../../lib/meta';
import { cn, dateTime } from '../../lib/format';
import type { SLAPolicy } from '../../types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOLIDAY_NAMES: Record<string, string> = {
  '2026-01-26': 'Republic Day',
  '2026-03-04': 'Holi',
  '2026-08-15': 'Independence Day',
  '2026-10-02': 'Gandhi Jayanti',
  '2026-11-09': 'Diwali',
  '2026-12-25': 'Christmas',
};

const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const fromTime = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
};

export function SlaSettings() {
  const store = useStore();
  const [rows, setRows] = useState<SLAPolicy[]>(store.policies);
  const [cal, setCal] = useState(store.calendar);
  const [newHoliday, setNewHoliday] = useState('2026-12-31');
  const [rules, setRules] = useState({ awaiting: true, outside: true, resumeReply: true, holidays: true, vendor: false });
  const dirty = JSON.stringify(rows) !== JSON.stringify(store.policies) || JSON.stringify(cal) !== JSON.stringify(store.calendar);

  const preview = useMemo(() => computeSla(Date.now(), 'P2', rows, cal), [rows, cal]);

  const save = () => {
    store.setPolicies(rows);
    store.setCalendar(cal);
    store.toast({ tone: 'success', title: 'SLA settings saved', body: 'New and re-prioritised tickets use the updated policy' });
  };

  const ladder = [
    { icon: Bell, who: 'Ticket owner', when: 'At 75% of SLA', how: 'In-app, email, Teams', color: '#D97706' },
    { icon: Users, who: 'Supervisor', when: 'On breach', how: 'In-app, Teams, SMS', color: '#EA580C' },
    { icon: Briefcase, who: 'Manager', when: 'Breach + 4 h', how: 'Email, Teams, SMS', color: '#DC2626' },
    { icon: Crown, who: 'Function head', when: 'Breach + 12 h', how: 'Email + daily digest', color: '#991B1B' },
  ];

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="p-5 xl:p-6 max-w-[1300px] mx-auto">
        <PageHeader
          title="SLA & escalation"
          subtitle="Response and resolution targets in business hours, with automatic alerts and an escalation ladder"
          actions={
            <button className="btn-primary" onClick={save} disabled={!dirty}>
              <Save size={15} /> {dirty ? 'Save changes' : 'Saved'}
            </button>
          }
        />

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4">
          <section className="card">
            <div className="px-4 h-12 border-b flex items-center font-semibold text-[14px]">Priority matrix</div>
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-left text-[13px] uppercase tracking-wide text-subtle">
                  <th className="px-4 py-2.5 font-semibold">Priority</th>
                  <th className="px-4 py-2.5 font-semibold">First response (h)</th>
                  <th className="px-4 py-2.5 font-semibold">Resolution (h)</th>
                  <th className="px-4 py-2.5 font-semibold">Example</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.priority} className="border-t">
                    <td className="px-4 py-2.5"><PriorityChip p={r.priority} size="md" /></td>
                    {(['responseH', 'resolutionH'] as const).map((k) => (
                      <td key={k} className="px-4 py-2.5">
                        <input
                          type="number"
                          min={1}
                          max={240}
                          className="input w-24 mono"
                          value={r[k]}
                          aria-label={`${r.priority} ${k === 'responseH' ? 'response' : 'resolution'} hours`}
                          onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, [k]: Math.max(1, Number(e.target.value) || 1) } : x)))}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-[13px] text-muted">
                      {{ P1: 'Vehicle off road, bulk order stuck', P2: 'Wrong part, double payment', P3: 'Dispatch / points query', P4: 'Price list, information' }[r.priority]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="m-4 rounded-lg bg-primary/[0.06] border border-primary/20 p-3 text-[13px]">
              <span className="font-semibold">Live preview:</span> a <span style={{ color: ink(PRIORITIES.P2.color) }} className="font-semibold">P2</span> ticket created now is due for first response by{' '}
              <span className="font-semibold">{dateTime(preview.responseDueAt)}</span> and resolution by <span className="font-semibold">{dateTime(preview.resolutionDueAt)}</span> (business hours, holidays skipped).
            </div>
          </section>

          <section className="card">
            <div className="px-4 h-12 border-b flex items-center font-semibold text-[14px]">Escalation ladder</div>
            <div className="p-4">
              <ol className="relative flex flex-col gap-4">
                <span className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-warning via-critical to-[#991B1B]" aria-hidden />
                {ladder.map((s, i) => (
                  <li key={s.who} className="relative flex items-start gap-3">
                    <span className="relative z-10 h-10 w-10 rounded-full flex items-center justify-center text-white shrink-0 ring-4 ring-surface" style={{ background: s.color }}>
                      <s.icon size={17} />
                    </span>
                    <div className="pt-0.5">
                      <div className="text-[13.5px] font-semibold">L{i + 1} · {s.who}</div>
                      <div className="text-[13px]" style={{ color: ink(s.color) }}>{s.when}</div>
                      <div className="text-[13px] text-subtle">{s.how}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="card">
            <div className="px-4 h-12 border-b flex items-center gap-2 font-semibold text-[14px]"><Clock size={16} className="text-primary" /> Business hours</div>
            <div className="p-4">
              <div className="label mb-2">Working days</div>
              <div className="flex gap-1.5 flex-wrap">
                {DAYS.map((d, i) => {
                  const on = cal.days.includes(i);
                  return (
                    <button
                      key={d}
                      aria-pressed={on}
                      onClick={() => setCal((c) => ({ ...c, days: on ? c.days.filter((x) => x !== i) : [...c.days, i].sort() }))}
                      className={cn('h-9 w-12 rounded-lg border text-[13px] font-semibold', on ? 'bg-primary text-white border-primary' : 'text-muted hover:bg-surface2')}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 max-w-[320px]">
                <label className="label">
                  Opens
                  <input type="time" className="input mt-1 mono" value={toTime(cal.startMin)} onChange={(e) => setCal((c) => ({ ...c, startMin: fromTime(e.target.value) }))} />
                </label>
                <label className="label">
                  Closes
                  <input type="time" className="input mt-1 mono" value={toTime(cal.endMin)} onChange={(e) => setCal((c) => ({ ...c, endMin: fromTime(e.target.value) }))} />
                </label>
              </div>
              <p className="text-[13px] text-subtle mt-3">Outside these hours the AI voice bot and WhatsApp bot answer, and SLA clocks wait for the next working morning.</p>
            </div>
          </section>

          <section className="card">
            <div className="px-4 h-12 border-b flex items-center gap-2 font-semibold text-[14px]"><CalendarDays size={16} className="text-primary" /> Holidays</div>
            <div className="p-4">
              <div className="flex flex-col gap-1.5">
                {cal.holidays.map((h) => (
                  <div key={h} className="flex items-center gap-3 rounded-lg border px-3 h-10 text-[13.5px]">
                    <span className="mono">{h}</span>
                    <span className="text-muted">{HOLIDAY_NAMES[h] ?? 'Company holiday'}</span>
                    <button className="btn-ghost h-7 px-1.5 ml-auto" aria-label={`Remove ${h}`} onClick={() => setCal((c) => ({ ...c, holidays: c.holidays.filter((x) => x !== h) }))}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <input type="date" className="input mono" value={newHoliday} onChange={(e) => setNewHoliday(e.target.value)} aria-label="New holiday date" />
                <button className="btn-secondary" onClick={() => newHoliday && !cal.holidays.includes(newHoliday) && setCal((c) => ({ ...c, holidays: [...c.holidays, newHoliday].sort() }))}>
                  <Plus size={15} /> Add
                </button>
              </div>
            </div>
          </section>

          <section className="card xl:col-span-2">
            <div className="px-4 h-12 border-b flex items-center gap-2 font-semibold text-[14px]"><PauseCircle size={16} className="text-primary" /> Pause & resume rules</div>
            <div className="grid md:grid-cols-2 gap-px bg-hairline">
              {[
                ['awaiting', 'Pause while status is “Awaiting customer”', 'Clock stops when we are waiting on the customer'],
                ['resumeReply', 'Resume automatically on customer reply', 'Any inbound email, WhatsApp or call resumes the clock'],
                ['outside', 'Count only business hours', 'Nights and Sundays are excluded'],
                ['holidays', 'Skip holidays', 'Uses the holiday calendar above'],
                ['vendor', 'Pause while waiting on an external vendor', 'Off: vendor time counts against the SLA'],
              ].map(([k, l, d]) => (
                <div key={k} className="bg-surface flex items-center gap-3 px-4 py-3">
                  <div className="flex-1">
                    <div className="text-[13.5px] font-medium">{l}</div>
                    <div className="text-[13px] text-subtle">{d}</div>
                  </div>
                  <Toggle
                    on={rules[k as keyof typeof rules]}
                    label={l}
                    onChange={(v) => {
                      setRules((r) => ({ ...r, [k]: v }));
                      store.toast({ tone: 'success', title: `${v ? 'Enabled' : 'Disabled'}: ${l}` });
                    }}
                  />
                </div>
              ))}
              <div className="bg-surface px-4 py-3 flex items-center">
                <Chip tone="info">Unit-tested SLA engine · business hours, holidays, pause</Chip>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
