import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  Inbox as InboxIcon,
  User,
  UserX,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Clock,
  Layers,
  Search,
  X,
  Merge,
  CheckCircle2,
  Bot,
  ArrowRightLeft,
  Sparkles,
  ListFilter,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useNow } from '../../store/clock';
import { navigate, useRoute } from '../../store/router';
import { Avatar, ChannelIcon, Chip, DeskBadge, EmptyState, PriorityChip, SlaBar, Skeleton, useFakeLoad, Modal } from '../../components/ui';
import { CATEGORIES, CHANNEL_KEYS, CHANNELS, DESK_KEYS, DESKS, PRIORITY_KEYS, STATUSES, STATUS_KEYS, isOpen } from '../../lib/meta';
import { slaConsumed, slaState } from '../../lib/sla';
import { AGEING_BUCKETS } from '../../lib/metrics';
import { cn, DAY, HOUR, startOfDay, timeAgo } from '../../lib/format';
import type { Priority, Ticket } from '../../types';

const VIEWS = [
  { key: 'mine', label: 'My tickets', icon: User },
  { key: 'unassigned', label: 'Unassigned', icon: UserX },
  { key: 'sla_risk', label: 'SLA at risk', icon: AlertTriangle },
  { key: 'breached', label: 'Breached', icon: XCircle },
  { key: 'escalated', label: 'Escalated', icon: TrendingUp },
  { key: 'awaiting', label: 'Awaiting customer', icon: Clock },
  { key: 'open', label: 'All open', icon: InboxIcon },
  { key: 'today', label: 'Created today', icon: Sparkles },
  { key: 'ai', label: 'Resolved by AI', icon: Bot },
  { key: 'closed', label: 'Closed', icon: CheckCircle2 },
  { key: 'all', label: 'Everything', icon: Layers },
] as const;

type ViewKey = (typeof VIEWS)[number]['key'];

function matchView(t: Ticket, view: string, me: string | undefined, now: number) {
  const open = isOpen(t.status);
  switch (view as ViewKey) {
    case 'mine':
      return open && t.assigneeId === me;
    case 'unassigned':
      return open && !t.assigneeId;
    case 'sla_risk':
      return open && !t.sla.pausedAt && slaConsumed(t.sla, now) >= 0.75 && slaConsumed(t.sla, now) < 1;
    case 'breached':
      return slaState(t.sla, t.status, now, t.resolvedAt) === 'breached';
    case 'escalated':
      return open && t.escalationLevel >= 2;
    case 'awaiting':
      return t.status === 'awaiting' || t.status === 'pending';
    case 'open':
      return open;
    case 'today':
      return t.createdAt >= startOfDay(now);
    case 'ai':
      return !!t.aiResolved;
    case 'closed':
      return !open;
    default:
      return true;
  }
}

const ROW_H = 58;

export function InboxPage() {
  const { query } = useRoute();
  const tickets = useStore((s) => s.tickets);
  const customers = useStore((s) => s.customers);
  const agents = useStore((s) => s.agents);
  const session = useStore((s) => s.session);
  const store = useStore();
  const now = useNow();
  const minute = Math.floor(now / 30000);
  const ready = useFakeLoad(320);

  const defaultView = session?.role === 'agent' ? 'mine' : 'open';
  const view = query.get('view') ?? defaultView;
  const f = {
    channel: query.get('channel') ?? '',
    priority: query.get('priority') ?? '',
    status: query.get('status') ?? '',
    desk: query.get('desk') ?? (session?.desk !== 'all' && session?.role === 'agent' ? session?.desk ?? '' : ''),
    category: query.get('category') ?? '',
    agent: query.get('agent') ?? '',
    age: query.get('age') ?? '',
    range: query.get('range') ?? '',
    q: query.get('q') ?? '',
  };
  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(query);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'view' && !next.get('view')) next.set('view', view);
    navigate(`/inbox?${next.toString()}`);
  };

  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const agentMap = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const rows = useMemo(() => {
    const t0 = Date.now();
    const q = f.q.toLowerCase();
    return tickets
      .filter((t) => !t.mergedInto)
      .filter((t) => matchView(t, view, session?.agentId, t0))
      .filter((t) => !f.channel || t.channel === f.channel)
      .filter((t) => !f.priority || t.priority === f.priority)
      .filter((t) => !f.status || t.status === f.status)
      .filter((t) => !f.desk || t.desk === f.desk)
      .filter((t) => !f.category || t.category === f.category)
      .filter((t) => !f.agent || t.assigneeId === f.agent)
      .filter((t) => {
        if (!f.age) return true;
        const b = AGEING_BUCKETS.find((x) => x.key === f.age);
        const h = (t0 - t.createdAt) / HOUR;
        return !b || (h >= b.min && h < b.max);
      })
      .filter((t) => !f.range || t.createdAt >= t0 - Number(f.range) * DAY)
      .filter((t) => {
        if (!q) return true;
        const c = custMap.get(t.customerId);
        return `${t.id} ${t.subject} ${c?.name} ${c?.company} ${c?.city} ${t.entities?.orderId ?? ''} ${t.entities?.partNo ?? ''}`.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (view === 'sla_risk' || view === 'open' || view === 'mine') return a.sla.resolutionDueAt - b.sla.resolutionDueAt;
        return b.updatedAt - a.updatedAt;
      });
  }, [tickets, view, f.channel, f.priority, f.status, f.desk, f.category, f.agent, f.age, f.range, f.q, session?.agentId, custMap, minute]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    const t0 = Date.now();
    const base = tickets.filter((t) => !t.mergedInto && (!f.desk || t.desk === f.desk));
    VIEWS.forEach((v) => (out[v.key] = base.filter((t) => matchView(t, v.key, session?.agentId, t0)).length));
    return out;
  }, [tickets, f.desk, session?.agentId, minute]); // eslint-disable-line react-hooks/exhaustive-deps

  // Selection & bulk actions
  const [sel, setSel] = useState<Set<string>>(new Set());
  useEffect(() => setSel(new Set()), [view]);
  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const [mergeOpen, setMergeOpen] = useState(false);
  const selected = rows.filter((r) => sel.has(r.id));

  // Virtualised list
  // The scroll element unmounts when a view is empty, so observe whichever element is current.
  const scroller = useRef<HTMLDivElement | null>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(800);
  const scrollerRef = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    scroller.current = el;
    if (!el) return;
    setHeight(el.clientHeight || 800);
    setScrollTop(el.scrollTop);
    observer.current = new ResizeObserver(() => el.clientHeight > 0 && setHeight(el.clientHeight));
    observer.current.observe(el);
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    setScrollTop(0);
  }, [view, f.q, f.channel, f.priority, f.desk, f.status, f.category, f.agent, f.range, f.age]);
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - 6);
  const end = Math.min(rows.length, Math.ceil((scrollTop + Math.max(height, 400)) / ROW_H) + 6);

  const activeFilters = Object.entries(f).filter(([k, v]) => v && !(k === 'desk' && session?.role === 'agent' && !query.get('desk')));

  const selectCls = 'h-8 rounded-lg border bg-surface px-2 text-[13px] text-ink focus:outline-none focus:border-primary max-w-[150px]';

  return (
    <div className="h-full flex">
      <aside className="w-[214px] shrink-0 border-r bg-surface overflow-y-auto scroll-thin p-2 hidden md:block" aria-label="Saved views">
        <div className="eyebrow px-2 pt-2 pb-1.5">Saved views</div>
        {VIEWS.map((v) => {
          const Icon = v.icon;
          const active = view === v.key;
          return (
            <button
              key={v.key}
              onClick={() => setParam('view', v.key)}
              className={cn('w-full flex items-center gap-2.5 rounded-lg px-2.5 h-9 text-[13.5px] transition-colors', active ? 'bg-primary/10 text-primary font-semibold' : 'text-muted hover:bg-surface2 hover:text-ink')}
            >
              <Icon size={16} />
              <span className="truncate">{v.label}</span>
              <span className={cn('ml-auto num text-[13px] font-semibold', v.key === 'breached' && counts[v.key] > 0 && 'text-critical', v.key === 'sla_risk' && counts[v.key] > 0 && 'text-warning')}>{counts[v.key]}</span>
            </button>
          );
        })}
        <div className="eyebrow px-2 pt-4 pb-1.5">By desk</div>
        {DESK_KEYS.map((d) => (
          <button
            key={d}
            onClick={() => setParam('desk', f.desk === d ? '' : d)}
            className={cn('w-full flex items-center gap-2.5 rounded-lg px-2.5 h-9 text-[13.5px]', f.desk === d ? 'bg-primary/10 text-primary font-semibold' : 'text-muted hover:bg-surface2 hover:text-ink')}
          >
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: DESKS[d].color }} />
            {DESKS[d].label}
            <span className="ml-auto num text-[13px] font-semibold">{tickets.filter((t) => t.desk === d && isOpen(t.status)).length}</span>
          </button>
        ))}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-4 pt-4 pb-3 border-b bg-surface">
          <div className="flex items-center gap-3">
            <h1 className="text-[19px] font-bold tracking-tight">{VIEWS.find((v) => v.key === view)?.label ?? 'Inbox'}</h1>
            <span className="text-[13px] text-subtle num">{rows.length} tickets</span>
            <div className="ml-auto relative w-[280px] max-w-[40%]">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                className="input h-8 pl-8"
                placeholder="Search ID, customer, order, part…"
                defaultValue={f.q}
                onKeyDown={(e) => e.key === 'Enter' && setParam('q', (e.target as HTMLInputElement).value)}
                onBlur={(e) => e.target.value !== f.q && setParam('q', e.target.value)}
                aria-label="Search tickets"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <ListFilter size={15} className="text-subtle" />
            <select className={selectCls} value={f.channel} onChange={(e) => setParam('channel', e.target.value)} aria-label="Channel">
              <option value="">All channels</option>
              {CHANNEL_KEYS.map((c) => (
                <option key={c} value={c}>{CHANNELS[c].label}</option>
              ))}
            </select>
            <select className={selectCls} value={f.priority} onChange={(e) => setParam('priority', e.target.value)} aria-label="Priority">
              <option value="">All priorities</option>
              {PRIORITY_KEYS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select className={selectCls} value={f.status} onChange={(e) => setParam('status', e.target.value)} aria-label="Status">
              <option value="">All statuses</option>
              {STATUS_KEYS.map((s) => (
                <option key={s} value={s}>{STATUSES[s].label}</option>
              ))}
            </select>
            <select className={selectCls} value={f.desk} onChange={(e) => setParam('desk', e.target.value)} aria-label="Desk">
              <option value="">All desks</option>
              {DESK_KEYS.map((d) => (
                <option key={d} value={d}>{DESKS[d].label}</option>
              ))}
            </select>
            <select className={selectCls} value={f.category} onChange={(e) => setParam('category', e.target.value)} aria-label="Category">
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select className={selectCls} value={f.agent} onChange={(e) => setParam('agent', e.target.value)} aria-label="Agent">
              <option value="">All agents</option>
              {agents.filter((a) => a.role === 'agent').map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <select className={selectCls} value={f.range} onChange={(e) => setParam('range', e.target.value)} aria-label="Date range">
              <option value="">Last 30 days</option>
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
            </select>
            {activeFilters.length > 0 && (
              <button className="btn-ghost btn-sm text-primary" onClick={() => navigate(`/inbox?view=${view}`)}>
                <X size={14} /> Clear filters
              </button>
            )}
          </div>
        </div>

        {sel.size > 0 && (
          <div className="flex items-center gap-2 px-4 h-12 bg-primary/[0.07] border-b text-[13px]">
            <span className="font-semibold">{sel.size} selected</span>
            <select
              className={selectCls}
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value) return;
                selected.forEach((t) => store.assign(t.id, e.target.value));
                store.toast({ tone: 'success', title: `${sel.size} tickets assigned`, body: agentMap.get(e.target.value)?.name });
                setSel(new Set());
              }}
              aria-label="Assign selected"
            >
              <option value="">Assign to…</option>
              {agents.filter((a) => a.role === 'agent').map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <select
              className={selectCls}
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value) return;
                selected.forEach((t) => store.setPriority(t.id, e.target.value as Priority));
                store.toast({ tone: 'success', title: `Priority set to ${e.target.value}`, body: `${sel.size} tickets updated, SLAs recalculated` });
                setSel(new Set());
              }}
              aria-label="Change priority of selected"
            >
              <option value="">Change priority…</option>
              {PRIORITY_KEYS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button className="btn-secondary btn-sm" disabled={sel.size < 2} onClick={() => setMergeOpen(true)}>
              <Merge size={14} /> Merge
            </button>
            <button
              className="btn-secondary btn-sm"
              onClick={() => {
                selected.forEach((t) => store.setStatus(t.id, 'closed'));
                store.toast({ tone: 'success', title: `${sel.size} tickets closed` });
                setSel(new Set());
              }}
            >
              <CheckCircle2 size={14} /> Close
            </button>
            <button className="btn-ghost btn-sm ml-auto" onClick={() => setSel(new Set())}>
              Clear selection
            </button>
          </div>
        )}

        <div className="grid grid-cols-[36px_40px_92px_minmax(150px,190px)_minmax(0,1fr)_96px_48px_124px_40px_76px] items-center gap-2 px-4 h-9 border-b bg-surface2 text-[13px] font-semibold text-subtle uppercase tracking-wide">
          <input
            type="checkbox"
            aria-label="Select all visible"
            className="h-4 w-4 accent-[#0E7C86]"
            checked={rows.length > 0 && sel.size === rows.length}
            onChange={(e) => setSel(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
          />
          <span />
          <span>Ticket</span>
          <span>Customer</span>
          <span>Subject</span>
          <span>Desk</span>
          <span>Pri</span>
          <span>SLA</span>
          <span />
          <span className="text-right">Updated</span>
        </div>

        {!ready ? (
          <div className="p-4 flex flex-col gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-[46px]" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<InboxIcon size={22} />}
            title="No tickets match this view"
            body="Every request is captured automatically. Try clearing filters or choosing another saved view."
            action={<button className="btn-secondary" onClick={() => navigate('/inbox?view=open')}>Show all open tickets</button>}
          />
        ) : (
          <div ref={scrollerRef} className="flex-1 overflow-y-auto scroll-thin bg-surface" onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}>
            <div style={{ height: rows.length * ROW_H, position: 'relative' }}>
              {rows.slice(start, end).map((t, i) => {
                const c = custMap.get(t.customerId);
                const a = t.assigneeId ? agentMap.get(t.assigneeId) : undefined;
                const idx = start + i;
                return (
                  <div
                    key={t.id}
                    data-row
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/ticket/${t.id}`)}
                    onClick={() => navigate(`/ticket/${t.id}`)}
                    className={cn(
                      'absolute left-0 right-0 grid grid-cols-[36px_40px_92px_minmax(150px,190px)_minmax(0,1fr)_96px_48px_124px_40px_76px] items-center gap-2 px-4 border-b cursor-pointer hover:bg-surface2 focus:bg-primary/[0.05]',
                      sel.has(t.id) && 'bg-primary/[0.06]',
                      t.status === 'new' && 'font-medium',
                    )}
                    style={{ top: idx * ROW_H, height: ROW_H }}
                  >
                    <input type="checkbox" aria-label={`Select ${t.id}`} className="h-4 w-4 accent-[#0E7C86]" checked={sel.has(t.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggle(t.id)} />
                    <ChannelIcon c={t.channel} size={30} />
                    <span className="mono text-[13px] font-semibold flex items-center gap-1">
                      {t.status === 'new' && <span className="h-1.5 w-1.5 rounded-full bg-info shrink-0" />}
                      {t.id}
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className="block text-[13.5px] truncate">{c?.name}</span>
                      <span className="block text-[13px] text-subtle truncate font-normal">{c?.company} · {c?.city}</span>
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className="block text-[13.5px] truncate">{t.subject}</span>
                      <span className="flex items-center gap-1.5 mt-0.5 overflow-hidden">
                        <span className="text-[13px] text-subtle truncate font-normal">{t.category}</span>
                        {t.transfer && <Chip tone="violet"><ArrowRightLeft size={11} /> Transferred</Chip>}
                        {t.breachRisk && isOpen(t.status) && <Chip tone="warning">Likely to breach in 2 h</Chip>}
                        {t.escalationLevel >= 2 && isOpen(t.status) && <Chip tone="critical">L{t.escalationLevel}</Chip>}
                        {t.aiResolved && <Chip tone="primary"><Bot size={11} /> AI</Chip>}
                        {t.autoCreated && now - t.createdAt < 10 * 60_000 && <Chip tone="info">Just in</Chip>}
                      </span>
                    </span>
                    <DeskBadge d={t.desk} />
                    <PriorityChip p={t.priority} />
                    <SlaBar t={t} />
                    {a ? <Avatar agent={a} size={26} /> : <span className="h-[26px] w-[26px] rounded-full border border-dashed border-subtle/50" title="Unassigned" />}
                    <span className="text-right text-[13px] text-subtle num font-normal">{timeAgo(t.updatedAt, now)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        title={`Merge ${selected.length} tickets`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setMergeOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              onClick={() => {
                const [target, ...rest] = [...selected].sort((a, b) => a.createdAt - b.createdAt);
                rest.forEach((r) => store.merge(r.id, target.id));
                store.toast({ tone: 'success', title: `Merged into ${target.id}`, body: `${rest.length} duplicate ticket${rest.length > 1 ? 's' : ''} closed, conversations kept` });
                setMergeOpen(false);
                setSel(new Set());
              }}
            >
              <Merge size={15} /> Merge into oldest
            </button>
          </>
        }
      >
        <p className="text-[13.5px] text-muted mb-3">Conversations are combined into the oldest ticket. Duplicates are closed and linked so reports do not double count.</p>
        <div className="flex flex-col gap-2">
          {[...selected].sort((a, b) => a.createdAt - b.createdAt).map((t, i) => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <span className="mono text-[13px] font-semibold">{t.id}</span>
              <span className="text-[13px] truncate">{t.subject}</span>
              {i === 0 && <Chip tone="primary" className="ml-auto">Keep</Chip>}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
