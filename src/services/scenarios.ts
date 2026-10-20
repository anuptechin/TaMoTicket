import { useStore } from '../store/useStore';
import { navigate } from '../store/router';
import { CALL_SCRIPTS } from '../data/scripts';
import { agentShort } from '../data/seed';
import { HOUR, sleep } from '../lib/format';
import { isOpen } from '../lib/meta';
import type { Interaction } from '../types';

let runToken = 0;
export const currentRun = () => runToken;
export function cancelScenarios() {
  runToken++;
}

const S = () => useStore.getState();
const ev = (kind: NonNullable<Interaction['eventKind']>, body: string, chip?: string): Omit<Interaction, 'id'> => ({
  type: 'event',
  at: Date.now(),
  eventKind: kind,
  body,
  chip,
});

// ───────────── Incoming call ─────────────

export function startIncomingCall(scriptKey: keyof typeof CALL_SCRIPTS) {
  const s = S();
  const script = CALL_SCRIPTS[scriptKey];
  const customerId = s.heroes[script.heroKey];
  const cust = s.customers.find((c) => c.id === customerId)!;
  const agent = s.agents.find((a) => agentShort(a.name) === script.agentName);
  const now = Date.now();
  const t = s.createTicket({
    subject: script.initialSubject,
    customerId,
    desk: script.desk,
    channel: 'phone',
    priority: 'P3',
    category: 'Classifying…',
    intent: 'Detecting…',
    status: 'new',
    assigneeId: agent?.id,
    ackSec: 2,
    region: script.heroKey === 'imran' ? 'North' : 'West',
    interactions: [
      { ...ev('created', `Ticket auto-created at call start · ${cust.mobile} · ${script.ivrLabel} (TTSL Smartflo)`, 'Auto-created'), at: now },
      { ...ev('ack', 'Acknowledgement sent on WhatsApp with ticket number', 'Sent'), at: now + 2000 },
    ],
  });
  s.setActiveCall({ scriptKey, ticketId: t.id, customerId, phase: 'ringing', ringAt: now, lineIndex: 0, muted: false, held: false });
  s.pushIntegrationEvent('smartflo-voice', `Call event received: ${cust.mobile} → ${script.ivrLabel}`);
  s.pushIntegrationEvent('smartflo-wa', `Template "ticket_ack" delivered for ${t.id}`);
}

export function acceptCall() {
  const s = S();
  const call = s.activeCall;
  if (!call) return;
  s.patchActiveCall({ phase: 'live', acceptedAt: Date.now(), lineIndex: 0 });
  s.setMyStatus('busy');
  s.updateTicket(call.ticketId, { status: 'open' });
  navigate(`/ticket/${call.ticketId}`);
}

export function declineCall() {
  const s = S();
  const call = s.activeCall;
  if (!call) return;
  s.addInteraction(call.ticketId, ev('status', 'Call routed to next available agent'));
  s.setActiveCall(null);
}

export async function endCall() {
  const s = S();
  const call = s.activeCall;
  if (!call || call.phase !== 'live') return;
  const script = CALL_SCRIPTS[call.scriptKey];
  s.patchActiveCall({ phase: 'summarising', lineIndex: script.lines.length });
  await sleep(1600);
  const st = S();
  const id = call.ticketId;
  const now = Date.now();
  const dur = Math.max(95, Math.round((now - (call.acceptedAt ?? now)) / 1000));
  st.addInteraction(id, {
    type: 'call',
    at: call.acceptedAt ?? now,
    direction: 'in',
    author: st.customers.find((c) => c.id === call.customerId)?.name,
    call: {
      durationSec: dur,
      ivrPath: script.ivrPath,
      recording: true,
      transcriptKey: script.key,
      summary: script.summary,
      language: script.language,
    },
  });
  st.updateTicket(id, {
    subject: script.finalSubject,
    category: script.category,
    intent: script.intent,
    entities: script.entities,
    sentiment: 'negative',
    sla: { ...st.tickets.find((t) => t.id === id)!.sla, respondedAt: call.acceptedAt },
  });
  if (script.priority !== 'P3') st.setPriority(id, script.priority);
  st.addInteraction(id, ev('status', `AI wrote summary, category "${script.category}", priority ${script.priority}, entities ${Object.values(script.entities).join(', ')}`, 'AI'));
  st.addInteraction(id, { type: 'note', at: Date.now(), author: 'AI copilot', body: `Next action: ${script.nextAction}` });
  st.addInteraction(id, { type: 'whatsapp', at: Date.now() + 1, direction: 'out', author: 'BizSensAi', body: script.whatsappUpdate.replace('{id}', id) });
  st.setActiveCall(null);
  st.setMyStatus('available');
  st.toast({ tone: 'success', title: `Call summarised into ${id}`, body: 'Recording, transcript and WhatsApp update added' });
  st.pushIntegrationEvent('smartflo-voice', `Recording uploaded for ${id}`);
}

// ───────────── Page-driven journeys ─────────────

export function playJourney(path: '/whatsapp' | '/email' | '/voicebot' | '/proactive', play: string) {
  cancelScenarios();
  navigate(`${path}?play=${play}&run=${runToken}-${Date.now()}`);
}

// ───────────── SLA warning → breach → escalation ─────────────

function targetTicket(preferDesk?: 'helpline') {
  const s = S();
  const last = s.tickets.find((t) => t.id === s.lastTicketId);
  if (last && isOpen(last.status) && (!preferDesk || last.desk === preferDesk)) return last;
  const hero = s.tickets.find((t) => t.id === s.heroTickets.rajesh_email);
  if (hero && isOpen(hero.status) && (!preferDesk || hero.desk === preferDesk)) return hero;
  return s.tickets.find((t) => isOpen(t.status) && t.assigneeId && (!preferDesk || t.desk === preferDesk));
}

export function scenarioTargetId() {
  return targetTicket()?.id;
}

export async function runSlaEscalation() {
  const tok = ++runToken;
  const t = targetTicket();
  if (!t) return;
  const s = S();
  s.setScenario('sla');
  navigate(`/ticket/${t.id}`);
  const owner = s.agents.find((a) => a.id === t.assigneeId);
  const ownerName = owner ? agentShort(owner.name) : 'queue owner';
  const span = Math.max(t.sla.resolutionDueAt - t.sla.startAt - t.sla.pausedMs, 6 * HOUR);
  const setConsumed = (c: number, extra: Partial<typeof t.sla> = {}) => {
    const now = Date.now();
    const startAt = now - c * span;
    S().updateTicket(t.id, {
      sla: { ...t.sla, startAt, pausedMs: 0, pausedAt: undefined, responseDueAt: startAt + span / 4, resolutionDueAt: startAt + span, warned: true, ...extra },
    });
  };
  await sleep(900);
  if (tok !== runToken) return;
  setConsumed(0.76);
  S().addInteraction(t.id, ev('sla_warning', `SLA 75% warning: ${ownerName} notified on app, email and Teams`, 'SLA 75%'));
  S().notify({ title: `SLA 75% · ${t.id}`, body: `${ownerName} notified. ${t.subject}`, tone: 'warning', ticketId: t.id });
  S().toast({ tone: 'warning', title: `SLA 75% warning on ${t.id}`, body: `Owner ${ownerName} notified` });

  await sleep(4200);
  if (tok !== runToken) return;
  setConsumed(1.02);
  S().updateTicket(t.id, { escalationLevel: 2 });
  S().addInteraction(t.id, ev('escalated', 'SLA breached: escalated to supervisor Anita R. (L2)', 'Escalation L2'));
  S().notify({ title: `SLA breached · ${t.id}`, body: 'Escalated to supervisor Anita R.', tone: 'critical', ticketId: t.id });
  S().toast({ tone: 'critical', title: `SLA breached on ${t.id}`, body: 'Escalated to supervisor Anita R.' });

  await sleep(3800);
  if (tok !== runToken) return;
  const now = Date.now();
  const startAt = now - span - 4.1 * HOUR;
  S().updateTicket(t.id, { escalationLevel: 3, sla: { ...S().tickets.find((x) => x.id === t.id)!.sla, startAt, resolutionDueAt: startAt + span, responseDueAt: startAt + span / 4 } });
  S().addInteraction(t.id, ev('escalated', 'Breach + 4 h: escalated to manager Sanjay K. (L3). Function head is next at breach + 12 h.', 'Escalation L3'));
  S().notify({ title: `Escalation L3 · ${t.id}`, body: 'Manager Sanjay K. notified. Function head at breach + 12 h.', tone: 'critical', ticketId: t.id });
  S().toast({ tone: 'critical', title: 'Escalated to manager', body: `${t.id} · next: function head at breach + 12 h` });
  S().setScenario(null);
}

// ───────────── Transfer without repetition ─────────────

export async function runTransfer() {
  const tok = ++runToken;
  const t = targetTicket('helpline');
  if (!t) {
    S().toast({ tone: 'info', title: 'No open Helpline ticket to transfer', body: 'Reset demo data to restore the storyline' });
    return;
  }
  navigate(`/ticket/${t.id}`);
  await sleep(1100);
  if (tok !== runToken) return;
  const s = S();
  const aditi = s.agents.find((a) => a.name === 'Aditi Sharma');
  const owner = s.agents.find((a) => a.id === t.assigneeId);
  s.transfer(t.id, 'edukaan', aditi?.id, 'eDukaan order; customer has called 3 times. Please own the dispatch follow-up.', owner ? agentShort(owner.name) : 'Rohan M.');
  s.toast({ tone: 'success', title: `Ticket ${t.id} transferred to eDukaan`, body: 'Aditi S. sees the full history' });
  s.notify({ title: `Transferred to you · ${t.id}`, body: 'Aditi S. received the ticket with full context', tone: 'info', ticketId: t.id });
}

export function jumpToCommand() {
  navigate('/command');
  S().toast({ tone: 'info', title: 'Command Center', body: 'All numbers include the scenarios you just ran' });
}

export function resetDemo() {
  cancelScenarios();
  S().reset();
  navigate('/command');
  S().toast({ tone: 'success', title: 'Demo data reset', body: '320 tickets, 70 customers, identical every time' });
}
