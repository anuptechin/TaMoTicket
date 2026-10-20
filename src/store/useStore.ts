import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { buildSeed, agentShort, type LedgerEntry, type SeedData } from '../data/seed';
import { computeSla, DEFAULT_CALENDAR, DEFAULT_POLICIES, pauseSla, resumeSla, type BusinessCalendar } from '../lib/sla';
import { DESKS } from '../lib/meta';
import type {
  AgentStatus,
  AppNotification,
  Desk,
  Interaction,
  Priority,
  RoutingRule,
  Session,
  SLAPolicy,
  Status,
  Ticket,
  Toast,
} from '../types';

export interface ActiveCall {
  scriptKey: string;
  ticketId: string;
  customerId: string;
  phase: 'ringing' | 'live' | 'summarising' | 'done';
  ringAt: number;
  acceptedAt?: number;
  lineIndex: number;
  muted: boolean;
  held: boolean;
}

export interface AuditEntry {
  id: string;
  at: number;
  actor: string;
  action: string;
  target?: string;
}

interface PersistedState extends SeedData {
  session: Session | null;
  theme: 'light' | 'dark';
  myStatus: AgentStatus;
  policies: SLAPolicy[];
  calendar: BusinessCalendar;
  auditLog: AuditEntry[];
  seededAt: number;
  lastTicketId?: string;
  emailSchedule: Record<string, boolean>;
  proactive: { prevented: number; campaigns: ProactiveCampaign[]; sentOrderIds: string[] };
}

export interface ProactiveCampaign {
  id: string;
  at: number;
  reason: string;
  count: number;
  prevented: number;
  orderIds: string[];
}

interface UiState {
  toasts: Toast[];
  activeCall: ActiveCall | null;
  directorOpen: boolean;
  paletteOpen: boolean;
  scenarioRunning: string | null;
}

interface Actions {
  login: (s: Session) => void;
  logout: () => void;
  setTheme: (t: 'light' | 'dark') => void;
  setMyStatus: (s: AgentStatus) => void;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  notify: (n: Omit<AppNotification, 'id' | 'at'>) => void;
  markAllRead: () => void;
  createTicket: (t: NewTicket) => Ticket;
  updateTicket: (id: string, patch: Partial<Ticket>) => void;
  addInteraction: (id: string, i: Omit<Interaction, 'id'> & { id?: string }) => void;
  assign: (id: string, agentId: string | undefined) => void;
  setStatus: (id: string, status: Status) => void;
  setPriority: (id: string, p: Priority) => void;
  transfer: (id: string, desk: Desk, agentId: string | undefined, note: string, by?: string) => void;
  escalate: (id: string, reason?: string) => void;
  merge: (sourceId: string, targetId: string) => void;
  creditPoints: (customerId: string, points: number, text: string, clearPending?: string) => void;
  audit: (action: string, target?: string, actor?: string) => void;
  setLastTicket: (id: string) => void;
  setActiveCall: (c: ActiveCall | null) => void;
  patchActiveCall: (p: Partial<ActiveCall>) => void;
  setDirector: (open: boolean) => void;
  setPalette: (open: boolean) => void;
  setScenario: (name: string | null) => void;
  approveKb: (id: string) => void;
  setRules: (rules: RoutingRule[]) => void;
  setPolicies: (p: SLAPolicy[]) => void;
  setCalendar: (c: BusinessCalendar) => void;
  pushIntegrationEvent: (id: string, text: string) => void;
  toggleSchedule: (key: string) => void;
  recordProactive: (c: Omit<ProactiveCampaign, 'id' | 'at'>, etas: Record<string, number>) => void;
  reset: () => void;
}

export type NewTicket = Pick<Ticket, 'subject' | 'customerId' | 'desk' | 'channel' | 'priority' | 'category' | 'intent'> &
  Partial<Pick<Ticket, 'status' | 'assigneeId' | 'entities' | 'tags' | 'sentiment' | 'autoCreated' | 'aiResolved' | 'region'>> & {
    interactions?: (Omit<Interaction, 'id'> & { id?: string })[];
    createdAt?: number;
    ackSec?: number;
  };

export type StoreState = PersistedState & UiState & Actions;

const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* quota or privacy mode: the demo keeps working in memory */
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

let idc = 0;
const uid = (p: string) => `${p}${Date.now().toString(36)}${(++idc).toString(36)}`;

function freshState(): PersistedState {
  const now = Date.now();
  return {
    ...buildSeed(now),
    session: null,
    theme: (() => {
      try {
        return localStorage.getItem('bizsensai-theme') === 'dark' ? 'dark' : 'light';
      } catch {
        return 'light';
      }
    })(),
    myStatus: 'available',
    policies: DEFAULT_POLICIES,
    calendar: DEFAULT_CALENDAR,
    auditLog: [],
    seededAt: now,
    emailSchedule: { daily: true, weekly: true, monthly: false },
    proactive: {
      prevented: 41,
      sentOrderIds: [],
      campaigns: [
        { id: 'pc3', at: now - 2 * 3_600_000, reason: 'Pune WH: transporter pickup delayed', count: 18, prevented: 13, orderIds: [] },
        { id: 'pc2', at: now - 26 * 3_600_000, reason: 'Jamshedpur WH: stock awaiting QC release', count: 22, prevented: 16, orderIds: [] },
        { id: 'pc1', at: now - 74 * 3_600_000, reason: 'Lucknow WH: e-way bill generation delay', count: 16, prevented: 12, orderIds: [] },
      ],
    },
  };
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => {
      const me = () => {
        const s = get();
        const a = s.agents.find((x) => x.id === s.session?.agentId);
        return a ? agentShort(a.name) : 'System';
      };
      const patchTicket = (id: string, fn: (t: Ticket) => Ticket) =>
        set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? fn(t) : t)) }));
      const event = (kind: NonNullable<Interaction['eventKind']>, body: string, chip?: string): Interaction => ({
        id: uid('e'),
        type: 'event',
        at: Date.now(),
        eventKind: kind,
        body,
        chip,
      });

      return {
        ...freshState(),
        toasts: [],
        activeCall: null,
        directorOpen: false,
        paletteOpen: false,
        scenarioRunning: null,

        login: (session) => {
          set({ session });
          get().audit(`Signed in as ${session.role}`, DESKS[session.desk as Desk]?.label ?? 'All desks');
        },
        logout: () => set({ session: null }),
        setTheme: (theme) => {
          try {
            localStorage.setItem('bizsensai-theme', theme);
          } catch {
            /* ignore */
          }
          document.documentElement.classList.toggle('dark', theme === 'dark');
          set({ theme });
        },
        setMyStatus: (myStatus) => {
          set((s) => ({ myStatus, agents: s.agents.map((a) => (a.id === s.session?.agentId ? { ...a, status: myStatus } : a)) }));
        },
        toast: (t) => {
          const id = uid('t');
          set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
          setTimeout(() => get().dismissToast(id), 4200);
        },
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        notify: (n) => set((s) => ({ notifications: [{ ...n, id: uid('n'), at: Date.now() }, ...s.notifications].slice(0, 40) })),
        markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

        createTicket: (input) => {
          const s = get();
          const now = input.createdAt ?? Date.now();
          const id = `TM-${s.nextNo}`;
          const ackSec = input.ackSec ?? 2;
          const t: Ticket = {
            id,
            subject: input.subject,
            customerId: input.customerId,
            desk: input.desk,
            channel: input.channel,
            priority: input.priority,
            status: input.status ?? 'new',
            category: input.category,
            intent: input.intent,
            assigneeId: input.assigneeId,
            createdAt: now,
            updatedAt: now,
            ackSec,
            sla: computeSla(now, input.priority, s.policies, s.calendar),
            tags: input.tags ?? [],
            linkedIds: [],
            interactions: (input.interactions ?? []).map((i) => ({ ...i, id: i.id ?? uid('i') })),
            escalationLevel: 0,
            entities: input.entities,
            sentiment: input.sentiment ?? 'neutral',
            region: input.region ?? 'West',
            autoCreated: input.autoCreated ?? true,
            aiResolved: input.aiResolved,
          };
          set({ tickets: [...s.tickets, t], nextNo: s.nextNo + 1 });
          get().audit('Ticket auto-created', id, 'BizSensAi');
          return t;
        },
        updateTicket: (id, patch) => patchTicket(id, (t) => ({ ...t, ...patch, updatedAt: Date.now() })),
        addInteraction: (id, i) =>
          patchTicket(id, (t) => ({ ...t, updatedAt: Date.now(), interactions: [...t.interactions, { ...i, id: i.id ?? uid('i') } as Interaction] })),
        assign: (id, agentId) => {
          const a = get().agents.find((x) => x.id === agentId);
          patchTicket(id, (t) => ({
            ...t,
            assigneeId: agentId,
            status: t.status === 'new' ? 'open' : t.status,
            updatedAt: Date.now(),
            interactions: [...t.interactions, event('assigned', a ? `Assigned to ${agentShort(a.name)} by ${me()}` : `Unassigned by ${me()}`)],
          }));
          get().audit(a ? `Assigned to ${agentShort(a.name)}` : 'Unassigned', id, me());
        },
        setStatus: (id, status) => {
          const now = Date.now();
          patchTicket(id, (t) => {
            let sla = t.sla;
            const extra: Interaction[] = [event('status', `Status changed to ${status === 'awaiting' ? 'Awaiting customer' : status[0].toUpperCase() + status.slice(1)} by ${me()}`)];
            if (status === 'awaiting' && !sla.pausedAt) {
              sla = pauseSla(sla, now);
              extra.push(event('sla_paused', 'SLA paused while awaiting customer'));
            } else if (status !== 'awaiting' && sla.pausedAt) {
              sla = resumeSla(sla, now);
              extra.push(event('sla_resumed', 'SLA resumed'));
            }
            const closing = status === 'resolved' || status === 'closed';
            return {
              ...t,
              status,
              sla,
              resolvedAt: closing ? t.resolvedAt ?? now : undefined,
              updatedAt: now,
              interactions: [...t.interactions, ...extra],
            };
          });
          get().audit(`Status → ${status}`, id, me());
        },
        setPriority: (id, p) => {
          const s = get();
          patchTicket(id, (t) => {
            const fresh = computeSla(t.sla.startAt, p, s.policies, s.calendar);
            return {
              ...t,
              priority: p,
              sla: { ...t.sla, responseDueAt: fresh.responseDueAt, resolutionDueAt: fresh.resolutionDueAt, warned: false },
              updatedAt: Date.now(),
              interactions: [...t.interactions, event('priority', `Priority changed ${t.priority} → ${p} by ${me()}`)],
            };
          });
          get().audit(`Priority → ${p}`, id, me());
        },
        transfer: (id, desk, agentId, note, byName) => {
          const by = byName ?? me();
          const a = get().agents.find((x) => x.id === agentId);
          patchTicket(id, (t) => ({
            ...t,
            desk,
            assigneeId: agentId,
            transfer: { fromDesk: t.desk, by, at: Date.now(), note },
            updatedAt: Date.now(),
            interactions: [
              ...t.interactions,
              event('transferred', `Transferred from ${DESKS[t.desk].label} to ${DESKS[desk].label}${a ? ` (${agentShort(a.name)})` : ''} by ${by.replace(/\.$/, '')}. Full history kept.${note ? ` Note: "${note}"` : ''}`, 'Transfer'),
            ],
          }));
          get().audit(`Transferred to ${DESKS[desk].label}`, id, by);
        },
        escalate: (id, reason) => {
          const ladder = ['Ticket owner', 'Supervisor Anita R.', 'Manager Sanjay K.', 'Function head Meera K.'];
          patchTicket(id, (t) => {
            const level = Math.min(4, t.escalationLevel + 1);
            return {
              ...t,
              escalationLevel: level,
              updatedAt: Date.now(),
              interactions: [...t.interactions, event('escalated', `Escalated to ${ladder[level - 1]}${reason ? `: ${reason}` : ''}`, `Escalation L${level}`)],
            };
          });
          get().audit('Escalated', id, me());
        },
        merge: (sourceId, targetId) => {
          const src = get().tickets.find((t) => t.id === sourceId);
          if (!src) return;
          const now = Date.now();
          set((s) => ({
            tickets: s.tickets.map((t) => {
              if (t.id === sourceId)
                return { ...t, status: 'closed', resolvedAt: now, mergedInto: targetId, updatedAt: now, interactions: [...t.interactions, event('merged', `Merged into ${targetId}`, 'Merged')] };
              if (t.id === targetId)
                return {
                  ...t,
                  linkedIds: [...new Set([...t.linkedIds, sourceId])],
                  updatedAt: now,
                  interactions: [
                    ...t.interactions,
                    ...src.interactions.filter((i) => i.type !== 'event').map((i) => ({ ...i, id: uid('m'), chip: `From ${sourceId}` })),
                    event('merged', `${sourceId} merged into this ticket by ${me()}; its conversation is shown above`, 'Merged'),
                  ].sort((a, b) => a.at - b.at),
                };
              return t;
            }),
          }));
          get().audit(`Merged ${sourceId} into ${targetId}`, targetId, me());
        },
        creditPoints: (customerId, points, text, clearPending) =>
          set((s) => ({
            customers: s.customers.map((c) => (c.id === customerId ? { ...c, points: (c.points ?? 0) + points } : c)),
            ledger: {
              ...s.ledger,
              [customerId]: [
                { at: Date.now(), text, points } as LedgerEntry,
                ...(s.ledger[customerId] ?? []).filter((e) => !(clearPending && e.points === 0 && e.text.includes(clearPending))),
              ],
            },
          })),
        audit: (action, target, actor) =>
          set((s) => ({ auditLog: [{ id: uid('a'), at: Date.now(), actor: actor ?? me(), action, target }, ...s.auditLog].slice(0, 300) })),
        setLastTicket: (id) => set({ lastTicketId: id }),
        setActiveCall: (activeCall) => set({ activeCall }),
        patchActiveCall: (p) => set((s) => (s.activeCall ? { activeCall: { ...s.activeCall, ...p } } : {})),
        setDirector: (directorOpen) => set({ directorOpen }),
        setPalette: (paletteOpen) => set({ paletteOpen }),
        setScenario: (scenarioRunning) => set({ scenarioRunning }),
        approveKb: (id) => {
          set((s) => ({ kb: s.kb.map((k) => (k.id === id ? { ...k, draft: false, updated: Date.now() } : k)) }));
          get().audit('Knowledge article approved', id);
        },
        setRules: (rules) => set({ rules }),
        setPolicies: (policies) => {
          set({ policies });
          get().audit('SLA policy updated');
        },
        setCalendar: (calendar) => {
          set({ calendar });
          get().audit('Business hours updated');
        },
        pushIntegrationEvent: (id, text) =>
          set((s) => ({
            integrations: s.integrations.map((i) => (i.id === id ? { ...i, lastSync: Date.now(), events: [{ at: Date.now(), text }, ...i.events].slice(0, 12) } : i)),
          })),
        toggleSchedule: (key) => set((s) => ({ emailSchedule: { ...s.emailSchedule, [key]: !s.emailSchedule[key] } })),
        recordProactive: (c, etas) => {
          set((s) => ({
            proactive: {
              prevented: s.proactive.prevented + c.prevented,
              sentOrderIds: [...s.proactive.sentOrderIds, ...c.orderIds],
              campaigns: [{ ...c, id: uid('pc'), at: Date.now() }, ...s.proactive.campaigns],
            },
            orders: s.orders.map((o) => (etas[o.id] ? { ...o, status: 'Delayed' as const, eta: etas[o.id] } : o)),
          }));
          get().audit(`Proactive WhatsApp sent to ${c.count} customers`, c.reason, 'BizSensAi');
        },
        reset: () => {
          const session = get().session;
          const theme = get().theme;
          set({ ...freshState(), session, theme, activeCall: null, scenarioRunning: null, toasts: [] });
        },
      };
    },
    {
      name: 'bizsensai-hub-v1',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => {
        const { toasts, activeCall, directorOpen, paletteOpen, scenarioRunning, ...rest } = s;
        void toasts;
        void activeCall;
        void directorOpen;
        void paletteOpen;
        void scenarioRunning;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function')) as unknown as StoreState;
      },
    },
  ),
);

// Handy selectors
export const useTicket = (id?: string) => useStore((s) => s.tickets.find((t) => t.id === id));
export const useCustomer = (id?: string) => useStore((s) => s.customers.find((c) => c.id === id));
export const useAgent = (id?: string) => useStore((s) => s.agents.find((a) => a.id === id));
