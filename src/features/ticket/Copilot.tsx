import { useMemo, useState, useEffect } from 'react';
import { Sparkles, Check, Wand2, ArrowDownToLine, Loader2, BookOpen, History, Zap, AlertTriangle, ChevronDown, Ear, Database, Send, CreditCard, KeyRound, Boxes, GitCompare, ShieldCheck, Truck, FileText } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { navigate } from '../../store/router';
import { CALL_SCRIPTS, type CopilotUpdate } from '../../data/scripts';
import { copilotFor, ACTION_LABELS, type ActionId } from '../../lib/copilot';
import { runAction } from '../../services/lookups';
import { aiComplete, aiAvailable } from '../../services/ai';
import { Chip, PriorityChip, Tabs } from '../../components/ui';
import { cn } from '../../lib/format';
import type { Customer, Ticket } from '../../types';

const ACTION_ICONS: Record<ActionId, typeof Zap> = {
  sap_dispatch: Database,
  resend_invoice: FileText,
  credit_points: CreditCard,
  escalate_warehouse: Truck,
  check_payment: CreditCard,
  reset_portal: KeyRound,
  check_stock: Boxes,
  supersession: GitCompare,
  warranty_status: ShieldCheck,
  send_tracking: Send,
  schedule_pickup: Truck,
};

export interface LiveCopilot extends CopilotUpdate {
  hints: string[];
  listening: boolean;
}

export function liveCopilotState(scriptKey: string, lineIndex: number): LiveCopilot {
  const script = CALL_SCRIPTS[scriptKey];
  const out: LiveCopilot = { hints: [], listening: true };
  script.lines.slice(0, lineIndex).forEach((l) => {
    if (!l.copilot) return;
    const { hint, entities, ...rest } = l.copilot;
    Object.assign(out, rest);
    if (entities) out.entities = { ...out.entities, ...entities };
    if (hint) out.hints.push(hint);
  });
  return out;
}

function Section({ title, icon, children, right }: { title: string; icon: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="card p-3.5">
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-primary">{icon}</span>
        <h3 className="text-[13.5px] font-semibold">{title}</h3>
        <div className="ml-auto">{right}</div>
      </div>
      {children}
    </section>
  );
}

export function Copilot({ ticket, customer, onUseReply, live }: { ticket: Ticket; customer?: Customer; onUseReply: (text: string) => void; live?: LiveCopilot | null }) {
  const store = useStore();
  const orders = useStore((s) => s.orders);
  // During a live call, suggestions follow what the AI has heard so far.
  const liveCategory = live?.category;
  const view = useMemo(
    () =>
      copilotFor(
        liveCategory ? { ...ticket, category: liveCategory, intent: live?.intent ?? ticket.intent, entities: { ...ticket.entities, ...live?.entities }, sentiment: live?.sentiment ?? ticket.sentiment } : ticket,
        customer,
        orders,
      ),
    [ticket, customer, orders, liveCategory, live?.intent, live?.entities, live?.sentiment],
  );
  const [tone, setTone] = useState<'formal' | 'friendly' | 'hindi'>('formal');
  const [draft, setDraft] = useState(view.replies.formal);
  const [busy, setBusy] = useState<string | null>(null);
  const [regen, setRegen] = useState(false);
  const [liveAi, setLiveAi] = useState(false);
  const [openSimilar, setOpenSimilar] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    setDraft(view.replies[tone]);
  }, [tone, view]);
  useEffect(() => {
    setAccepted(false);
    setTone('formal');
  }, [ticket.id]);
  useEffect(() => {
    aiAvailable().then(setLiveAi);
  }, []);

  const classifying = ticket.intent === 'Detecting…';
  const intent = live?.intent ?? (classifying ? undefined : view.intent);
  const confidence = live?.confidence ?? (classifying ? 0 : view.confidence);
  const category = live?.category ?? (classifying ? undefined : view.category);
  const suggested = live?.priority ?? view.priority;
  const showSuggestions = !live || (live.confidence ?? 0) >= 0.8;

  const similar = useMemo(
    () =>
      store.tickets
        .filter((t) => t.id !== ticket.id && (t.status === 'closed' || t.status === 'resolved') && t.category === (category ?? ticket.category))
        .sort((a, b) => (b.csat ?? 0) - (a.csat ?? 0) || b.createdAt - a.createdAt)
        .slice(0, 3),
    [store.tickets, ticket.id, category, ticket.category],
  );
  const articles = useMemo(() => store.kb.filter((k) => !k.draft && k.category === (category ?? ticket.category)).slice(0, 3), [store.kb, category, ticket.category]);

  const doAction = async (a: ActionId) => {
    setBusy(a);
    try {
      const res = await runAction(a, ticket.id);
      store.toast({ tone: res.tone === 'warning' ? 'warning' : 'success', title: res.title, body: `${res.source} · added to timeline` });
    } finally {
      setBusy(null);
    }
  };

  const regenerate = async () => {
    setRegen(true);
    const last = ticket.interactions.filter((i) => i.direction === 'in').slice(-2).map((i) => i.body ?? i.call?.summary ?? '').join('\n');
    const toneText = tone === 'hindi' ? 'in simple Hindi (Devanagari)' : tone === 'friendly' ? 'in a warm, friendly tone' : 'in a formal, courteous tone';
    const res = await aiComplete(
      `Write a short customer support reply ${toneText} for an automotive spare-parts business. Customer: ${customer?.name} (${customer?.company}, ${customer?.city}). Ticket subject: ${ticket.subject}. Category: ${ticket.category}. Latest customer message: ${last}. Keep it under 90 words. Sign off as "Parts Support". Do not invent order numbers that are not given.`,
      view.replies[tone],
      'You are an AI copilot drafting replies for support agents. Reply with the message text only.',
    );
    setDraft(res.text);
    setRegen(false);
    store.toast({ tone: 'info', title: res.live ? 'Reply regenerated with Claude' : 'Reply regenerated', body: res.live ? undefined : 'Using on-device template (offline mode)' });
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-2 px-1">
        <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-[#4F46E5] text-white flex items-center justify-center"><Sparkles size={15} /></span>
        <div className="leading-tight">
          <div className="text-[14px] font-bold">AI Copilot</div>
          <div className="text-[13px] text-subtle">{liveAi ? 'Claude · live' : 'On-device models · offline-ready'}</div>
        </div>
        {live?.listening && (
          <Chip tone="critical" className="ml-auto"><Ear size={12} /> Listening</Chip>
        )}
      </div>

      <Section title="Understanding" icon={<Wand2 size={14} />}>
        {intent ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] text-subtle">Intent</span>
              <span className="text-[13.5px] font-semibold text-right">{intent}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-hairline overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${Math.round(confidence * 100)}%` }} />
              </div>
              <span className="mono text-[13px] text-muted">{Math.round(confidence * 100)}%</span>
            </div>
            <div className="flex items-center justify-between gap-2 mt-2">
              <span className="text-[13px] text-subtle">Category</span>
              <span className="text-[13px] font-medium">{category ?? '…'}</span>
            </div>
            {live?.entities && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(live.entities).map(([k, v]) => (
                  <Chip key={k} tone="info"><span className="text-subtle">{k === 'orderId' ? 'Order' : k === 'partNo' ? 'Part' : 'Invoice'}</span> <span className="mono">{v}</span></Chip>
                ))}
              </div>
            )}
            {live?.sentiment && (
              <div className="flex items-center justify-between gap-2 mt-2">
                <span className="text-[13px] text-subtle">Sentiment</span>
                <Chip tone={live.sentiment === 'negative' ? 'critical' : live.sentiment === 'positive' ? 'success' : 'neutral'}>{live.sentiment}</Chip>
              </div>
            )}
            <div className="mt-3 rounded-lg bg-surface2 p-2.5 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-subtle">Suggested priority</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <PriorityChip p={suggested} size="md" />
                </div>
                <div className="text-[13px] text-muted mt-1 leading-snug">{live?.priority ? live.hints.find((h) => /off road|P\d/.test(h))?.replace(/: suggest P\d/, '') ?? view.priorityReason : view.priorityReason}</div>
              </div>
              {ticket.priority === suggested || accepted ? (
                <Chip tone="success"><Check size={12} /> Applied</Chip>
              ) : (
                <button
                  className="btn-primary btn-sm"
                  onClick={() => {
                    store.setPriority(ticket.id, suggested);
                    setAccepted(true);
                    store.toast({ tone: 'success', title: `Priority set to ${suggested}`, body: 'SLA timers recalculated' });
                  }}
                >
                  Accept
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-[13px] text-muted py-2">
            <Loader2 size={15} className="animate-spin text-primary" /> Listening to the customer…
          </div>
        )}
      </Section>

      {live && live.hints.length > 0 && (
        <Section title="Live signals" icon={<Zap size={14} />}>
          <ul className="flex flex-col gap-1.5">
            {live.hints.map((h, i) => (
              <li key={i} className="text-[13px] flex gap-2 items-start">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                {h}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {ticket.breachRisk && !live && (
        <div className="rounded-xl border border-warning/40 bg-warning/[0.07] p-3 flex gap-2">
          <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
          <div>
            <div className="text-[13px] font-semibold text-warning">Likely to breach in 2 h</div>
            <div className="text-[13px] text-muted">{ticket.breachRisk}</div>
          </div>
        </div>
      )}

      {showSuggestions && (
        <>
          <Section title="Next best actions" icon={<Zap size={14} />}>
            <div className="flex flex-col gap-1.5">
              {view.actions.map((a) => {
                const Icon = ACTION_ICONS[a];
                return (
                  <button key={a} disabled={!!busy} onClick={() => doAction(a)} className="flex items-center gap-2.5 rounded-lg border px-3 h-10 text-[13px] font-medium text-left hover:border-primary/50 hover:bg-primary/[0.04] disabled:opacity-60 transition-colors">
                    {busy === a ? <Loader2 size={15} className="animate-spin text-primary" /> : <Icon size={15} className="text-primary" />}
                    {ACTION_LABELS[a]}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section
            title="Suggested reply"
            icon={<Sparkles size={14} />}
            right={
              <button className="text-[13px] text-primary font-semibold flex items-center gap-1 disabled:opacity-50" onClick={regenerate} disabled={regen}>
                {regen ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} Regenerate
              </button>
            }
          >
            <Tabs
              value={tone}
              onChange={setTone}
              items={[
                { value: 'formal', label: 'Formal' },
                { value: 'friendly', label: 'Friendly' },
                { value: 'hindi', label: 'हिंदी' },
              ]}
            />
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} className={cn('input h-auto py-2 mt-2 leading-relaxed resize-y', regen && 'opacity-50')} aria-label="Suggested reply" />
            <button className="btn-secondary w-full mt-2" onClick={() => onUseReply(draft)}>
              <ArrowDownToLine size={15} /> Use in composer
            </button>
          </Section>

          <Section title="Similar resolved tickets" icon={<History size={14} />}>
            <div className="flex flex-col gap-1.5">
              {similar.map((s) => (
                <div key={s.id} className="rounded-lg border">
                  <button onClick={() => setOpenSimilar(openSimilar === s.id ? null : s.id)} className="w-full text-left px-3 py-2 flex items-start gap-2" aria-expanded={openSimilar === s.id}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="mono text-[13px] font-semibold">{s.id}</span>
                        {s.csat && <span className="text-[13px] text-warning">★ {s.csat}</span>}
                        {s.aiResolved && <Chip tone="primary" className="h-5">AI</Chip>}
                      </div>
                      <div className="text-[13px] truncate">{s.subject}</div>
                    </div>
                    <ChevronDown size={14} className={cn('mt-1 text-subtle transition-transform', openSimilar === s.id && 'rotate-180')} />
                  </button>
                  {openSimilar === s.id && (
                    <div className="px-3 pb-3">
                      <div className="text-[13px] text-subtle mb-1">Resolution steps</div>
                      <ol className="list-decimal pl-4 text-[13px] flex flex-col gap-0.5">
                        {(articles[0]?.steps ?? ['Verified details', 'Resolved with the owning team', 'Confirmed with customer']).map((st) => (
                          <li key={st}>{st}</li>
                        ))}
                      </ol>
                      <button className="text-[13px] text-primary font-semibold mt-1.5" onClick={() => navigate(`/ticket/${s.id}`)}>Open ticket →</button>
                    </div>
                  )}
                </div>
              ))}
              {similar.length === 0 && <div className="text-[13px] text-muted">No similar tickets yet.</div>}
            </div>
          </Section>

          <Section title="Knowledge base" icon={<BookOpen size={14} />}>
            <div className="flex flex-col gap-1.5">
              {articles.map((a) => (
                <button key={a.id} onClick={() => navigate(`/kb?article=${a.id}`)} className="text-left rounded-lg px-2.5 py-2 hover:bg-surface2 border">
                  <div className="text-[13px] font-medium leading-snug">{a.title}</div>
                  <div className="text-[13px] text-subtle mt-0.5">{a.id} · {a.helpful}% found helpful</div>
                </button>
              ))}
              {articles.length === 0 && <div className="text-[13px] text-muted">No articles in this category.</div>}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
