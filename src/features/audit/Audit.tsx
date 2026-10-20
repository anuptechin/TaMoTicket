import { useMemo, useState } from 'react';
import { Check, Minus, ShieldCheck, Search } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { navigate } from '../../store/router';
import { PageHeader, Tabs, Avatar } from '../../components/ui';
import { dateTime } from '../../lib/format';

const PERMS: [string, boolean, boolean, boolean, boolean][] = [
  ['View and reply to own tickets', true, true, true, true],
  ['View all desks', false, true, true, true],
  ['Transfer between desks', true, true, true, true],
  ['Merge tickets', false, true, true, true],
  ['Change priority / SLA override', false, true, true, true],
  ['Edit SLA policies & business hours', false, false, true, true],
  ['Edit routing rules', false, true, true, true],
  ['Approve knowledge articles', false, true, true, true],
  ['Listen to call recordings', true, true, true, true],
  ['Export reports', false, true, true, true],
  ['Manage integrations', false, false, true, true],
  ['View audit trail', false, true, true, true],
];

export function AuditPage() {
  const audit = useStore((s) => s.auditLog);
  const tickets = useStore((s) => s.tickets);
  const [tab, setTab] = useState<'trail' | 'roles'>('trail');
  const [q, setQ] = useState('');

  // Seeded history so the trail is never empty: derived from ticket events.
  const history = useMemo(() => {
    const derived = tickets
      .flatMap((t) => t.interactions.filter((i) => i.type === 'event' && ['assigned', 'transferred', 'escalated', 'status', 'priority', 'merged'].includes(i.eventKind ?? '')).map((i) => ({ id: i.id, at: i.at, actor: (i.body?.match(/by ([A-Z][a-z]+ [A-Z]\.)/)?.[1]) ?? 'BizSensAi', action: i.body ?? '', target: t.id })))
      .sort((a, b) => b.at - a.at)
      .slice(0, 200);
    return [...audit, ...derived].sort((a, b) => b.at - a.at);
  }, [audit, tickets]);
  const rows = history.filter((r) => `${r.actor} ${r.action} ${r.target}`.toLowerCase().includes(q.toLowerCase())).slice(0, 150);

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="p-5 xl:p-6 max-w-[1300px] mx-auto">
        <PageHeader
          title="Audit & permissions"
          subtitle="Every action is logged with who, what and when. Roles map to Microsoft Entra ID groups."
          actions={<Tabs value={tab} onChange={setTab} items={[{ value: 'trail', label: 'Audit trail' }, { value: 'roles', label: 'Role permissions' }]} />}
        />
        {tab === 'trail' ? (
          <div className="card">
            <div className="p-3 border-b">
              <div className="relative max-w-[360px]">
                <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
                <input className="input pl-8" placeholder="Filter by user, action or ticket" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter audit trail" />
              </div>
            </div>
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-left text-[13px] uppercase tracking-wide text-subtle bg-surface2">
                  <th className="px-4 py-2.5 w-[170px]">When</th>
                  <th className="px-4 py-2.5 w-[180px]">Who</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5 w-[120px]">Target</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 text-muted num whitespace-nowrap">{dateTime(r.at)}</td>
                    <td className="px-4 py-2"><span className="flex items-center gap-2"><Avatar name={r.actor} size={22} />{r.actor}</span></td>
                    <td className="px-4 py-2">{r.action}</td>
                    <td className="px-4 py-2">
                      {r.target?.startsWith('TM-') ? (
                        <button className="mono font-semibold text-primary" onClick={() => navigate(`/ticket/${r.target}`)}>{r.target}</button>
                      ) : (
                        <span className="text-muted">{r.target}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-left bg-surface2">
                  <th className="px-4 py-3 font-semibold">Permission</th>
                  {['Agent', 'Supervisor', 'Manager', 'Function head'].map((r) => (
                    <th key={r} className="px-4 py-3 font-semibold text-center">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMS.map(([p, ...roles]) => (
                  <tr key={p} className="border-t">
                    <td className="px-4 py-2.5">{p}</td>
                    {roles.map((ok, j) => (
                      <td key={j} className="px-4 py-2.5 text-center">
                        {ok ? <Check size={16} className="inline text-success" aria-label="Allowed" /> : <Minus size={16} className="inline text-subtle" aria-label="Not allowed" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 border-t text-[13px] text-muted flex items-center gap-2"><ShieldCheck size={15} className="text-primary" /> Roles are assigned through Entra ID groups; changes are themselves audited.</div>
          </div>
        )}
      </div>
    </div>
  );
}
