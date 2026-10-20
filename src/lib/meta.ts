import {
  Phone,
  MessageCircle,
  Mail,
  MessagesSquare,
  Users,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import type { AgentStatus, Channel, Desk, Priority, SlaState, Status } from '../types';

export const DESKS: Record<Desk, { label: string; short: string; color: string }> = {
  helpline: { label: 'Parts Helpline', short: 'Helpline', color: '#0E7C86' },
  edukaan: { label: 'eDukaan', short: 'eDukaan', color: '#7C3AED' },
  loyalty: { label: 'Loyalty', short: 'Loyalty', color: '#D97706' },
};
export const DESK_KEYS: Desk[] = ['helpline', 'edukaan', 'loyalty'];

export const CHANNELS: Record<Channel, { label: string; icon: LucideIcon; color: string; bg: string }> = {
  phone: { label: 'Phone', icon: Phone, color: '#4F46E5', bg: 'rgb(79 70 229 / 0.12)' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: '#16A34A', bg: 'rgb(22 163 74 / 0.12)' },
  email: { label: 'Email', icon: Mail, color: '#0284C7', bg: 'rgb(2 132 199 / 0.12)' },
  webchat: { label: 'Web chat', icon: MessagesSquare, color: '#7C3AED', bg: 'rgb(124 58 237 / 0.12)' },
  teams: { label: 'Teams', icon: Users, color: '#6D28D9', bg: 'rgb(109 40 217 / 0.12)' },
  app: { label: 'Mobile app', icon: Smartphone, color: '#0E7C86', bg: 'rgb(14 124 134 / 0.12)' },
};
export const CHANNEL_KEYS: Channel[] = ['email', 'phone', 'whatsapp', 'webchat', 'teams', 'app'];

export const PRIORITIES: Record<Priority, { label: string; color: string; bg: string }> = {
  P1: { label: 'Critical', color: '#DC2626', bg: 'rgb(220 38 38 / 0.12)' },
  P2: { label: 'High', color: '#EA580C', bg: 'rgb(234 88 12 / 0.13)' },
  P3: { label: 'Medium', color: '#2563EB', bg: 'rgb(37 99 235 / 0.12)' },
  P4: { label: 'Low', color: '#64748B', bg: 'rgb(100 116 139 / 0.14)' },
};
export const PRIORITY_KEYS: Priority[] = ['P1', 'P2', 'P3', 'P4'];

export const STATUSES: Record<Status, { label: string; color: string }> = {
  new: { label: 'New', color: '#2563EB' },
  open: { label: 'Open', color: '#0E7C86' },
  pending: { label: 'Pending internal', color: '#7C3AED' },
  awaiting: { label: 'Awaiting customer', color: '#D97706' },
  resolved: { label: 'Resolved', color: '#16A34A' },
  closed: { label: 'Closed', color: '#64748B' },
};
export const STATUS_KEYS: Status[] = ['new', 'open', 'pending', 'awaiting', 'resolved', 'closed'];
export const OPEN_STATUSES: Status[] = ['new', 'open', 'pending', 'awaiting'];
export const isOpen = (s: Status) => OPEN_STATUSES.includes(s);

export const SLA_STATES: Record<SlaState, { label: string; color: string }> = {
  on_track: { label: 'On track', color: '#16A34A' },
  at_risk: { label: 'At risk', color: '#D97706' },
  breached: { label: 'Breached', color: '#DC2626' },
  met: { label: 'Met', color: '#16A34A' },
  paused: { label: 'Paused', color: '#64748B' },
};

export const AGENT_STATUS: Record<AgentStatus, { label: string; color: string }> = {
  available: { label: 'Available', color: '#16A34A' },
  busy: { label: 'Busy', color: '#DC2626' },
  away: { label: 'Away', color: '#D97706' },
  offline: { label: 'Offline', color: '#94A3B8' },
};

export const CATEGORIES = [
  'Order & dispatch',
  'Wrong / damaged part',
  'Payment & refund',
  'Loyalty points',
  'Part supersession',
  'Pricing',
  'Warranty',
  'Portal access',
  'Invoice & GST',
  'Availability',
] as const;

/** Accessible text shade of a palette colour (darker in light mode, lighter in dark mode). */
export const ink = (c: string) => `color-mix(in srgb, ${c} var(--ink-strength), var(--ink-base))`;

/** Colour for SLA consumption (0..1+). */
export function slaColor(consumed: number): string {
  if (consumed >= 1) return '#DC2626';
  if (consumed >= 0.75) return '#D97706';
  if (consumed >= 0.5) return '#CA8A04';
  return '#16A34A';
}
