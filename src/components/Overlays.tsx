import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Command } from 'cmdk';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Phone,
  PhoneOff,
  X,
  Clapperboard,
  MessageCircle,
  Mail,
  Bot,
  Timer,
  ArrowRightLeft,
  LayoutDashboard,
  RotateCcw,
  Search,
  Ticket as TicketIcon,
  User,
  Zap,
  Moon,
  Tv,
  BellRing,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { navigate, useRoute } from '../store/router';
import { useNow } from '../store/clock';
import { CALL_SCRIPTS } from '../data/scripts';
import { cn, duration } from '../lib/format';
import { isOpen } from '../lib/meta';
import { escalationLevelFor, slaConsumed } from '../lib/sla';
import { Avatar, ChannelIcon, PriorityChip } from './ui';
import {
  acceptCall,
  declineCall,
  jumpToCommand,
  playJourney,
  resetDemo,
  runSlaEscalation,
  runTransfer,
  scenarioTargetId,
  startIncomingCall,
} from '../services/scenarios';

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  const icons = { success: CheckCircle2, warning: AlertTriangle, critical: XCircle, info: Info };
  const colors = { success: '#16A34A', warning: '#D97706', critical: '#DC2626', info: '#2563EB' };
  return (
    <div className="fixed bottom-10 right-4 z-[60] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-32px)]" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.18 }}
              className="card shadow-pop flex gap-3 p-3 pr-2"
            >
              <Icon size={18} style={{ color: colors[t.tone] }} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold">{t.title}</div>
                {t.body && <div className="text-[13px] text-muted">{t.body}</div>}
              </div>
              <button onClick={() => dismiss(t.id)} className="btn-ghost h-7 px-1.5" aria-label="Dismiss">
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/** Slide-in bar for a ringing call. */
export function IncomingCallBar() {
  const call = useStore((s) => s.activeCall);
  const cust = useStore((s) => s.customers.find((c) => c.id === call?.customerId));
  const ticket = useStore((s) => s.tickets.find((t) => t.id === call?.ticketId));
  const now = useNow();
  const ringing = call?.phase === 'ringing';
  const script = call ? CALL_SCRIPTS[call.scriptKey] : undefined;
  return (
    <>
      {ringing && call && cust && script && (
        <motion.div
          initial={{ y: -90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="fixed top-3 inset-x-0 z-[55] flex justify-center px-4 pointer-events-none"
          role="alertdialog"
          aria-label="Incoming call"
        >
          <div className="pointer-events-auto w-full max-w-[760px] rounded-2xl bg-[#0B1220] text-white shadow-pop border border-white/10 overflow-hidden">
            <div className="flex items-center gap-4 px-4 py-3">
              <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#4F46E5]">
                <span className="absolute inset-0 rounded-full bg-[#4F46E5] animate-ping opacity-40" />
                <Phone size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-white/60">Incoming call · {script.ivrLabel} · IVR path {script.ivrPath.join(' → ')}</div>
                <div className="text-[16px] font-semibold truncate">
                  {cust.name} <span className="font-normal text-white/70">· {cust.company}, {cust.city}</span>
                </div>
                <div className="text-[13px] text-white/70 flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="mono">{cust.mobile}</span>
                  {ticket && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#0E7C86]/40 px-1.5 h-6 text-[13px] text-[#99F6E4]">
                      <Zap size={12} /> {ticket.id} auto-created {duration(Math.max(0, (now - ticket.createdAt) / 1000))} ago
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[13px] text-[#86EFAC]">
                    <CheckCircle2 size={12} /> Ack WhatsApp sent
                  </span>
                </div>
              </div>
              <button onClick={declineCall} className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" aria-label="Decline call">
                <PhoneOff size={17} />
              </button>
              <button onClick={acceptCall} className="h-10 px-5 rounded-full bg-success hover:bg-green-700 font-semibold flex items-center gap-2" autoFocus>
                <Phone size={16} /> Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}

/** Streams the scripted transcript while a call is live. */
export function CallController() {
  const call = useStore((s) => s.activeCall);
  const patch = useStore((s) => s.patchActiveCall);
  useEffect(() => {
    if (!call || call.phase !== 'live' || call.held) return;
    const script = CALL_SCRIPTS[call.scriptKey];
    if (call.lineIndex >= script.lines.length) return;
    const delay = call.lineIndex === 0 ? 900 : 1500 + ((call.lineIndex * 37) % 10) * 100;
    const id = setTimeout(() => patch({ lineIndex: call.lineIndex + 1 }), delay);
    return () => clearTimeout(id);
  }, [call, patch]);
  return null;
}

/** Watches SLA thresholds and raises notifications (75% → owner, breach → escalation ladder). */
export function SlaMonitor() {
  useEffect(() => {
    const id = setInterval(() => {
      const s = useStore.getState();
      if (s.scenarioRunning) return;
      const now = Date.now();
      s.tickets.forEach((t) => {
        if (!isOpen(t.status) || t.sla.pausedAt || t.mergedInto) return;
        const c = slaConsumed(t.sla, now);
        if (c >= 0.75 && c < 1 && !t.sla.warned) {
          s.updateTicket(t.id, { sla: { ...t.sla, warned: true }, escalationLevel: Math.max(1, t.escalationLevel) });
          s.addInteraction(t.id, { type: 'event', at: now, eventKind: 'sla_warning', body: 'SLA 75% warning sent to owner', chip: 'SLA 75%' });
          s.notify({ title: `SLA 75% · ${t.id}`, body: t.subject, tone: 'warning', ticketId: t.id });
        }
        const lvl = escalationLevelFor(t.sla, now);
        if (lvl >= 2 && lvl > t.escalationLevel) {
          const who = ['', '', 'supervisor Anita R.', 'manager Sanjay K.', 'function head Meera K.'][lvl];
          s.updateTicket(t.id, { escalationLevel: lvl, sla: { ...t.sla, warned: true } });
          s.addInteraction(t.id, { type: 'event', at: now, eventKind: 'escalated', body: `SLA breach: escalated to ${who}`, chip: `Escalation L${lvl}` });
          s.notify({ title: `Escalated · ${t.id}`, body: `Escalated to ${who}`, tone: 'critical', ticketId: t.id });
        }
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);
  return null;
}

export function GlobalKeys() {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
      const s = useStore.getState();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        s.setPalette(!s.paletteOpen);
        return;
      }
      if (typing) return;
      if (e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        s.setDirector(!s.directorOpen);
      } else if (e.key === '/') {
        e.preventDefault();
        s.setPalette(true);
      } else if (e.key === 'Escape') {
        if (s.directorOpen) s.setDirector(false);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  return null;
}

const SCENARIOS = [
  { n: 1, label: 'Incoming call: eDukaan dispatch delay', sub: 'Hinglish · screen pop · live transcript', icon: Phone, run: () => startIncomingCall('edukaan_dispatch') },
  { n: 2, label: 'Incoming call: Loyalty points not credited', sub: 'IVR 3 → Loyalty', icon: Phone, run: () => startIncomingCall('loyalty_points') },
  { n: 3, label: 'WhatsApp: track-order journey', sub: 'Bot → hand-off to agent', icon: MessageCircle, run: () => playJourney('/whatsapp', 'track') },
  { n: 4, label: 'Email: warranty query + follow-up', sub: 'Auto-ticket · duplicate prevented', icon: Mail, run: () => playJourney('/email', 'warranty') },
  { n: 5, label: 'After-hours voice bot: self-resolved', sub: 'Hindi · points balance', icon: Bot, run: () => playJourney('/voicebot', 'self_resolved') },
  { n: 6, label: 'After-hours voice bot: hand-off', sub: 'P2 ticket · 9:30 am callback', icon: Bot, run: () => playJourney('/voicebot', 'handoff') },
  { n: 7, label: 'SLA 75% → breach → escalation', sub: 'On the selected ticket', icon: Timer, run: () => runSlaEscalation() },
  { n: 8, label: 'Transfer Helpline → eDukaan', sub: 'History kept, no repetition', icon: ArrowRightLeft, run: () => runTransfer() },
  { n: 9, label: 'Jump to Command Center', sub: 'Numbers updated live', icon: LayoutDashboard, run: () => jumpToCommand() },
  { n: 10, label: 'Proactive: delay detected → WhatsApp', sub: 'Customers told before they call', icon: BellRing, run: () => playJourney('/proactive', 'scan') },
  { n: 11, label: 'Reset demo data', sub: 'Identical seed every time', icon: RotateCcw, run: () => resetDemo() },
];

export function DemoDirector() {
  const open = useStore((s) => s.directorOpen);
  const setOpen = useStore((s) => s.setDirector);
  const target = useStore((s) => {
    void s.lastTicketId;
    void s.tickets;
    return scenarioTargetId();
  });
  const call = useStore((s) => s.activeCall);
  return (
    <>
      {open && (
        <motion.aside
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="no-print fixed right-4 top-[68px] bottom-10 z-[58] w-[340px] card shadow-pop flex flex-col"
          aria-label="Demo Director"
        >
          <div className="flex items-center gap-2 px-4 h-12 border-b">
            <Clapperboard size={16} className="text-primary" />
            <span className="font-semibold">Demo Director</span>
            <span className="kbd ml-1">Shift D</span>
            <button className="btn-ghost btn-sm ml-auto" onClick={() => setOpen(false)} aria-label="Close Demo Director">
              <X size={15} />
            </button>
          </div>
          <div className="px-4 py-2 text-[13px] text-muted border-b bg-surface2">
            Selected ticket for 7–8: <span className="mono text-ink font-semibold">{target ?? 'none'}</span>
            {call && <span className="ml-2 text-warning font-medium">· call in progress</span>}
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin p-2">
            {SCENARIOS.map((sc) => {
              const Icon = sc.icon;
              return (
                <button
                  key={sc.n}
                  onClick={() => {
                    sc.run();
                    if (sc.n !== 7 && sc.n !== 8) setOpen(false);
                  }}
                  className={cn('w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-surface2 transition-colors', sc.n === 11 && 'mt-1 border-t rounded-t-none pt-3')}
                >
                  <span className={cn('h-8 w-8 shrink-0 rounded-lg flex items-center justify-center', sc.n === 11 ? 'bg-critical/10 text-critical' : 'bg-primary/10 text-primary')}>
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold leading-tight">
                      <span className="mono text-subtle mr-1.5">{sc.n}</span>
                      {sc.label}
                    </span>
                    <span className="block text-[13px] text-subtle">{sc.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </motion.aside>
      )}
    </>
  );
}

export function CommandPalette() {
  const open = useStore((s) => s.paletteOpen);
  const setOpen = useStore((s) => s.setPalette);
  const tickets = useStore((s) => s.tickets);
  const customers = useStore((s) => s.customers);
  const agents = useStore((s) => s.agents);
  const setTheme = useStore((s) => s.setTheme);
  const theme = useStore((s) => s.theme);
  const recent = useMemo(() => [...tickets].sort((a, b) => b.updatedAt - a.updatedAt), [tickets]);
  const { path } = useRoute();
  // Any navigation (palette pick, back button, Director) closes the palette.
  useEffect(() => {
    if (useStore.getState().paletteOpen) setOpen(false);
  }, [path, setOpen]);
  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };
  return (
    <>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4" initial={{ opacity: 0 }} transition={{ duration: 0.12 }} animate={{ opacity: 1 }}>
          <div className="absolute inset-0 bg-[#0B1220]/45" onClick={() => setOpen(false)} />
          <motion.div initial={{ y: -8, scale: 0.98 }} animate={{ y: 0, scale: 1 }} className="relative w-full max-w-[620px] card shadow-pop overflow-hidden">
            <Command label="Command palette" loop filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
              <div className="flex items-center gap-2 px-4 border-b">
                <Search size={16} className="text-subtle" />
                <Command.Input autoFocus placeholder="Jump to a ticket, customer or action…" className="h-12 flex-1 bg-transparent outline-none text-[14px] placeholder:text-subtle" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)} />
                <span className="kbd">Esc</span>
              </div>
              <Command.List className="max-h-[400px] overflow-y-auto scroll-thin p-2">
                <Command.Empty className="py-8 text-center text-[13px] text-muted">No matches. Try a ticket ID like TM-10412 or a city.</Command.Empty>
                <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  {[
                    { label: 'Open Command Center', icon: LayoutDashboard, run: () => go('/command') },
                    { label: 'Tickets with SLA at risk', icon: Timer, run: () => go('/inbox?view=sla_risk') },
                    { label: 'Unassigned tickets', icon: TicketIcon, run: () => go('/inbox?view=unassigned') },
                    { label: 'Simulate incoming call (eDukaan)', icon: Phone, run: () => { setOpen(false); startIncomingCall('edukaan_dispatch'); } },
                    { label: 'Open Wallboard (TV mode)', icon: Tv, run: () => go('/wallboard') },
                    { label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`, icon: Moon, run: () => { setTheme(theme === 'dark' ? 'light' : 'dark'); setOpen(false); } },
                    { label: 'Reset demo data', icon: RotateCcw, run: () => { setOpen(false); resetDemo(); } },
                  ].map((a) => (
                    <Command.Item key={a.label} value={`action ${a.label}`} onSelect={a.run} className="flex items-center gap-3 rounded-lg px-2.5 h-10 text-[13.5px] cursor-pointer data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary">
                      <a.icon size={16} /> {a.label}
                    </Command.Item>
                  ))}
                </Command.Group>
                <Command.Group heading="Tickets" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  {recent.slice(0, 400).map((t) => {
                    const c = customers.find((x) => x.id === t.customerId);
                    return (
                      <Command.Item
                        key={t.id}
                        value={`${t.id} ${t.subject} ${c?.name} ${c?.company} ${c?.city} ${t.entities?.orderId ?? ''} ${t.entities?.partNo ?? ''}`}
                        onSelect={() => go(`/ticket/${t.id}`)}
                        className="flex items-center gap-3 rounded-lg px-2.5 h-11 text-[13.5px] cursor-pointer data-[selected=true]:bg-primary/10"
                      >
                        <ChannelIcon c={t.channel} size={24} />
                        <span className="mono font-semibold w-[78px] shrink-0">{t.id}</span>
                        <span className="truncate flex-1">{t.subject}</span>
                        <PriorityChip p={t.priority} />
                        {!isOpen(t.status) && <span className="text-[13px] text-subtle">closed</span>}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
                <Command.Group heading="Customers" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  {customers.map((c) => {
                    const latest = recent.find((t) => t.customerId === c.id);
                    return (
                      <Command.Item
                        key={c.id}
                        value={`${c.name} ${c.company} ${c.city} ${c.dealerCode ?? ''} ${c.loyaltyId ?? ''}`}
                        onSelect={() => go(latest ? `/ticket/${latest.id}` : `/inbox?q=${encodeURIComponent(c.name)}`)}
                        className="flex items-center gap-3 rounded-lg px-2.5 h-11 text-[13.5px] cursor-pointer data-[selected=true]:bg-primary/10"
                      >
                        <User size={16} className="text-subtle" />
                        <span className="font-medium">{c.name}</span>
                        <span className="text-muted truncate">{c.company} · {c.city}</span>
                        <span className="ml-auto mono text-subtle text-[13px]">{c.dealerCode ?? c.loyaltyId ?? ''}</span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
                <Command.Group heading="People" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  {agents.map((a) => (
                    <Command.Item key={a.id} value={`agent ${a.name} ${a.title}`} onSelect={() => go(`/inbox?agent=${a.id}`)} className="flex items-center gap-3 rounded-lg px-2.5 h-11 text-[13.5px] cursor-pointer data-[selected=true]:bg-primary/10">
                      <Avatar agent={a} size={24} /> {a.name} <span className="text-subtle">{a.title}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
