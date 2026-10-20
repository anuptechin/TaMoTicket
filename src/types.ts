export type Desk = 'helpline' | 'edukaan' | 'loyalty';
export type DeskFilter = Desk | 'all';
export type Channel = 'email' | 'phone' | 'whatsapp' | 'webchat' | 'teams' | 'app';
export type Priority = 'P1' | 'P2' | 'P3' | 'P4';
export type Status = 'new' | 'open' | 'pending' | 'awaiting' | 'resolved' | 'closed';
export type SlaState = 'on_track' | 'at_risk' | 'breached' | 'met' | 'paused';
export type Role = 'agent' | 'supervisor' | 'manager';
export type AgentStatus = 'available' | 'busy' | 'away' | 'offline';
export type Sentiment = 'positive' | 'neutral' | 'negative';

export type CustomerType = 'dealer' | 'retailer' | 'garage' | 'fleet' | 'loyalty';

export interface Customer {
  id: string;
  name: string;
  company: string;
  type: CustomerType;
  city: string;
  state: string;
  mobile: string;
  email: string;
  dealerCode?: string;
  loyaltyId?: string;
  gstin?: string;
  points?: number;
  tier?: 'Silver' | 'Gold' | 'Platinum';
  segment: string;
  since: string;
  csat: number;
  sentimentTrend: number[];
  language: string;
}

export interface Agent {
  id: string;
  name: string;
  initials: string;
  desk: DeskFilter;
  role: 'agent' | 'supervisor' | 'manager' | 'head';
  title: string;
  skills: string[];
  shift: string;
  status: AgentStatus;
  handledToday: number;
  csat: number;
  avgHandleMin: number;
  fcr: number;
  hue: number;
}

export interface TranscriptLine {
  speaker: 'customer' | 'agent' | 'bot' | 'ivr';
  text: string;
  translation?: string;
  t?: number;
}

export interface CallData {
  durationSec: number;
  ivrPath: string[];
  recording: boolean;
  transcriptKey?: string;
  transcript?: TranscriptLine[];
  summary?: string;
  language: string;
  fromBot?: boolean;
}

export interface LookupData {
  title: string;
  source: string;
  rows: [string, string][];
  tone?: 'success' | 'warning' | 'info';
}

export type InteractionType =
  | 'email'
  | 'call'
  | 'whatsapp'
  | 'webchat'
  | 'teams'
  | 'app'
  | 'note'
  | 'event'
  | 'lookup';

export interface Interaction {
  id: string;
  type: InteractionType;
  at: number;
  direction?: 'in' | 'out';
  author?: string;
  subject?: string;
  body?: string;
  media?: string;
  call?: CallData;
  lookup?: LookupData;
  eventKind?: 'created' | 'ack' | 'assigned' | 'transferred' | 'escalated' | 'sla_paused' | 'sla_resumed' | 'status' | 'priority' | 'merged' | 'linked' | 'sla_warning' | 'sla_breach' | 'csat' | 'resolved_ai';
  chip?: string;
}

export interface TicketSla {
  startAt: number;
  responseDueAt: number;
  resolutionDueAt: number;
  respondedAt?: number;
  pausedAt?: number;
  pausedMs: number;
  warned?: boolean;
}

export interface Ticket {
  id: string;
  subject: string;
  customerId: string;
  desk: Desk;
  channel: Channel;
  priority: Priority;
  status: Status;
  category: string;
  intent: string;
  assigneeId?: string;
  createdAt: number;
  updatedAt: number;
  ackSec: number;
  resolvedAt?: number;
  sla: TicketSla;
  tags: string[];
  linkedIds: string[];
  interactions: Interaction[];
  aiResolved?: boolean;
  fcr?: boolean;
  reopened?: boolean;
  csat?: number;
  escalationLevel: number;
  transfer?: { fromDesk: Desk; by: string; at: number; note: string };
  autoCreated?: boolean;
  entities?: { orderId?: string; partNo?: string; invoice?: string };
  sentiment: Sentiment;
  region: string;
  mergedInto?: string;
  breachRisk?: string;
}

export interface SLAPolicy {
  priority: Priority;
  label: string;
  responseH: number;
  resolutionH: number;
}

export interface RoutingCondition {
  field: 'channel' | 'intent' | 'desk' | 'customerType' | 'keyword' | 'priority' | 'ivr';
  op: '=' | 'contains' | 'in';
  value: string;
}

export interface RoutingRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: RoutingCondition[];
  actions: { desk?: Desk; priority?: Priority; assign?: string; tag?: string };
  hits: number;
}

export interface KBArticle {
  id: string;
  title: string;
  category: string;
  desk: DeskFilter;
  summary: string;
  steps: string[];
  views: number;
  helpful: number;
  updated: number;
  draft?: boolean;
  sourceCount?: number;
}

export interface IntegrationEvent {
  at: number;
  text: string;
  level?: 'ok' | 'warn';
}

export interface Integration {
  id: string;
  name: string;
  group: string;
  description: string;
  status: 'connected' | 'degraded';
  lastSync: number;
  health: number;
  throughput: string;
  events: IntegrationEvent[];
}

export interface Order {
  id: string;
  customerId: string;
  placedAt: number;
  status: 'Processing' | 'Packed' | 'Dispatched' | 'In transit' | 'Delivered' | 'Delayed';
  items: { partNo: string; name: string; qty: number; price: number }[];
  warehouse: string;
  tracking?: string;
  invoice?: string;
  eta: number;
}

export interface AppNotification {
  id: string;
  at: number;
  title: string;
  body: string;
  tone: 'info' | 'warning' | 'critical' | 'success';
  ticketId?: string;
  read?: boolean;
}

export interface Toast {
  id: string;
  title: string;
  body?: string;
  tone: 'info' | 'success' | 'warning' | 'critical';
}

export interface Session {
  role: Role;
  desk: DeskFilter;
  agentId: string;
}
