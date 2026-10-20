import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRightLeft, TrendingUp, Merge, CheckCircle2, Zap, Info, Link2, Star, Ticket as TicketIcon, PanelLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { useNow } from '../../store/clock';
import { navigate } from '../../store/router';
import { Avatar, ChannelIcon, Chip, EmptyState, Modal, PriorityChip, SlaRing, Skeleton, useFakeLoad } from '../../components/ui';
import { DESK_KEYS, DESKS, PRIORITY_KEYS, STATUSES, STATUS_KEYS, ink, isOpen } from '../../lib/meta';
import { cn, duration } from '../../lib/format';
import { agentShort } from '../../data/seed';
import { Customer360 } from './Customer360';
import { Timeline } from './Timeline';
import { Copilot, liveCopilotState } from './Copilot';
import { Composer } from './Composer';
import { LiveCallPanel } from './LiveCall';
import type { Desk, Priority, Status, Ticket } from '../../types';

function TransferModal({ ticket, open, onClose }: { ticket: Ticket; open: boolean; onClose: () => void }) {
  const store = useStore();
  const [desk, setDesk] = useState<Desk>(ticket.desk === 'helpline' ? 'edukaan' : 'helpline');
  const agents = store.agents.filter((a) => a.role === 'agent' && a.desk === desk);
  const [agentId, setAgentId] = useState<string>('');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!open) return;
    const d: Desk = ticket.desk === 'helpline' ? 'edukaan' : 'helpline';
    setDesk(d);
    setNote(`${ticket.category}: customer has shared all details in the timeline. Please own the follow-up.`);
  }, [open, ticket.desk, ticket.category]);
  useEffect(() => {
    setAgentId(store.agents.find((a) => a.role === 'agent' && a.desk === desk && a.status === 'available')?.id ?? agents[0]?.id ?? '');
  }, [desk]); // eslint-disable-line react-hooks/exhaustive-deps
  const load = (id: string) => store.tickets.filter((t) => t.assigneeId === id && isOpen(t.status)).length;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Transfer ${ticket.id}`}
      width={560}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={() => {
              store.transfer(ticket.id, desk, agentId || undefined, note);
              store.toast({ tone: 'success', title: `Ticket ${ticket.id} transferred to ${DESKS[desk].label}`, body: 'Full history kept, customer will not repeat the issue' });
              onClose();
            }}
          >
            <ArrowRightLeft size={15} /> Transfer with context
          </button>
        </>
      }
    >
      <div className="label mb-2">Desk</div>
      <div className="grid grid-cols-3 gap-2">
        {DESK_KEYS.map((d) => (
          <button
            key={d}
            disabled={d === ticket.desk}
            onClick={() => setDesk(d)}
            className={cn('rounded-lg border px-3 py-2.5 text-left disabled:opacity-40', desk === d ? 'border-primary bg-primary/[0.06] ring-2 ring-primary/15' : 'hover:bg-surface2')}
          >
            <span className="flex items-center gap-1.5 text-[13.5px] font-semibold"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: DESKS[d].color }} />{DESKS[d].label}</span>
            <span className="text-[13px] text-subtle">{d === ticket.desk ? 'Current desk' : `${store.tickets.filter((t) => t.desk === d && isOpen(t.status)).length} open`}</span>
          </button>
        ))}
      </div>
      <div className="label mt-4 mb-2">Agent</div>
      <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto scroll-thin">
        {agents.map((a) => (
          <button key={a.id} onClick={() => setAgentId(a.id)} className={cn('flex items-center gap-2.5 rounded-lg border px-3 h-11', agentId === a.id ? 'border-primary bg-primary/[0.05]' : 'hover:bg-surface2')}>
            <Avatar agent={a} size={26} />
            <span className="text-[13.5px] font-medium">{a.name}</span>
            <span className="text-[13px] text-subtle">{a.skills.slice(0, 2).join(', ')}</span>
            <span className="ml-auto text-[13px] text-muted num">{load(a.id)} open</span>
          </button>
        ))}
      </div>
      <div className="label mt-4 mb-2">Handover note</div>
      <textarea className="input h-auto py-2" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-info/[0.07] p-2.5 text-[13px] text-info">
        <Info size={15} className="shrink-0 mt-0.5" /> The receiving agent sees the full timeline, calls, transcripts and copilot context.
      </div>
    </Modal>
  );
}

function CloseModal({ ticket, open, onClose }: { ticket: Ticket; open: boolean; onClose: () => void }) {
  const store = useStore();
  const [code, setCode] = useState('Resolved: information shared');
  const [survey, setSurvey] = useState(true);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Close ${ticket.id}`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={() => {
              store.setStatus(ticket.id, 'closed');
              store.updateTicket(ticket.id, { fcr: ticket.interactions.filter((i) => i.direction === 'out').length <= 2 });
              store.addInteraction(ticket.id, { type: 'event', at: Date.now(), eventKind: 'status', body: `Resolution code: ${code}` });
              store.toast({ tone: 'success', title: `${ticket.id} closed`, body: survey ? 'CSAT survey sent on WhatsApp' : undefined });
              onClose();
              if (survey) {
                const id = ticket.id;
                store.addInteraction(id, { type: 'whatsapp', at: Date.now() + 1, direction: 'out', author: 'BizSensAi', body: 'How did we do? Rate your experience from 1 to 5 ⭐' });
                setTimeout(() => {
                  const s = useStore.getState();
                  s.addInteraction(id, { type: 'whatsapp', at: Date.now(), direction: 'in', author: s.customers.find((c) => c.id === ticket.customerId)?.name, body: '⭐⭐⭐⭐⭐ 5' });
                  s.addInteraction(id, { type: 'event', at: Date.now() + 1, eventKind: 'csat', body: 'CSAT survey on WhatsApp: 5/5 · fed into dashboard', chip: 'CSAT 5' });
                  s.updateTicket(id, { csat: 5 });
                  s.toast({ tone: 'success', title: 'Customer rated 5 / 5', body: `${id} · CSAT dashboard updated` });
                }, 3500);
              }
            }}
          >
            <CheckCircle2 size={15} /> Close ticket
          </button>
        </>
      }
    >
      <div className="label mb-2">Resolution code</div>
      <select className="input" value={code} onChange={(e) => setCode(e.target.value)}>
        {['Resolved: information shared', 'Resolved: replacement dispatched', 'Resolved: refund initiated', 'Resolved: points credited', 'Resolved: escalated team fixed'].map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <label className="mt-4 flex items-center gap-2.5 text-[13.5px]">
        <input type="checkbox" checked={survey} onChange={(e) => setSurvey(e.target.checked)} className="h-4 w-4 accent-[#0E7C86]" />
        Send CSAT survey on WhatsApp (1–5 stars)
      </label>
    </Modal>
  );
}

function MergeModal({ ticket, open, onClose }: { ticket: Ticket; open: boolean; onClose: () => void }) {
  const store = useStore();
  const candidates = store.tickets.filter((t) => t.id !== ticket.id && t.customerId === ticket.customerId && isOpen(t.status) && !t.mergedInto);
  return (
    <Modal open={open} onClose={onClose} title={`Merge ${ticket.id}`}>
      {candidates.length === 0 ? (
        <EmptyState icon={<Merge size={20} />} title="No other open tickets from this customer" body="Duplicate prevention already links follow-ups automatically." />
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[13.5px] text-muted mb-1">Pick the ticket to merge into this one. Its conversation moves here and it is closed as a duplicate.</p>
          {candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                store.merge(c.id, ticket.id);
                store.toast({ tone: 'success', title: `${c.id} merged into ${ticket.id}` });
                onClose();
              }}
              className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left hover:border-primary/50"
            >
              <ChannelIcon c={c.channel} size={26} />
              <span className="mono text-[13px] font-semibold">{c.id}</span>
              <span className="text-[13px] truncate flex-1">{c.subject}</span>
              <Merge size={15} className="text-primary" />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

export function TicketWorkspace({ id }: { id?: string }) {
  const ticket = useStore((s) => s.tickets.find((t) => t.id === id));
  const customer = useStore((s) => s.customers.find((c) => c.id === ticket?.customerId));
  const agents = useStore((s) => s.agents);
  const allTickets = useStore((s) => s.tickets);
  const activeCall = useStore((s) => s.activeCall);
  const store = useStore();
  const now = useNow();
  const ready = useFakeLoad(260);
  const [draft, setDraft] = useState('');
  const [modal, setModal] = useState<null | 'transfer' | 'close' | 'merge'>(null);
  const [showLeft, setShowLeft] = useState(true);

  useEffect(() => {
    if (id) store.setLastTicket(id);
    setDraft('');
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const liveCall = activeCall && activeCall.ticketId === id && (activeCall.phase === 'live' || activeCall.phase === 'summarising') ? activeCall : null;
  const live = liveCall ? liveCopilotState(liveCall.scriptKey, liveCall.lineIndex) : null;
  if (live && liveCall?.phase === 'summarising') live.listening = false;

  const mergeSuggestion = useMemo(
    () => (ticket ? allTickets.find((t) => t.id !== ticket.id && t.customerId === ticket.customerId && t.category === ticket.category && isOpen(t.status) && isOpen(ticket.status) && !t.mergedInto) : undefined),
    [allTickets, ticket],
  );

  if (!ticket || !customer) {
    return (
      <EmptyState icon={<TicketIcon size={22} />} title={`Ticket ${id ?? ''} not found`} body="It may have been merged, or the demo data was reset." action={<button className="btn-secondary" onClick={() => navigate('/inbox')}>Back to inbox</button>} />
    );
  }

  const assignee = agents.find((a) => a.id === ticket.assigneeId);
  const autoAge = (now - ticket.createdAt) / 1000;
  const closed = !isOpen(ticket.status);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-surface px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <button className="btn-ghost btn-sm" onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/inbox'))} aria-label="Back">
            <ArrowLeft size={16} />
          </button>
          <button className="btn-ghost btn-sm hidden xl:inline-flex 2xl:hidden" onClick={() => setShowLeft((v) => !v)} aria-label="Toggle customer panel">
            <PanelLeft size={16} />
          </button>
          <ChannelIcon c={ticket.channel} size={34} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="mono font-bold text-[14px]">{ticket.id}</span>
              {ticket.autoCreated && autoAge < 3600 && (
                <Chip tone="info"><Zap size={11} /> Auto-created {duration(autoAge)} ago</Chip>
              )}
              {ticket.linkedIds.length > 0 && <Chip><Link2 size={11} /> Linked {ticket.linkedIds.join(', ')}</Chip>}
              {ticket.escalationLevel >= 2 && !closed && <Chip tone="critical"><TrendingUp size={11} /> Escalation L{ticket.escalationLevel}</Chip>}
              {ticket.csat && <Chip tone="warning"><Star size={11} /> CSAT {ticket.csat}</Chip>}
              {ticket.mergedInto && <Chip tone="violet">Merged into {ticket.mergedInto}</Chip>}
            </div>
            <h1 className="text-[16px] font-bold tracking-tight truncate">{ticket.subject}</h1>
          </div>
          <div className="hidden lg:flex items-center gap-4 pl-2">
            <SlaRing label="Response" start={ticket.sla.startAt} due={ticket.sla.responseDueAt} done={!!ticket.sla.respondedAt} paused={ticket.sla.pausedAt} size={46} />
            <SlaRing label="Resolution" start={ticket.sla.startAt + ticket.sla.pausedMs} due={ticket.sla.resolutionDueAt} done={closed && (ticket.resolvedAt ?? 0) <= ticket.sla.resolutionDueAt} paused={ticket.sla.pausedAt} size={46} />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          <select
            className="h-8 rounded-lg border bg-surface px-2 text-[13px] font-medium"
            value={ticket.status}
            onChange={(e) => {
              store.setStatus(ticket.id, e.target.value as Status);
              store.toast({ tone: 'success', title: `Status: ${STATUSES[e.target.value as Status].label}`, body: e.target.value === 'awaiting' ? 'SLA paused until the customer replies' : ticket.id });
            }}
            aria-label="Status"
            style={{ color: ink(STATUSES[ticket.status].color) }}
          >
            {STATUS_KEYS.map((s) => (
              <option key={s} value={s}>{STATUSES[s].label}</option>
            ))}
          </select>
          <select
            className="h-8 rounded-lg border bg-surface px-2 text-[13px] font-semibold mono"
            value={ticket.priority}
            onChange={(e) => {
              store.setPriority(ticket.id, e.target.value as Priority);
              store.toast({ tone: 'success', title: `Priority ${e.target.value}`, body: 'SLA timers recalculated' });
            }}
            aria-label="Priority"
          >
            {PRIORITY_KEYS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <span className="h-8 inline-flex items-center gap-1.5 rounded-lg border px-2.5 text-[13px]">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: DESKS[ticket.desk].color }} />
            {DESKS[ticket.desk].label}
          </span>
          <span className="h-8 inline-flex items-center gap-1.5 rounded-lg border pl-1.5 pr-1 text-[13px]">
            {assignee ? <Avatar agent={assignee} size={22} /> : <span className="h-[22px] w-[22px] rounded-full border border-dashed" />}
            <select
              className="bg-transparent text-[13px] pr-1 outline-none"
              value={ticket.assigneeId ?? ''}
              onChange={(e) => {
                store.assign(ticket.id, e.target.value || undefined);
                store.toast({ tone: 'success', title: e.target.value ? `Assigned to ${agentShort(agents.find((a) => a.id === e.target.value)!.name)}` : 'Unassigned' });
              }}
              aria-label="Assignee"
            >
              <option value="">Unassigned</option>
              {agents.filter((a) => a.role === 'agent').map((a) => (
                <option key={a.id} value={a.id}>{a.name} · {DESKS[a.desk as Desk]?.short}</option>
              ))}
            </select>
          </span>
          <PriorityChip p={ticket.priority} size="md" />
          <span className="text-[13px] text-subtle hidden 2xl:inline">{ticket.category} · {ticket.intent}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <button className="btn-secondary btn-sm" onClick={() => setModal('transfer')} disabled={closed}>
              <ArrowRightLeft size={14} /> Transfer
            </button>
            <button
              className="btn-secondary btn-sm"
              disabled={closed || ticket.escalationLevel >= 4}
              onClick={() => {
                store.escalate(ticket.id, 'raised manually by agent');
                store.toast({ tone: 'warning', title: `${ticket.id} escalated`, body: ['Owner', 'Supervisor Anita R.', 'Manager Sanjay K.', 'Function head Meera K.'][Math.min(3, ticket.escalationLevel)] + ' notified' });
              }}
            >
              <TrendingUp size={14} /> Escalate
            </button>
            <button className="btn-secondary btn-sm" onClick={() => setModal('merge')} disabled={closed}>
              <Merge size={14} /> Merge
            </button>
            <button className="btn-primary btn-sm" onClick={() => setModal('close')} disabled={closed}>
              <CheckCircle2 size={14} /> Close
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      {!ready ? (
        <div className="flex-1 grid grid-cols-[272px_1fr_340px] gap-3 p-3">
          <Skeleton className="h-full rounded-xl" />
          <Skeleton className="h-full rounded-xl" />
          <Skeleton className="h-full rounded-xl" />
        </div>
      ) : (
        <div className={cn('flex-1 min-h-0 grid grid-rows-[minmax(0,1fr)]', showLeft ? 'xl:grid-cols-[272px_minmax(0,1fr)_340px]' : 'xl:grid-cols-[minmax(0,1fr)_340px]', 'lg:grid-cols-[minmax(0,1fr)_320px] grid-cols-1')}>
          <aside className={cn('min-h-0 border-r overflow-y-auto scroll-thin bg-canvas', showLeft ? 'hidden xl:block' : 'hidden')} aria-label="Customer 360">
            <Customer360 customer={customer} ticket={ticket} />
          </aside>

          <section className="min-w-0 min-h-0 flex flex-col bg-canvas" aria-label="Conversation">
            {ticket.transfer && (
              <motion.div key={ticket.transfer.at} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mx-4 mt-3 rounded-xl border border-violet-400/40 bg-violet-500/[0.07] px-3 py-2.5 flex gap-3 shrink-0">
                <ArrowRightLeft size={17} className="text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                <div className="text-[13.5px] min-w-0">
                  <div className="font-semibold">
                    Transferred from {DESKS[ticket.transfer.fromDesk].label} by {ticket.transfer.by.replace(/\.$/, '')}. Customer does not need to repeat the issue.
                  </div>
                  {ticket.transfer.note && <div className="text-muted mt-0.5 truncate">“{ticket.transfer.note}”</div>}
                </div>
              </motion.div>
            )}
            <div data-scroll-pane className="flex-1 min-h-0 overflow-y-auto scroll-thin px-4 py-3 flex flex-col gap-3">
              {mergeSuggestion && !liveCall && (
                <div className="rounded-xl border border-info/30 bg-info/[0.06] p-3 flex items-center gap-3">
                  <Merge size={17} className="text-info shrink-0" />
                  <div className="text-[13.5px] flex-1 min-w-0">
                    <span className="font-semibold">Possible duplicate:</span> <span className="mono">{mergeSuggestion.id}</span> from the same customer, same category.
                    <span className="text-muted block truncate">{mergeSuggestion.subject}</span>
                  </div>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      const [keep, drop] = mergeSuggestion.createdAt < ticket.createdAt ? [mergeSuggestion, ticket] : [ticket, mergeSuggestion];
                      store.merge(drop.id, keep.id);
                      store.toast({ tone: 'success', title: `${drop.id} merged into ${keep.id}` });
                      if (drop.id === ticket.id) navigate(`/ticket/${keep.id}`);
                    }}
                  >
                    Merge
                  </button>
                </div>
              )}
              {liveCall && <LiveCallPanel call={liveCall} onTransfer={() => setModal('transfer')} />}
              <Timeline key={ticket.id} items={ticket.interactions} />
            </div>
            <div className="px-4 pb-3 pt-1 shrink-0">
              {closed ? (
                <div className="card p-3 flex items-center gap-2 text-[13.5px]">
                  <CheckCircle2 size={16} className="text-success" /> This ticket is {ticket.status}. Replying reopens it.
                  <button className="btn-secondary btn-sm ml-auto" onClick={() => store.setStatus(ticket.id, 'open')}>Reopen</button>
                </div>
              ) : (
                <Composer ticket={ticket} customer={customer} draft={draft} setDraft={setDraft} />
              )}
            </div>
          </section>

          <aside className="hidden lg:block min-h-0 border-l overflow-y-auto scroll-thin bg-canvas" aria-label="AI Copilot">
            <Copilot ticket={ticket} customer={customer} live={live} onUseReply={(t) => { setDraft(t); store.toast({ tone: 'info', title: 'Reply added to composer', body: 'Review and send' }); }} />
          </aside>
        </div>
      )}

      <TransferModal ticket={ticket} open={modal === 'transfer'} onClose={() => setModal(null)} />
      <CloseModal ticket={ticket} open={modal === 'close'} onClose={() => setModal(null)} />
      <MergeModal ticket={ticket} open={modal === 'merge'} onClose={() => setModal(null)} />
    </div>
  );
}
