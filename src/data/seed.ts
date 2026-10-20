import { createRng, type Rng } from '../lib/rng';
import { DEFAULT_POLICIES, escalationLevelFor, policyFor } from '../lib/sla';
import { CHANNELS } from '../lib/meta';
import type {
  Agent,
  AppNotification,
  Channel,
  Customer,
  CustomerType,
  Desk,
  Integration,
  Interaction,
  KBArticle,
  Order,
  Priority,
  RoutingRule,
  Sentiment,
  Status,
  Ticket,
} from '../types';
import { CITIES, COMPANY_PREFIX, COMPANY_SUFFIX, FIRST_NAMES, LAST_NAMES, PARTS, SEGMENTS, WAREHOUSES } from './catalog';
import { SEED_TRANSCRIPTS } from './scripts';

const SEED = 9242;
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export interface LedgerEntry {
  at: number;
  text: string;
  points: number;
}

export interface SeedData {
  customers: Customer[];
  agents: Agent[];
  tickets: Ticket[];
  orders: Order[];
  kb: KBArticle[];
  integrations: Integration[];
  rules: RoutingRule[];
  notifications: AppNotification[];
  ledger: Record<string, LedgerEntry[]>;
  heroes: Record<string, string>;
  heroTickets: Record<string, string>;
  nextNo: number;
}

// ───────────────────────────── Agents ─────────────────────────────

const AGENT_DEFS: [string, Agent['desk'], Agent['role'], string, string[]][] = [
  ['Rohan Mehta', 'helpline', 'agent', 'Senior agent', ['Dispatch', 'SAP', 'Hindi', 'Marathi']],
  ['Priya Nair', 'helpline', 'agent', 'Agent', ['Warranty', 'IPMS', 'Malayalam', 'Tamil']],
  ['Arjun Reddy', 'helpline', 'agent', 'Agent', ['Supersession', 'PLM', 'Telugu']],
  ['Sneha Kulkarni', 'helpline', 'agent', 'Agent', ['Pricing', 'Marathi', 'Hindi']],
  ['Vikram Joshi', 'helpline', 'agent', 'Agent', ['Dispatch', 'Returns', 'Gujarati']],
  ['Neha Gupta', 'helpline', 'agent', 'Agent', ['Invoice & GST', 'Hindi']],
  ['Farhan Sheikh', 'helpline', 'agent', 'Agent', ['Wrong part', 'Urdu', 'Hindi']],
  ['Deepa Menon', 'helpline', 'agent', 'Agent', ['Warranty', 'Kannada']],
  ['Aditi Sharma', 'edukaan', 'agent', 'eDukaan specialist', ['eDukaan', 'Payments', 'Portal', 'Hindi']],
  ['Karan Malhotra', 'loyalty', 'agent', 'Senior agent', ['Loyalty CRM', 'Punjabi', 'Hindi']],
  ['Pooja Verma', 'loyalty', 'agent', 'Agent', ['Redemption', 'Hindi']],
  ['Manoj Tiwari', 'loyalty', 'agent', 'Agent', ['Registration', 'Bhojpuri', 'Hindi']],
  ['Ritu Singh', 'loyalty', 'agent', 'Agent', ['Points', 'Bengali']],
  ['Sameer Khan', 'loyalty', 'agent', 'Agent', ['Tier upgrades', 'Hindi', 'Urdu']],
  ['Anita Rao', 'all', 'supervisor', 'Supervisor, Helpline & eDukaan', ['Escalations', 'Quality']],
  ['Vivek Chauhan', 'loyalty', 'supervisor', 'Supervisor, Loyalty', ['Escalations', 'Loyalty CRM']],
  ['Sanjay Kapoor', 'all', 'manager', 'Manager, Customer Support', ['Operations']],
  ['Meera Krishnan', 'all', 'head', 'Head, Parts Business Support', ['Leadership']],
];

function buildAgents(rng: Rng): Agent[] {
  const statuses: Agent['status'][] = ['available', 'busy', 'available', 'busy', 'available', 'away'];
  return AGENT_DEFS.map(([name, desk, role, title, skills], i) => {
    const [f, l] = name.split(' ');
    return {
      id: `A${String(i + 1).padStart(2, '0')}`,
      name,
      initials: f[0] + l[0],
      desk,
      role,
      title,
      skills,
      shift: role === 'agent' ? (i % 3 === 0 ? '08:00–17:00' : '09:00–18:00') : '09:00–18:00',
      status: role === 'agent' ? statuses[i % statuses.length] : 'available',
      handledToday: role === 'agent' ? rng.int(9, 26) : 0,
      csat: Math.round((4.2 + rng.next() * 0.7) * 10) / 10,
      avgHandleMin: rng.int(6, 14),
      fcr: rng.int(64, 84),
      hue: (i * 47) % 360,
    };
  });
}

export const agentShort = (name: string) => {
  const [f, l] = name.split(' ');
  return `${f} ${l?.[0] ?? ''}.`;
};

// ───────────────────────────── Customers ─────────────────────────────

const mask = (n: number) => `+91 98XXX X${String(n).padStart(4, '0')}`;

function gstin(rng: Rng, code: string) {
  const sc: Record<string, string> = { MH: '27', JH: '20', UP: '09', MP: '23', TN: '33', AS: '18', PB: '03', RJ: '08', GJ: '24', WB: '19', BR: '10', KA: '29', CG: '22', UK: '05', AP: '37', KL: '32' };
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const letters = Array.from({ length: 5 }, () => rng.pick(L.split(''))).join('');
  return `${sc[code] ?? '27'}${letters}${rng.int(1000, 9999)}${rng.pick(L.split(''))}1Z${rng.int(1, 9)}`;
}

interface HeroDef {
  key: string;
  name: string;
  company: string;
  type: CustomerType;
  city: string;
  mobile: number;
  dealerCode?: string;
  loyaltyId?: string;
  points?: number;
  tier?: Customer['tier'];
  segment: string;
  language: string;
}

const HEROES: HeroDef[] = [
  { key: 'rajesh', name: 'Rajesh Patil', company: 'Shree Ganesh Auto Spares', type: 'retailer', city: 'Pune', mobile: 4521, segment: 'SCV, ICV', language: 'Hindi, Marathi', dealerCode: 'RTL-MH-2207' },
  { key: 'imran', name: 'Imran Qureshi', company: 'Qureshi Motor Garage', type: 'loyalty', city: 'Lucknow', mobile: 3307, loyaltyId: 'LYT-778201', points: 12480, tier: 'Gold', segment: 'Pickup, SCV', language: 'Hindi, Urdu' },
  { key: 'suresh', name: 'Suresh Iyer', company: 'Kovai Motors', type: 'dealer', city: 'Coimbatore', mobile: 6610, dealerCode: 'DLR-TN-0087', segment: 'M&HCV, Bus', language: 'Tamil, English' },
  { key: 'gurpreet', name: 'Gurpreet Singh', company: 'Gill Roadlines', type: 'fleet', city: 'Ludhiana', mobile: 2284, segment: 'M&HCV', language: 'Punjabi, Hindi' },
  { key: 'ramesh', name: 'Ramesh Yadav', company: 'Yadav Auto Works', type: 'loyalty', city: 'Indore', mobile: 2913, loyaltyId: 'LYT-662913', points: 8240, tier: 'Silver', segment: 'SCV', language: 'Hindi' },
  { key: 'anil', name: 'Anil Mahato', company: 'Mahato Motor Workshop', type: 'garage', city: 'Jamshedpur', mobile: 7749, segment: 'ICV', language: 'Hindi' },
  { key: 'kavita', name: 'Kavita Deshmukh', company: 'Mahalaxmi Automobiles', type: 'dealer', city: 'Nagpur', mobile: 5108, dealerCode: 'DLR-MH-0142', segment: 'SCV, Pickup', language: 'Marathi, Hindi' },
];

function buildCustomers(rng: Rng, now: number): { customers: Customer[]; heroes: Record<string, string> } {
  const customers: Customer[] = [];
  const heroes: Record<string, string> = {};
  const cityOf = (name: string) => CITIES.find((c) => c.city === name)!;
  const trend = () => Array.from({ length: 6 }, () => Math.round((0.2 + rng.next() * 0.7) * 100) / 100);

  HEROES.forEach((h, i) => {
    const c = cityOf(h.city);
    const id = `C-${1001 + i}`;
    heroes[h.key] = id;
    customers.push({
      id,
      name: h.name,
      company: h.company,
      type: h.type,
      city: c.city,
      state: c.state,
      mobile: mask(h.mobile),
      email: `${h.name.split(' ')[0].toLowerCase()}@${h.company.split(' ')[0].toLowerCase()}${h.type === 'dealer' ? 'motors' : 'auto'}.in`,
      dealerCode: h.dealerCode,
      loyaltyId: h.loyaltyId,
      gstin: h.type === 'dealer' || h.type === 'retailer' || h.type === 'fleet' ? gstin(rng, c.code) : undefined,
      points: h.points,
      tier: h.tier,
      segment: h.segment,
      since: String(2012 + (i % 10)),
      csat: h.key === 'rajesh' ? 3.6 : 4.4,
      sentimentTrend: h.key === 'rajesh' ? [0.7, 0.66, 0.6, 0.48, 0.4, 0.32] : trend(),
      language: h.language,
    });
  });

  const types: [CustomerType, number][] = [
    ['dealer', 16],
    ['retailer', 20],
    ['garage', 12],
    ['fleet', 8],
    ['loyalty', 14],
  ];
  let n = customers.length;
  while (n < 70) {
    const type = rng.weighted(types);
    const c = rng.pick(CITIES);
    const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    const company =
      type === 'loyalty' || type === 'garage'
        ? `${name.split(' ')[1]} ${rng.pick(COMPANY_SUFFIX[type])}`
        : `${rng.pick(COMPANY_PREFIX)} ${rng.pick(COMPANY_SUFFIX[type])}`;
    const isLoyal = type === 'loyalty' || (type === 'garage' && rng.chance(0.5));
    const points = isLoyal ? rng.int(800, 24000) : undefined;
    customers.push({
      id: `C-${1001 + n}`,
      name,
      company,
      type,
      city: c.city,
      state: c.state,
      mobile: mask(rng.int(1000, 9999)),
      email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}@mail.in`,
      dealerCode: type === 'dealer' ? `DLR-${c.code}-${String(rng.int(10, 499)).padStart(4, '0')}` : type === 'retailer' ? `RTL-${c.code}-${rng.int(1000, 4999)}` : undefined,
      loyaltyId: isLoyal ? `LYT-${rng.int(600000, 799999)}` : undefined,
      gstin: type === 'dealer' || type === 'retailer' || type === 'fleet' ? gstin(rng, c.code) : undefined,
      points,
      tier: points ? (points > 15000 ? 'Platinum' : points > 10000 ? 'Gold' : 'Silver') : undefined,
      segment: rng.pick(SEGMENTS) + (rng.chance(0.4) ? `, ${rng.pick(SEGMENTS)}` : ''),
      since: String(rng.int(2008, 2025)),
      csat: Math.round((3.6 + rng.next() * 1.4) * 10) / 10,
      sentimentTrend: trend(),
      language: rng.pick(['Hindi', 'Hindi, English', 'Marathi, Hindi', 'Tamil, English', 'Bengali, Hindi', 'Punjabi, Hindi', 'Gujarati, Hindi']),
    });
    n++;
  }
  void now;
  return { customers, heroes };
}

// ───────────────────────────── Orders & ledger ─────────────────────────────

function buildOrders(rng: Rng, now: number, customers: Customer[], heroes: Record<string, string>): Order[] {
  const orders: Order[] = [];
  const statuses: [Order['status'], number][] = [
    ['Delivered', 45],
    ['In transit', 18],
    ['Dispatched', 10],
    ['Packed', 8],
    ['Processing', 12],
    ['Delayed', 7],
  ];
  const mk = (o: Partial<Order> & Pick<Order, 'id' | 'customerId'>): Order => ({
    placedAt: now - rng.int(1, 20) * DAY,
    status: 'Delivered',
    items: [],
    warehouse: rng.pick(WAREHOUSES),
    eta: now + rng.int(1, 5) * DAY,
    ...o,
  });

  orders.push(
    mk({
      id: 'ED-558210',
      customerId: heroes.rajesh,
      placedAt: now - 5 * DAY - 3 * HOUR,
      status: 'Delayed',
      items: [{ partNo: 'PRT-27014-BRK', name: 'Brake pad set (front)', qty: 40, price: 2450 }],
      warehouse: 'Pune WH',
      invoice: 'INV-2026-44790',
      eta: now + 2 * DAY,
    }),
    mk({
      id: 'ED-557981',
      customerId: heroes.rajesh,
      placedAt: now - 12 * DAY,
      status: 'Delivered',
      items: [{ partNo: 'PRT-10455-OFL', name: 'Oil filter element', qty: 60, price: 420 }],
      warehouse: 'Pune WH',
      tracking: 'TRK-88102291',
      invoice: 'INV-2026-44012',
      eta: now - 8 * DAY,
    }),
    mk({
      id: 'ED-558774',
      customerId: heroes.gurpreet,
      placedAt: now - 4 * DAY,
      status: 'In transit',
      items: [{ partNo: 'PRT-38811-SHK', name: 'Shock absorber (rear)', qty: 6, price: 2980 }],
      warehouse: 'Jamshedpur WH',
      tracking: 'TRK-88213407',
      invoice: 'INV-2026-44861',
      eta: now + 2 * DAY,
    }),
    mk({
      id: 'ED-559034',
      customerId: heroes.anil,
      placedAt: now - 3 * DAY,
      status: 'Delivered',
      items: [{ partNo: 'PRT-31208-CLT', name: 'Clutch plate assembly', qty: 2, price: 6890 }],
      warehouse: 'Jamshedpur WH',
      tracking: 'TRK-88230115',
      invoice: 'INV-2026-44903',
      eta: now - DAY,
    }),
    mk({
      id: 'ED-558902',
      customerId: heroes.suresh,
      placedAt: now - 6 * DAY,
      status: 'Delivered',
      items: [{ partNo: 'PRT-44102-ALT', name: 'Alternator 24V 70A', qty: 3, price: 14200 }],
      warehouse: 'Dharwad WH',
      tracking: 'TRK-88199820',
      invoice: 'INV-2026-44655',
      eta: now - 2 * DAY,
    }),
  );

  customers.forEach((c) => {
    if (Object.values(heroes).includes(c.id)) return;
    if (c.type === 'loyalty' && rng.chance(0.6)) return;
    const count = rng.int(0, 2);
    for (let i = 0; i < count; i++) {
      const part = rng.pick(PARTS);
      const status = rng.weighted(statuses);
      orders.push(
        mk({
          id: `ED-55${rng.int(1000, 9899)}`,
          customerId: c.id,
          status,
          items: [{ partNo: part.no, name: part.name, qty: rng.int(2, 50), price: part.price }],
          tracking: ['Dispatched', 'In transit', 'Delivered'].includes(status) ? `TRK-88${rng.int(100000, 999999)}` : undefined,
          invoice: status !== 'Processing' ? `INV-2026-4${rng.int(1000, 4999)}` : undefined,
        }),
      );
    }
  });
  return orders;
}

function buildLedger(rng: Rng, now: number, customers: Customer[], heroes: Record<string, string>) {
  const ledger: Record<string, LedgerEntry[]> = {};
  customers.forEach((c) => {
    if (!c.loyaltyId) return;
    const entries: LedgerEntry[] = [];
    for (let i = 0; i < 5; i++) {
      const redeem = rng.chance(0.2);
      entries.push({
        at: now - (i * 6 + rng.int(1, 5)) * DAY,
        text: redeem ? 'Redeemed: tool kit voucher' : `Credit: invoice INV-2026-4${rng.int(1000, 4999)}`,
        points: redeem ? -rng.int(1, 4) * 500 : rng.int(12, 90) * 10,
      });
    }
    ledger[c.id] = entries;
  });
  ledger[heroes.imran] = [
    { at: now - 10 * DAY, text: 'Pending batch: invoice INV-2026-44817', points: 0 },
    { at: now - 16 * DAY, text: 'Credit: invoice INV-2026-44120', points: 380 },
    { at: now - 23 * DAY, text: 'Credit (delayed 3 weeks): INV-2026-43517', points: 520 },
    { at: now - 31 * DAY, text: 'Redeemed: torque wrench voucher', points: -2000 },
  ];
  ledger[heroes.ramesh] = [
    { at: now - 6 * DAY, text: 'Credit: invoice INV-2026-43902', points: 420 },
    { at: now - 19 * DAY, text: 'Credit: invoice INV-2026-43311', points: 260 },
    { at: now - 33 * DAY, text: 'Redeemed: workshop apron set', points: -1000 },
  ];
  return ledger;
}

// ───────────────────────────── Tickets ─────────────────────────────

interface Ctx {
  ord: string;
  inv: string;
  part: (typeof PARTS)[number];
  seg: string;
  city: string;
  wh: string;
  pts: number;
  claim: string;
}

interface Template {
  desk: Desk;
  category: string;
  intent: string;
  weight: number;
  subjects: ((x: Ctx) => string)[];
  body: (x: Ctx) => string;
  transcript: string;
  entities?: (x: Ctx) => Ticket['entities'];
}

const TEMPLATES: Template[] = [
  {
    desk: 'helpline',
    category: 'Order & dispatch',
    intent: 'Dispatch delay',
    weight: 16,
    subjects: [
      (x) => `Dispatch delayed from ${x.wh} for order ${x.ord}`,
      (x) => `${x.part.name} ${x.part.no} not delivered against order ${x.ord}`,
      (x) => `Back-order ETA needed for ${x.part.no}`,
    ],
    body: (x) =>
      `Dear Team,\n\nOur order ${x.ord} for ${x.part.name} (${x.part.no}) has not been dispatched yet. It was confirmed last week and our customers are waiting with vehicles off road.\n\nPlease share the dispatch date and LR number at the earliest.\n\nRegards`,
    transcript: 'dispatch_generic',
    entities: (x) => ({ orderId: x.ord, partNo: x.part.no }),
  },
  {
    desk: 'helpline',
    category: 'Wrong / damaged part',
    intent: 'Wrong part supplied',
    weight: 11,
    subjects: [
      (x) => `Wrong clutch plate supplied for ${x.seg}, need replacement`,
      (x) => `Damaged ${x.part.name.toLowerCase()} received in consignment ${x.ord}`,
      () => 'Short supply: 4 units missing against invoice',
    ],
    body: (x) =>
      `Hello,\n\nWe received ${x.part.name} against order ${x.ord} but the part does not match the ${x.seg} application. Photos of the box label and the part are attached.\n\nKindly arrange a replacement and pickup of the wrong part.\n\nThanks`,
    transcript: 'wrong_part',
    entities: (x) => ({ orderId: x.ord, partNo: x.part.no }),
  },
  {
    desk: 'helpline',
    category: 'Part supersession',
    intent: 'Supersession query',
    weight: 8,
    subjects: [
      () => 'Part supersession query: old part number discontinued',
      (x) => `Supersession for ${x.part.no}: new part not in price list`,
    ],
    body: (x) =>
      `Hi,\n\nPart ${x.part.no} shows as discontinued in the catalogue. Please confirm the superseding part number and whether it is interchangeable for ${x.seg} vehicles.\n\nRegards`,
    transcript: 'dispatch_generic',
    entities: (x) => ({ partNo: x.part.no }),
  },
  {
    desk: 'helpline',
    category: 'Pricing',
    intent: 'Price list request',
    weight: 6,
    subjects: [() => 'Request for price list update, Q3', (x) => `Price mismatch on invoice ${x.inv}`],
    body: (x) =>
      `Dear Sir/Madam,\n\nPlease share the updated Q3 price list. Also, invoice ${x.inv} shows a different rate for ${x.part.no} than the circular.\n\nThank you`,
    transcript: 'dispatch_generic',
    entities: (x) => ({ invoice: x.inv }),
  },
  {
    desk: 'helpline',
    category: 'Warranty',
    intent: 'Warranty claim status',
    weight: 8,
    subjects: [() => 'Warranty claim status for alternator', (x) => `Warranty rejected for fuel pump, claim ${x.claim}`],
    body: (x) =>
      `Hello Team,\n\nOur warranty claim ${x.claim} for ${x.part.name} is pending for over two weeks. The customer is waiting for the vehicle. Please update the status.\n\nRegards`,
    transcript: 'warranty_status',
    entities: (x) => ({ partNo: x.part.no }),
  },
  {
    desk: 'helpline',
    category: 'Invoice & GST',
    intent: 'Invoice copy',
    weight: 5,
    subjects: [(x) => `GST invoice copy required for ${x.inv}`, () => 'GSTIN mismatch on tax invoice'],
    body: (x) => `Hi,\n\nPlease send a copy of GST invoice ${x.inv}. Our accounts team needs it for input credit filing.\n\nThanks`,
    transcript: 'dispatch_generic',
    entities: (x) => ({ invoice: x.inv }),
  },
  {
    desk: 'helpline',
    category: 'Availability',
    intent: 'Stock availability',
    weight: 5,
    subjects: [(x) => `Availability of ${x.part.name.toLowerCase()} for ${x.seg} in ${x.city}`],
    body: (x) => `Hello,\n\nPlease confirm stock of ${x.part.no} (${x.part.name}) at the nearest warehouse. We need 20 units.\n\nRegards`,
    transcript: 'dispatch_generic',
    entities: (x) => ({ partNo: x.part.no }),
  },
  {
    desk: 'edukaan',
    category: 'Payment & refund',
    intent: 'Duplicate payment',
    weight: 7,
    subjects: [() => 'Payment debited twice on eDukaan order', (x) => `Refund not received for cancelled order ${x.ord}`],
    body: (x) => `Dear eDukaan team,\n\nPayment for order ${x.ord} was debited twice from our current account. Bank statement attached. Please refund the duplicate amount.\n\nRegards`,
    transcript: 'payment_twice',
    entities: (x) => ({ orderId: x.ord }),
  },
  {
    desk: 'edukaan',
    category: 'Portal access',
    intent: 'Login issue',
    weight: 6,
    subjects: [() => 'Unable to log in to the eDukaan retailer portal', () => 'OTP not received on eDukaan login'],
    body: () => `Hi,\n\nI am unable to log in to the eDukaan retailer portal since yesterday. The OTP does not arrive on my registered number.\n\nPlease help.`,
    transcript: 'portal_login',
  },
  {
    desk: 'edukaan',
    category: 'Order & dispatch',
    intent: 'Order status',
    weight: 7,
    subjects: [(x) => `Order ${x.ord} stuck in processing`, (x) => `Tracking number not updating for ${x.ord}`],
    body: (x) => `Hello,\n\nMy eDukaan order ${x.ord} shows "Processing" for 4 days and the tracking link does not open. Please check.\n\nThanks`,
    transcript: 'dispatch_generic',
    entities: (x) => ({ orderId: x.ord }),
  },
  {
    desk: 'loyalty',
    category: 'Loyalty points',
    intent: 'Points not credited',
    weight: 10,
    subjects: [(x) => `Loyalty points not credited for invoice ${x.inv}`, () => 'Points balance enquiry'],
    body: (x) => `Namaste,\n\nPoints for my purchase on invoice ${x.inv} are not showing in the loyalty app.\n\nPlease credit them.`,
    transcript: 'points_balance',
    entities: (x) => ({ invoice: x.inv }),
  },
  {
    desk: 'loyalty',
    category: 'Loyalty points',
    intent: 'Redemption',
    weight: 7,
    subjects: [(x) => `Redemption request for ${x.pts.toLocaleString('en-IN')} points pending`, () => 'Gift voucher not received after redemption'],
    body: () => `Hello,\n\nI redeemed points for a voucher last week but have not received it yet.\n\nPlease check.`,
    transcript: 'points_balance',
  },
  {
    desk: 'loyalty',
    category: 'Loyalty points',
    intent: 'Registration',
    weight: 5,
    subjects: [() => 'Mechanic registration on loyalty app failed', () => 'Tier upgrade not reflected after Q2 purchases'],
    body: () => `Hi,\n\nRegistration on the loyalty app fails at the KYC step with an error.\n\nThanks`,
    transcript: 'points_balance',
  },
];

const CHANNEL_MIX: Record<Desk, [Channel, number][]> = {
  helpline: [
    ['email', 60],
    ['teams', 15],
    ['phone', 8],
    ['whatsapp', 11],
    ['webchat', 3],
    ['app', 3],
  ],
  edukaan: [
    ['phone', 36],
    ['email', 30],
    ['webchat', 18],
    ['whatsapp', 11],
    ['teams', 5],
  ],
  loyalty: [
    ['phone', 52],
    ['whatsapp', 26],
    ['app', 16],
    ['email', 6],
  ],
};

/** Delays, wrong parts and money issues frustrate customers; information requests rarely do. */
const SENTIMENT_MIX: Record<string, [Sentiment, number][]> = {
  'Order & dispatch': [['negative', 48], ['neutral', 42], ['positive', 10]],
  'Wrong / damaged part': [['negative', 55], ['neutral', 38], ['positive', 7]],
  'Payment & refund': [['negative', 50], ['neutral', 40], ['positive', 10]],
  'Loyalty points': [['negative', 30], ['neutral', 50], ['positive', 20]],
  Warranty: [['negative', 34], ['neutral', 52], ['positive', 14]],
  'Portal access': [['negative', 22], ['neutral', 60], ['positive', 18]],
  'Part supersession': [['negative', 12], ['neutral', 66], ['positive', 22]],
  Pricing: [['negative', 10], ['neutral', 64], ['positive', 26]],
  'Invoice & GST': [['negative', 14], ['neutral', 62], ['positive', 24]],
  Availability: [['negative', 18], ['neutral', 60], ['positive', 22]],
};

const NOTES = [
  'Checked with warehouse on Teams; awaiting confirmation from transporter.',
  'Customer is a high-value account. Keep the regional manager informed.',
  'Similar issue seen last week for the same part; possible catalogue mapping error.',
  'Called customer, no answer. Will retry after lunch.',
  'Asked the PLM team to confirm interchangeability.',
];

const REPLIES = [
  'Thank you for reaching out. We have checked your request and are coordinating with the concerned team. You will receive an update within the committed timeline.',
  'We have verified the details in SAP and shared the next steps below. Please let us know if anything else is needed.',
  'Apologies for the inconvenience. A replacement has been initiated and the pickup of the incorrect part is scheduled.',
];

function makeCtx(rng: Rng): Ctx {
  return {
    ord: `ED-55${rng.int(1000, 9899)}`,
    inv: `INV-2026-4${rng.int(1000, 4999)}`,
    part: rng.pick(PARTS),
    seg: rng.pick(SEGMENTS),
    city: rng.pick(CITIES).city,
    wh: rng.pick(WAREHOUSES),
    pts: rng.int(5, 40) * 100,
    claim: `WC-2${rng.int(1000, 9999)}`,
  };
}

let iid = 0;
/** The reset moment; every relative time in the seed derives from it so resets are identical. */
let seedNow = 0;
const nid = () => `i${(++iid).toString(36)}`;

interface TicketSpec {
  createdAt: number;
  hero?: string;
  build: (id: string) => Ticket;
}

function buildTickets(rng: Rng, now: number, customers: Customer[], agents: Agent[], heroes: Record<string, string>) {
  const specs: TicketSpec[] = [];
  const deskWeights: [Desk, number][] = [
    ['helpline', 55],
    ['edukaan', 20],
    ['loyalty', 25],
  ];
  const custByDesk = (desk: Desk) =>
    customers.filter((c) => {
      if (desk === 'loyalty') return !!c.loyaltyId;
      if (desk === 'edukaan') return c.type === 'retailer' || c.type === 'garage' || c.type === 'fleet' || c.type === 'dealer';
      return c.type !== 'loyalty';
    });
  const deskAgents = (desk: Desk) => agents.filter((a) => a.desk === desk && a.role === 'agent');
  const heroIds = new Set(Object.values(heroes));

  const RANDOM_COUNT = 315; // + 5 hand-made storyline tickets = 320
  for (let i = 0; i < RANDOM_COUNT; i++) {
    const desk = rng.weighted(deskWeights);
    const tpl = rng.weighted(TEMPLATES.filter((t) => t.desk === desk).map((t) => [t, t.weight] as [Template, number]));
    const pool = custByDesk(desk).filter((c) => !heroIds.has(c.id));
    const cust = rng.pick(pool);
    const x = makeCtx(rng);
    const ageMs = Math.pow(rng.next(), 1.3) * 30 * DAY;
    let createdAt = now - ageMs;
    if (ageMs > DAY) {
      const d = new Date(createdAt);
      if (d.getHours() < 8 || d.getHours() > 19) d.setHours(rng.int(9, 18), rng.int(0, 59));
      createdAt = Math.min(d.getTime(), now - DAY);
    }
    const channel = rng.weighted(CHANNEL_MIX[desk]);
    const priority = rng.weighted<Priority>([
      ['P1', 8],
      ['P2', 22],
      ['P3', 45],
      ['P4', 25],
    ]);
    const ageDays = (now - createdAt) / DAY;
    let status: Status;
    if (ageDays < 1) status = rng.weighted<Status>([['new', 24], ['open', 44], ['pending', 10], ['awaiting', 10], ['resolved', 12]]);
    else if (ageDays < 3) status = rng.weighted<Status>([['open', 30], ['pending', 14], ['awaiting', 14], ['resolved', 26], ['closed', 16]]);
    else status = rng.weighted<Status>([['open', 1.2], ['resolved', 8], ['closed', 90.8]]);

    const subjectFn = rng.pick(tpl.subjects);
    const subject = subjectFn(x);
    const rand = {
      ack: rng.int(19, 57),
      respondH: 0.3 + rng.next() * 3,
      resolveFrac: rng.next(),
      breachClosed: rng.chance(0.026),
      ai: rng.chance(0.58),
      fcr: rng.chance(0.62),
      csat: rng.chance(0.7) ? rng.weighted<number>([[5, 63], [4, 27], [3, 7], [2, 2], [1, 1]]) : undefined,
      reopened: rng.chance(0.03),
      openState: rng.weighted<'on' | 'risk' | 'breach'>([['on', 77], ['risk', 15], ['breach', 8]]),
      c: rng.next(),
      assign: rng.chance(status === 'new' ? 0.4 : 0.92),
      agentPick: rng.next(),
      note: rng.chance(0.3),
      noteText: rng.pick(NOTES),
      reply: rng.pick(REPLIES),
      transfer: rng.chance(0.07),
      callSec: rng.int(140, 520),
      sentiment: rng.weighted<Sentiment>(SENTIMENT_MIX[tpl.category] ?? [['neutral', 55], ['negative', 28], ['positive', 17]]),
      waMedia: rng.chance(0.35),
    };

    specs.push({
      createdAt,
      build: (id) =>
        assembleTicket({
          id,
          now,
          createdAt,
          desk,
          tpl,
          x,
          subject,
          cust,
          channel,
          priority,
          status,
          rand,
          agents: deskAgents(desk),
          allAgents: agents,
        }),
    });
  }

  // Hero tickets: hand-tuned for the demo storyline.
  const heroSpec = (hero: string, createdAt: number, build: (id: string) => Ticket) => specs.push({ hero, createdAt, build });
  const rajesh = customers.find((c) => c.id === heroes.rajesh)!;
  const kavita = customers.find((c) => c.id === heroes.kavita)!;
  const suresh = customers.find((c) => c.id === heroes.suresh)!;
  const rohan = agents.find((a) => a.name === 'Rohan Mehta')!;
  const neha = agents.find((a) => a.name === 'Neha Gupta')!;

  const rajeshCreated = now - 3 * DAY - 2 * HOUR;
  heroSpec('rajesh_email', rajeshCreated, (id) => {
    const sla = slaFor('P2', rajeshCreated, 0.62);
    return {
      id,
      subject: 'Brake pad PRT-27014-BRK not delivered against order ED-558210',
      customerId: rajesh.id,
      desk: 'helpline',
      channel: 'email',
      priority: 'P2',
      status: 'open',
      category: 'Order & dispatch',
      intent: 'Dispatch delay',
      assigneeId: rohan.id,
      createdAt: rajeshCreated,
      updatedAt: now - 5 * HOUR,
      ackSec: 34,
      sla: { ...sla, respondedAt: rajeshCreated + 2 * HOUR },
      tags: ['Repeat contact', 'Vehicle off road'],
      linkedIds: [],
      escalationLevel: 0,
      sentiment: 'negative',
      region: 'West',
      entities: { orderId: 'ED-558210', partNo: 'PRT-27014-BRK', invoice: 'INV-2026-44790' },
      interactions: [
        ev(rajeshCreated, 'created', 'Ticket auto-created from Email (Microsoft 365)', 'Auto-created'),
        ev(rajeshCreated + 34_000, 'ack', 'Acknowledgement email sent in 34 s'),
        {
          id: nid(),
          type: 'email',
          at: rajeshCreated,
          direction: 'in',
          author: 'Rajesh Patil',
          subject: 'Brake pad PRT-27014-BRK not delivered against order ED-558210',
          body:
            'Dear Parts Team,\n\nWe placed eDukaan order ED-558210 for 40 brake pad sets (PRT-27014-BRK) five days back. Payment is done and the order shows confirmed, but nothing has been dispatched.\n\nTwo of our fleet customers have vehicles waiting. Please share the dispatch date urgently.\n\nRegards,\nRajesh Patil\nShree Ganesh Auto Spares, Pune',
        },
        ev(rajeshCreated + 40 * MIN, 'assigned', 'Assigned to Rohan M. by routing rule "Dispatch queries → Helpline"'),
        {
          id: nid(),
          type: 'email',
          at: rajeshCreated + 2 * HOUR,
          direction: 'out',
          author: 'Rohan M.',
          subject: 'Re: Brake pad PRT-27014-BRK not delivered against order ED-558210',
          body: 'Dear Rajesh ji,\n\nThank you for writing in. We are checking the dispatch status with the Pune warehouse and will update you shortly.\n\nRegards,\nRohan M.\nParts Helpline',
        },
        {
          id: nid(),
          type: 'teams',
          at: rajeshCreated + 5 * HOUR,
          direction: 'out',
          author: 'Rohan M.',
          body: '@Pune WH ops: can you confirm pickup for ED-558210? Customer escalating.',
        },
        { id: nid(), type: 'note', at: now - 5 * HOUR, author: 'Rohan M.', body: 'Warehouse says stock allocated, transporter slot not confirmed. This is an eDukaan order; may need eDukaan desk to own it.' },
      ],
    };
  });

  const rajesh2 = now - 6 * DAY;
  heroSpec('rajesh_old', rajesh2, (id) => ({
    id,
    subject: 'Oil filter order ED-557981 delivery confirmation',
    customerId: rajesh.id,
    desk: 'edukaan',
    channel: 'whatsapp',
    priority: 'P4',
    status: 'closed',
    category: 'Order & dispatch',
    intent: 'Order status',
    assigneeId: agents.find((a) => a.name === 'Aditi Sharma')!.id,
    createdAt: rajesh2,
    updatedAt: rajesh2 + 3 * HOUR,
    resolvedAt: rajesh2 + 3 * HOUR,
    ackSec: 22,
    sla: { ...slaFor('P4', rajesh2, 0.1), respondedAt: rajesh2 + 20 * MIN },
    tags: [],
    linkedIds: [],
    escalationLevel: 0,
    sentiment: 'neutral',
    region: 'West',
    aiResolved: true,
    fcr: true,
    csat: 4,
    interactions: [
      ev(rajesh2, 'created', 'Ticket auto-created from WhatsApp', 'Auto-created'),
      { id: nid(), type: 'whatsapp', at: rajesh2, direction: 'in', author: 'Rajesh Patil', body: 'ED-557981 delivered? Tracking not opening' },
      { id: nid(), type: 'whatsapp', at: rajesh2 + 20_000, direction: 'out', author: 'BizSensAi bot', body: 'Order ED-557981 was delivered on ' + new Date(rajesh2 - DAY).toLocaleDateString('en-IN') + '. Proof of delivery attached.', media: 'POD_ED-557981.pdf' },
      ev(rajesh2 + 3 * HOUR, 'resolved_ai', 'Resolved by AI self-service (WhatsApp bot)'),
    ],
  }));

  const k1 = now - 7 * HOUR;
  const k2 = now - 3 * HOUR - 20 * MIN;
  for (const [key, at, channel] of [
    ['kavita_a', k1, 'email'],
    ['kavita_b', k2, 'teams'],
  ] as const) {
    heroSpec(key, at, (id) => ({
      id,
      subject: key === 'kavita_a' ? 'Invoice copy needed for INV-2026-44310 (GST filing)' : 'Need GST invoice INV-2026-44310 copy urgently',
      customerId: kavita.id,
      desk: 'helpline',
      channel,
      priority: 'P3',
      status: key === 'kavita_a' ? 'open' : 'new',
      category: 'Invoice & GST',
      intent: 'Invoice copy',
      assigneeId: key === 'kavita_a' ? neha.id : undefined,
      createdAt: at,
      updatedAt: at,
      ackSec: 41,
      sla: slaFor('P3', at, key === 'kavita_a' ? 0.28 : 0.12),
      tags: [],
      linkedIds: [],
      escalationLevel: 0,
      sentiment: 'neutral',
      region: 'Central',
      entities: { invoice: 'INV-2026-44310' },
      interactions: [
        ev(at, 'created', `Ticket auto-created from ${CHANNELS[channel].label}`, 'Auto-created'),
        {
          id: nid(),
          type: channel,
          at,
          direction: 'in',
          author: 'Kavita Deshmukh',
          subject: channel === 'email' ? 'Invoice copy needed for INV-2026-44310 (GST filing)' : undefined,
          body:
            channel === 'email'
              ? 'Hello,\n\nPlease send a copy of tax invoice INV-2026-44310. Our CA needs it before the GSTR-2B reconciliation.\n\nThanks,\nKavita Deshmukh\nMahalaxmi Automobiles, Nagpur'
              : 'Hi team, need GST invoice INV-2026-44310 copy today please. Our CA is waiting.',
        },
      ],
    }));
  }

  const s0 = now - 9 * DAY;
  heroSpec('suresh_old', s0, (id) => ({
    id,
    subject: 'Alternator PRT-44102-ALT failure within 2 months: warranty claim WC-20931',
    customerId: suresh.id,
    desk: 'helpline',
    channel: 'email',
    priority: 'P3',
    status: 'closed',
    category: 'Warranty',
    intent: 'Warranty claim',
    assigneeId: agents.find((a) => a.name === 'Priya Nair')!.id,
    createdAt: s0,
    updatedAt: s0 + 2 * DAY,
    resolvedAt: s0 + 2 * DAY,
    ackSec: 29,
    sla: { ...slaFor('P3', s0, 0.1), respondedAt: s0 + 3 * HOUR },
    tags: ['Warranty'],
    linkedIds: [],
    escalationLevel: 0,
    sentiment: 'neutral',
    region: 'South',
    fcr: false,
    csat: 4,
    interactions: [
      ev(s0, 'created', 'Ticket auto-created from Email (Microsoft 365)', 'Auto-created'),
      { id: nid(), type: 'email', at: s0, direction: 'in', author: 'Suresh Iyer', subject: 'Alternator failure: warranty claim WC-20931', body: 'Claim WC-20931 filed in IPMS for alternator PRT-44102-ALT. Please process.' },
      { id: nid(), type: 'email', at: s0 + 3 * HOUR, direction: 'out', author: 'Priya N.', body: 'Claim registered and sent for technical review. Expected decision in 7 working days.' },
      ev(s0 + 2 * DAY, 'status', 'Status changed to Closed (claim registered)'),
    ],
  }));

  specs.sort((a, b) => a.createdAt - b.createdAt);
  const heroTickets: Record<string, string> = {};
  const tickets = specs.map((s, i) => {
    const id = `TM-${10101 + i}`;
    if (s.hero) heroTickets[s.hero] = id;
    return s.build(id);
  });
  // Link the two Rajesh tickets so "contacted 3 times" has history behind it.
  const rj = tickets.find((t) => t.id === heroTickets.rajesh_email)!;
  rj.linkedIds = [heroTickets.rajesh_old];
  calibrateAiResolution(tickets, new Set(Object.values(heroTickets)));
  return { tickets, heroTickets, nextNo: 10101 + tickets.length };
}

const AI_TARGET = 0.34;
const AI_ELIGIBLE = new Set(['Points not credited', 'Redemption', 'Registration', 'Order status', 'Dispatch delay', 'Invoice copy', 'Login issue']);

/**
 * Per-ticket coin flips make the AI-resolution KPI swing with the reset hour.
 * Flip the flag on just enough eligible tickets to land on the target every time.
 */
function calibrateAiResolution(tickets: Ticket[], heroIds: Set<string>) {
  const done = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed');
  const target = Math.round(done.length * AI_TARGET);
  let current = done.filter((t) => t.aiResolved).length;
  const flippable = done.filter((t) => !heroIds.has(t.id) && AI_ELIGIBLE.has(t.intent));
  const setAi = (t: Ticket, on: boolean) => {
    t.aiResolved = on;
    t.tags = on ? ['Self-service'] : t.tags.filter((x) => x !== 'Self-service');
    if (on) t.fcr = true;
    const closing = t.interactions.find((i) => i.type === 'event' && (i.eventKind === 'resolved_ai' || (i.eventKind === 'status' && i.at === t.resolvedAt)));
    if (closing) {
      closing.eventKind = on ? 'resolved_ai' : 'status';
      closing.body = on ? 'Resolved by AI self-service' : `Status changed to ${t.status === 'closed' ? 'Closed' : 'Resolved'}`;
    }
  };
  for (const t of flippable) {
    if (current === target) break;
    if (current < target && !t.aiResolved) {
      setAi(t, true);
      current++;
    } else if (current > target && t.aiResolved) {
      setAi(t, false);
      current--;
    }
  }
}

function ev(at: number, kind: NonNullable<Interaction['eventKind']>, body: string, chip?: string): Interaction {
  return { id: nid(), type: 'event', at, eventKind: kind, body, chip };
}

/** Builds an SLA whose wall-clock window gives the wanted consumption right now. */
function slaFor(priority: Priority, createdAt: number, consumedNow: number, now = seedNow) {
  const p = policyFor(priority, DEFAULT_POLICIES);
  const elapsed = Math.max(now - createdAt, 30 * MIN);
  const span = elapsed / Math.max(consumedNow, 0.02);
  return {
    startAt: createdAt,
    responseDueAt: createdAt + span * (p.responseH / p.resolutionH),
    resolutionDueAt: createdAt + span,
    pausedMs: 0,
  };
}

interface AssembleArgs {
  id: string;
  now: number;
  createdAt: number;
  desk: Desk;
  tpl: Template;
  x: Ctx;
  subject: string;
  cust: Customer;
  channel: Channel;
  priority: Priority;
  status: Status;
  agents: Agent[];
  allAgents: Agent[];
  rand: {
    ack: number;
    respondH: number;
    resolveFrac: number;
    breachClosed: boolean;
    ai: boolean;
    fcr: boolean;
    csat?: number;
    reopened: boolean;
    openState: 'on' | 'risk' | 'breach';
    c: number;
    assign: boolean;
    agentPick: number;
    note: boolean;
    noteText: string;
    reply: string;
    transfer: boolean;
    callSec: number;
    sentiment: Sentiment;
    waMedia: boolean;
  };
}

function assembleTicket(a: AssembleArgs): Ticket {
  const { id, now, createdAt, desk, tpl, x, subject, cust, channel, priority, rand } = a;
  let status = a.status;
  const p = policyFor(priority);
  const open = !['resolved', 'closed'].includes(status);
  const ageDays = (now - createdAt) / DAY;
  const agent = rand.assign && a.agents.length ? a.agents[Math.floor(rand.agentPick * a.agents.length)] : undefined;
  const short = agent ? agentShort(agent.name) : 'BizSensAi bot';

  // SLA
  let sla;
  let escalationLevel = 0;
  if (open) {
    let state = rand.openState;
    if (ageDays > 3) state = 'breach';
    if (state === 'breach') {
      // Overdue by 0.4–7 h: realistic for a desk that escalates, and keeps timers readable.
      const overdue = Math.min((0.4 + rand.c * 6.6) * HOUR, (now - createdAt) * 0.4);
      const due = now - overdue;
      sla = { startAt: createdAt, responseDueAt: createdAt + (due - createdAt) * (p.responseH / p.resolutionH), resolutionDueAt: due, pausedMs: 0 };
      escalationLevel = escalationLevelFor(sla, now);
    } else {
      sla = slaFor(priority, createdAt, state === 'on' ? 0.08 + rand.c * 0.55 : 0.78 + rand.c * 0.18, now);
      if (state === 'risk') escalationLevel = 1;
    }
    if (state === 'risk' || state === 'breach') (sla as { warned?: boolean }).warned = true;
  } else {
    // Wall-clock window ~1.6× the business-hour policy.
    const span = p.resolutionH * 1.6 * HOUR;
    sla = { startAt: createdAt, responseDueAt: createdAt + span * (p.responseH / p.resolutionH), resolutionDueAt: createdAt + span, pausedMs: 0 };
  }
  const respondedAt = status === 'new' ? undefined : Math.min(createdAt + rand.respondH * HOUR, now - 5 * MIN);
  let resolvedAt: number | undefined;
  if (!open) {
    const span = sla.resolutionDueAt - createdAt;
    resolvedAt = rand.breachClosed ? sla.resolutionDueAt + (0.1 + rand.resolveFrac) * 6 * HOUR : createdAt + span * (0.15 + rand.resolveFrac * 0.75);
    if (resolvedAt > now - 10 * MIN) {
      resolvedAt = now - 10 * MIN;
      if (status === 'closed') status = 'resolved';
    }
  }
  const aiResolved = !open && rand.ai && (desk === 'loyalty' || tpl.intent === 'Order status' || tpl.intent === 'Dispatch delay' || tpl.intent === 'Invoice copy' || tpl.intent === 'Login issue');

  const it: Interaction[] = [];
  it.push(ev(createdAt, 'created', `Ticket auto-created from ${CHANNELS[channel].label}${channel === 'email' ? ' (Microsoft 365)' : channel === 'phone' ? ' (TTSL Smartflo)' : ''}`, 'Auto-created'));
  it.push(ev(createdAt + rand.ack * 1000, 'ack', `Acknowledgement sent via ${channel === 'email' ? 'email' : 'WhatsApp'} in ${rand.ack} s`));

  const cname = cust.name;
  switch (channel) {
    case 'email':
      it.push({ id: nid(), type: 'email', at: createdAt, direction: 'in', author: cname, subject, body: tpl.body(x) + `\n${cname}\n${cust.company}, ${cust.city}` });
      break;
    case 'phone': {
      const tr = SEED_TRANSCRIPTS[tpl.transcript];
      it.push({
        id: nid(),
        type: 'call',
        at: createdAt,
        direction: 'in',
        author: cname,
        call: {
          durationSec: rand.callSec,
          ivrPath: ['Hindi', desk === 'helpline' ? '1 → Parts Helpline' : desk === 'edukaan' ? '2 → eDukaan' : '3 → Loyalty', 'Talk to an agent'],
          recording: true,
          transcriptKey: tpl.transcript,
          summary: tr.summary,
          language: 'Hinglish',
        },
      });
      break;
    }
    case 'whatsapp':
      it.push({ id: nid(), type: 'whatsapp', at: createdAt, direction: 'in', author: cname, body: subject });
      it.push({
        id: nid(),
        type: 'whatsapp',
        at: createdAt + 40_000,
        direction: 'in',
        author: cname,
        body: rand.waMedia ? 'Photo of the part label attached.' : 'Please check urgently.',
        media: rand.waMedia ? 'IMG_part_label.jpg' : undefined,
      });
      break;
    case 'webchat':
      it.push({ id: nid(), type: 'webchat', at: createdAt, direction: 'in', author: cname, body: `${subject}. Bot could not answer, requested an agent.` });
      break;
    case 'teams':
      it.push({ id: nid(), type: 'teams', at: createdAt, direction: 'in', author: cname, body: `${subject}. Can someone from the Parts team check?` });
      break;
    case 'app':
      it.push({ id: nid(), type: 'app', at: createdAt, direction: 'in', author: cname, body: `${subject} (raised from the mobile app)` });
      break;
  }

  if (agent) it.push(ev(createdAt + 4 * MIN, 'assigned', `Assigned to ${short} (least-loaded, skill: ${agent.skills[0]})`));
  if (respondedAt) {
    const outType = channel === 'phone' || channel === 'app' ? 'whatsapp' : channel;
    it.push({ id: nid(), type: outType as Interaction['type'], at: respondedAt, direction: 'out', author: aiResolved ? 'BizSensAi bot' : short, body: rand.reply, subject: channel === 'email' ? `Re: ${subject}` : undefined });
  }
  if (rand.note && agent) it.push({ id: nid(), type: 'note', at: (respondedAt ?? createdAt) + 30 * MIN, author: short, body: rand.noteText });

  let transfer: Ticket['transfer'];
  if (rand.transfer && desk !== 'helpline' && agent && respondedAt) {
    transfer = { fromDesk: 'helpline', by: 'Vikram J.', at: createdAt + 20 * MIN, note: 'Belongs with ' + (desk === 'edukaan' ? 'eDukaan' : 'Loyalty') + ' desk.' };
    it.push(ev(transfer.at, 'transferred', `Transferred from Parts Helpline to ${desk === 'edukaan' ? 'eDukaan' : 'Loyalty'} by Vikram J. History kept.`));
  }
  if (escalationLevel >= 1) it.push(ev(sla.startAt + (sla.resolutionDueAt - sla.startAt) * 0.75, 'sla_warning', `SLA 75% warning sent to ${agent ? short : 'queue owner'}`));
  if (escalationLevel >= 2) it.push(ev(sla.resolutionDueAt, 'escalated', 'SLA breached: escalated to supervisor Anita R.', 'Escalation L2'));
  if (escalationLevel >= 3) it.push(ev(sla.resolutionDueAt + 4 * HOUR, 'escalated', 'Breach + 4 h: escalated to manager Sanjay K.', 'Escalation L3'));

  if (!open && resolvedAt) {
    if (aiResolved) it.push(ev(resolvedAt, 'resolved_ai', 'Resolved by AI self-service'));
    else it.push(ev(resolvedAt, 'status', `Status changed to ${status === 'closed' ? 'Closed' : 'Resolved'} by ${short}`));
    if (rand.csat && status === 'closed') it.push(ev(resolvedAt + 2 * HOUR, 'csat', `CSAT survey on WhatsApp: ${rand.csat}/5`));
  }

  const cust_region = CITIES.find((c) => c.city === cust.city)?.region ?? 'West';
  return {
    id,
    subject,
    customerId: cust.id,
    desk,
    channel,
    priority,
    status,
    category: tpl.category,
    intent: tpl.intent,
    assigneeId: agent?.id,
    createdAt,
    updatedAt: Math.max(...it.map((i) => i.at)),
    ackSec: rand.ack,
    resolvedAt,
    sla: { ...sla, respondedAt },
    tags: aiResolved ? ['Self-service'] : [],
    linkedIds: [],
    interactions: it.sort((p1, p2) => p1.at - p2.at),
    aiResolved,
    fcr: !open ? rand.fcr || aiResolved : undefined,
    reopened: !open && rand.reopened,
    csat: status === 'closed' ? rand.csat : undefined,
    escalationLevel,
    transfer,
    entities: tpl.entities?.(x),
    sentiment: rand.sentiment,
    region: cust_region,
    breachRisk:
      open && rand.openState === 'on' && rand.c > 0.42 && priority !== 'P4'
        ? rand.c > 0.5
          ? 'Assignee has 9 open tickets; similar tickets took 2.3× longer'
          : 'Waiting on warehouse reply; average turnaround 6 h'
        : undefined,
  };
}

// ───────────────────────────── KB ─────────────────────────────

const KB_DEFS: [string, string, Agent['desk'], string, string[]][] = [
  ['Returns and replacement policy for wrong or damaged parts', 'Wrong / damaged part', 'helpline', 'Wrong or damaged parts can be returned within 15 days of delivery with photos of the label and part.', ['Collect photos of the box label and part', 'Raise return in SAP (movement type 122)', 'Schedule pickup with the transporter', 'Dispatch replacement on pickup confirmation']],
  ['How to track an eDukaan order', 'Order & dispatch', 'edukaan', 'Order status and tracking are available in the eDukaan Admin Portal and on WhatsApp.', ['Search order ID in eDukaan Admin', 'Check SAP delivery document', 'Share tracking link on WhatsApp']],
  ['Loyalty points earning and credit rules', 'Loyalty points', 'loyalty', 'Points are credited within 72 hours of invoice posting; batch runs at 02:00 daily.', ['Verify invoice in Loyalty CRM', 'Check batch status', 'Manually credit if batch failed > 72 h', 'Notify member on WhatsApp']],
  ['Handling part supersession queries', 'Part supersession', 'helpline', 'Use PLM to find the superseding part and interchangeability code.', ['Search old part in PLM', 'Check interchangeability (one-way / two-way)', 'Share new part number and price']],
  ['Duplicate payment and refund process', 'Payment & refund', 'edukaan', 'Duplicate debits are auto-reversed by the gateway in 5–7 working days.', ['Find both transactions in gateway', 'Mark duplicate and initiate refund', 'Share refund reference (ARN)']],
  ['GST invoice copy request', 'Invoice & GST', 'helpline', 'Invoice copies can be regenerated from SAP and sent as PDF on email or WhatsApp.', ['Verify GSTIN of requester', 'Download PDF from SAP (VF03)', 'Send via email or WhatsApp template']],
  ['eDukaan retailer portal login and OTP issues', 'Portal access', 'edukaan', 'Most OTP failures are due to an outdated registered mobile number.', ['Verify retailer code', 'Update mobile in eDukaan Admin', 'Send reset link']],
  ['Warranty claim lifecycle in IPMS', 'Warranty', 'helpline', 'Claims move from Submitted → Technical review → Approved/Rejected → Credit note.', ['Look up claim in IPMS', 'Check pending stage owner', 'Send reminder if > 7 days']],
  ['Dispatch delay escalation to warehouse', 'Order & dispatch', 'helpline', 'Escalate when dispatch exceeds 72 h after confirmation.', ['Check SAP allocation', 'Raise warehouse task', 'Update customer with ETA']],
  ['Loyalty redemption and voucher delivery', 'Loyalty points', 'loyalty', 'Vouchers are issued within 5 working days of redemption.', ['Check redemption status', 'Resend voucher code', 'Escalate to vendor if not issued']],
  ['Mechanic registration and KYC on the loyalty app', 'Loyalty points', 'loyalty', 'KYC requires Aadhaar-masked ID and workshop photo.', ['Verify documents', 'Approve in CRM', 'Send welcome message']],
  ['Price list circulars and effective dates', 'Pricing', 'helpline', 'Quarterly price lists are published on the dealer portal on the 1st of the quarter.', ['Share latest circular', 'Explain effective date', 'Raise price mismatch if invoice differs']],
  ['Short supply against invoice', 'Wrong / damaged part', 'helpline', 'Short supply must be reported within 48 hours with the packing list.', ['Compare packing list vs invoice', 'Raise shortage claim', 'Dispatch balance quantity']],
  ['Back-order ETA communication', 'Availability', 'helpline', 'Back-order ETAs come from SAP ATP; communicate the range, not a single date.', ['Check ATP in SAP', 'Share ETA range', 'Set follow-up task']],
  ['Tier upgrade rules (Silver, Gold, Platinum)', 'Loyalty points', 'loyalty', 'Tiers are recalculated quarterly on rolling 12-month purchases.', ['Check purchase total', 'Explain next recalculation date']],
  ['Order cancellation on eDukaan', 'Order & dispatch', 'edukaan', 'Orders can be cancelled before packing; refund follows in 5–7 days.', ['Check status is Processing', 'Cancel in eDukaan Admin', 'Confirm refund timeline']],
  ['Damaged in transit: transporter claim', 'Wrong / damaged part', 'helpline', 'Transit damage must be noted on the LR copy at delivery.', ['Collect LR with remark', 'Raise transporter claim', 'Dispatch replacement']],
  ['Stock availability check across warehouses', 'Availability', 'helpline', 'Use SAP MMBE to check stock across plants.', ['Search part in MMBE', 'Suggest nearest warehouse', 'Offer inter-warehouse transfer']],
  ['Credit note status for warranty', 'Warranty', 'helpline', 'Credit notes are issued within 3 working days of claim approval.', ['Check approval date', 'Look up credit note in SAP', 'Share copy']],
  ['Callback scheduling for after-hours calls', 'General', 'all', 'The voice bot schedules callbacks from 9:30 am the next working day.', ['Review callback queue at 9:00', 'Call in priority order', 'Update ticket']],
  ['Using WhatsApp templates', 'General', 'all', 'Approved templates can be sent outside the 24-hour window.', ['Pick template', 'Fill variables', 'Send and log']],
  ['Transferring tickets between desks', 'General', 'all', 'Transfers keep the full history so the customer does not repeat the issue.', ['Click Transfer', 'Pick desk and agent', 'Add a handover note']],
  ['eDukaan COD and payment modes', 'Payment & refund', 'edukaan', 'Supported: UPI, net banking, credit line; COD for select pin codes.', ['Check pin code eligibility', 'Explain credit line process']],
  ['Points reversal on returns', 'Loyalty points', 'loyalty', 'Points earned on returned invoices are reversed automatically.', ['Check return invoice', 'Explain reversal in ledger']],
  ['Fleet owner bulk order support', 'Order & dispatch', 'helpline', 'Bulk orders above ₹5 lakh get a dedicated coordinator.', ['Tag as bulk', 'Assign coordinator', 'Share delivery plan']],
  ['Genuine parts verification (QR code)', 'Warranty', 'helpline', 'Every genuine part has a QR label that can be verified on the app.', ['Ask for QR photo', 'Verify on app', 'Report counterfeit if invalid']],
  ['Address change for deliveries', 'Order & dispatch', 'edukaan', 'Delivery address can be changed before packing.', ['Verify identity', 'Update address', 'Confirm on WhatsApp']],
  ['Handling abusive or escalated callers', 'General', 'all', 'Stay calm, acknowledge, and offer a supervisor callback.', ['Acknowledge', 'Offer supervisor callback', 'Log sentiment']],
  ['Teams channel etiquette for internal escalations', 'General', 'all', 'Use the #parts-escalations channel with the ticket ID in the first line.', ['Mention ticket ID', 'Tag owner team', 'Update ticket when answered']],
  ['Part number format and lookup', 'Part supersession', 'helpline', 'Part numbers follow PRT-NNNNN-XXX. Use PLM for legacy numbers.', ['Normalise format', 'Search PLM', 'Share the result']],
  ['Invoice correction requests', 'Invoice & GST', 'helpline', 'Corrections need a credit note and re-invoice.', ['Validate error', 'Raise credit note', 'Re-invoice']],
  ['Loyalty app OTP issues', 'Loyalty points', 'loyalty', 'Ask the member to update the app and retry after 2 minutes.', ['Verify number', 'Resend OTP', 'Escalate to CRM IT if repeated']],
  ['Pickup scheduling for returns', 'Wrong / damaged part', 'helpline', 'Pickups are booked through the transporter portal within 48 h.', ['Book pickup', 'Share docket number']],
  ['Self-service options for customers', 'General', 'all', 'Customers can track orders, check points and download invoices on WhatsApp 24×7.', ['Share WhatsApp number', 'Explain menu options']],
  ['Bulk order cancellation and partial dispatch', 'Order & dispatch', 'edukaan', 'Partially dispatched orders can be cancelled only for the undispatched lines.', ['Check dispatched lines in SAP', 'Cancel remaining lines in eDukaan Admin', 'Confirm partial refund']],
];

function buildKb(rng: Rng, now: number): KBArticle[] {
  const items: KBArticle[] = KB_DEFS.map(([title, category, desk, summary, steps], i) => ({
    id: `KB-${String(101 + i)}`,
    title,
    category,
    desk,
    summary,
    steps,
    views: rng.int(40, 1900),
    helpful: rng.int(72, 98),
    updated: now - rng.int(2, 120) * DAY,
  }));
  items.push({
    id: 'KB-201',
    title: 'How to request a GST invoice copy on WhatsApp',
    category: 'Invoice & GST',
    desk: 'all',
    summary: 'Customers can get an invoice copy in under a minute by sending "INVOICE <number>" on WhatsApp. Agents can trigger the same from the copilot.',
    steps: ['Verify the requester GSTIN matches the invoice', 'Send WhatsApp template "invoice_copy" with the invoice number', 'If older than 18 months, raise an SAP archive request'],
    views: 0,
    helpful: 0,
    updated: now - 2 * HOUR,
    draft: true,
    sourceCount: 12,
  });
  items.push({
    id: 'KB-202',
    title: 'Resolving loyalty credits stuck after a batch run',
    category: 'Loyalty points',
    desk: 'loyalty',
    summary: 'When the 02:00 batch fails, invoices stay in "pending batch". Agents can credit manually after verifying the invoice in SAP.',
    steps: ['Check invoice posting date in SAP', 'Confirm ledger shows "Pending batch"', 'Credit manually with reason code BATCH-FAIL', 'Notify CRM IT with the batch ID'],
    views: 0,
    helpful: 0,
    updated: now - 5 * HOUR,
    draft: true,
    sourceCount: 9,
  });
  return items;
}

// ───────────────────────────── Integrations & rules ─────────────────────────────

function buildIntegrations(now: number): Integration[] {
  const m = (min: number) => now - min * MIN;
  const mk = (id: string, name: string, group: string, description: string, throughput: string, events: string[], health = 99.9, status: Integration['status'] = 'connected'): Integration => ({
    id,
    name,
    group,
    description,
    status,
    lastSync: m(1),
    health,
    throughput,
    events: events.map((text, i) => ({ at: m(i * 3 + 1), text })),
  });
  return [
    mk('smartflo-voice', 'TTSL Smartflo: Voice & IVR', 'Telephony', 'Inbound/outbound calls, IVR menus, call recording and screen pop.', '1,284 calls / day', ['Call event received: +91 98XXX X1187 → IVR 1', 'Recording uploaded for TM-10398', 'IVR path captured: Hindi → 3 → Loyalty', 'Agent leg connected in 4 s']),
    mk('smartflo-bot', 'TTSL Smartflo: Voice bot', 'Telephony', 'Indian-language AI voice bot for after-hours and overflow calls.', '212 calls / night', ['Bot session ended: self-resolved (points balance)', 'Callback scheduled 09:30 for TM-10390', 'Language detected: Hindi']),
    mk('smartflo-wa', 'TTSL Smartflo: WhatsApp', 'Messaging', 'WhatsApp Business API: bot journeys, templates and agent chat.', '3,960 messages / day', ['Template "ticket_ack" delivered', 'Inbound message: ED-558774', 'Media received: IMG_part_label.jpg']),
    mk('m365-mail', 'Microsoft 365 Email', 'Microsoft', 'Shared mailboxes parsed into tickets with threading and dedupe.', '540 emails / day', ['Email parsed → ticket TM-10405', 'Thread matched by In-Reply-To: duplicate prevented', 'Auto-acknowledgement sent']),
    mk('teams', 'Microsoft Teams', 'Microsoft', 'Teams messages and internal escalations linked to tickets.', '310 messages / day', ['Message from #parts-escalations linked to TM-10377', 'Adaptive card posted to Warehouse Ops']),
    mk('entra', 'Microsoft Entra ID (SSO)', 'Microsoft', 'Single sign-on and role mapping for agents and supervisors.', '64 sign-ins today', ['Sign-in: Anita Rao (Supervisor)', 'Group sync: 18 users']),
    mk('sap', 'SAP', 'Enterprise', 'Stock, dispatch, invoices and returns.', '2,140 lookups / day', ['Dispatch lookup ED-558210: pickup pending', 'Stock check PRT-27014-BRK: 1,240 units (Pune WH)', 'Invoice PDF fetched INV-2026-44310'], 99.7),
    mk('plm', 'PLM', 'Enterprise', 'Part master and supersession chains.', '180 lookups / day', ['Supersession: PRT-61877-FPM → PRT-61877-FPN (two-way)']),
    mk('ipms', 'IPMS', 'Enterprise', 'Warranty claims and parts management.', '95 lookups / day', ['Claim WC-20931 status: Technical review']),
    mk('edukaan', 'eDukaan Admin Portal', 'Commerce', 'Online parts store orders, payments and retailer accounts.', '860 lookups / day', ['Order ED-558774 status: In transit', 'Retailer RTL-MH-2207 password reset sent']),
    mk('ipromis', 'iPromis', 'Legacy ticketing', 'Two-way sync during migration from the Parts Helpline legacy system.', 'Sync every 2 min', ['Ticket synced to iPromis: TM-10401', 'Status update pulled: 3 tickets'], 98.9, 'degraded'),
    mk('aditaas', 'ADiTaaS', 'Legacy ticketing', 'Two-way sync for the eDukaan desk legacy tickets.', 'Sync every 5 min', ['Ticket synced to ADiTaaS: TM-10399', 'Mapping: category "Payment" → "Billing"']),
    mk('loyalty-crm', 'Loyalty CRM', 'Enterprise', 'Members, points ledger, redemptions and tiers.', '1,020 lookups / day', ['Points credited: LYT-778201 +640', 'Batch run 02:00 completed with 14 failures'], 99.2),
  ];
}

function buildRules(): RoutingRule[] {
  return [
    { id: 'R1', name: 'WhatsApp order status → eDukaan', enabled: true, conditions: [{ field: 'channel', op: '=', value: 'WhatsApp' }, { field: 'intent', op: '=', value: 'Order status' }], actions: { desk: 'edukaan', priority: 'P3', assign: 'Least loaded' }, hits: 412 },
    { id: 'R2', name: 'IVR option 3 → Loyalty', enabled: true, conditions: [{ field: 'ivr', op: '=', value: '3' }], actions: { desk: 'loyalty', assign: 'Skill: language match' }, hits: 1180 },
    { id: 'R3', name: 'Vehicle off road → P1', enabled: true, conditions: [{ field: 'keyword', op: 'contains', value: 'vehicle off road, VOR, truck standing' }], actions: { priority: 'P1', tag: 'VOR' }, hits: 57 },
    { id: 'R4', name: 'Dispatch queries → Helpline', enabled: true, conditions: [{ field: 'intent', op: 'in', value: 'Dispatch delay, Back-order' }], actions: { desk: 'helpline', assign: 'Skill: Dispatch' }, hits: 690 },
    { id: 'R5', name: 'Payment issues → eDukaan, P2', enabled: true, conditions: [{ field: 'intent', op: '=', value: 'Duplicate payment' }], actions: { desk: 'edukaan', priority: 'P2', assign: 'Aditi S.' }, hits: 133 },
    { id: 'R6', name: 'Fleet owners → priority boost', enabled: false, conditions: [{ field: 'customerType', op: '=', value: 'Fleet' }], actions: { tag: 'Fleet', priority: 'P2' }, hits: 0 },
    { id: 'R7', name: 'Warranty → Helpline warranty pod', enabled: true, conditions: [{ field: 'intent', op: 'contains', value: 'Warranty' }], actions: { desk: 'helpline', assign: 'Skill: Warranty' }, hits: 208 },
  ];
}

// ───────────────────────────── Entry ─────────────────────────────

export function buildSeed(now = Date.now()): SeedData {
  iid = 0;
  seedNow = now;
  const rng = createRng(SEED);
  const agents = buildAgents(rng);
  const { customers, heroes } = buildCustomers(rng, now);
  const orders = buildOrders(rng, now, customers, heroes);
  const ledger = buildLedger(rng, now, customers, heroes);
  const { tickets, heroTickets, nextNo } = buildTickets(rng, now, customers, agents, heroes);
  const notifications: AppNotification[] = [
    { id: 'n1', at: now - 12 * MIN, title: 'SLA at risk', body: 'Several tickets crossed 75% of their resolution SLA.', tone: 'warning' },
    { id: 'n2', at: now - 40 * MIN, title: 'Recurring issue detected', body: 'Delayed dispatch from Pune WH: 23 tickets this week, up 41%.', tone: 'info' },
    { id: 'n3', at: now - 2 * HOUR, title: 'Proactive notification sent', body: 'Order delay detected for 18 orders; WhatsApp updates sent before customers called.', tone: 'success', read: true },
  ];
  return {
    customers,
    agents,
    tickets,
    orders,
    kb: buildKb(rng, now),
    integrations: buildIntegrations(now),
    rules: buildRules(),
    notifications,
    ledger,
    heroes,
    heroTickets,
    nextNo,
  };
}

export { nid, ev };
