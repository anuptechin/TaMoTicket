# Claude Code prompt: BizSensAi Unified Support Hub demo

> Paste everything below the line into Claude Code in an empty folder.

---

You are a senior product engineer and product designer. Tonight you will build a **demo-grade, world-class web application** called **BizSensAi Support Hub**. It is a unified, AI-first customer support platform for an automotive spare-parts business. Tomorrow it will be demonstrated live to senior executives of a large Indian automotive manufacturer's Parts Business. It must look and feel like a premium enterprise SaaS product (think Linear, Zendesk, Intercom and Freshdesk at their best), and **it must never break during a live demo**.

## 1. Business context (what the client asked for)

The client runs three support desks that will be merged into one:

| Desk | Agents | Channels today | Ticketing today |
|---|---|---|---|
| Parts Helpline | 8 | Email 80%, Teams 16%, calls 3–4% | iPromis |
| eDukaan (online parts store) | 1 | Calls 55%, email 40%, Teams 5% | ADiTaaS |
| Loyalty programme | 5 | Calls 100% | In-house CRM |

They want:
- **One touchpoint** for all Parts Business queries, with transfers between desks that keep the history, so the customer never repeats the issue.
- **Omnichannel:** phone calls and IVR (options: Parts Helpline, eDukaan, Loyalty, talk to an agent), email to ticket, eDukaan website chat/bot, WhatsApp, mobile app, Microsoft Teams.
- **Automatic ticket** for every request, acknowledged within 1 minute, duplicate prevention, linking of follow-ups.
- **Routing and SLAs:** P1 Critical (3 h response / 12 h resolution), P2 High (6 h / 24 h), P3 Medium (12 h / 48 h), P4 Low (24 h / 72 h). Alert the owner at 75% of the SLA, escalate on breach to the supervisor, then to the manager and function head. Working hours Monday–Saturday, holidays, SLA pause/resume.
- **AI:** classification, intent, priority suggestion, self-service from a knowledge base, agent assist (suggested replies and resolutions), call recording + transcription + summaries, an **Indian-language AI voice bot** for after-hours calls with hand-off to a human, smart insights (SLA risk, recurring issues).
- **Integrations** (shown as connected and simulated): TTSL Smartflo (voice, IVR, voice bot, WhatsApp), Microsoft 365 email, Microsoft Teams, SAP, PLM, IPMS, eDukaan Admin Portal, iPromis, ADiTaaS, Loyalty CRM.
- **Dashboards:** total/open/closed/pending, ageing, priority/category/channel splits, SLA compliance and breaches, escalations, agent productivity, first-contact resolution, reopen rate, CSAT, daily bulletin, weekly SLA report, monthly dashboard, drill-down from any number to tickets to the recording or chat.
- **Targets:** 100% automated capture, acknowledgement under 1 minute, zero missed requests, SLA compliance over 95%, 30–40% AI/self-service resolution, over 60% less manual effort.

## 2. Branding and naming rules

- Product name: **BizSensAi Support Hub**. Vendor: **BizSensAi**. Use these everywhere (title bar, login, footer, favicon text).
- **Do not** use any automaker's logo, trademark styling or brand colours. The client is referenced only as plain text through a config value:
  - `VITE_CLIENT_LABEL="Parts Business"` (shown as the workspace name)
  - `VITE_PREPARED_FOR=""` (optional; when set, the login screen shows "Prepared for <value>" in small text). Leave empty by default.
- Vehicle data stays generic: segments like "SCV", "Pickup", "ICV", "M&HCV", "Bus". Part numbers in a neutral format like `PRT-27014-BRK`. All people, dealers and companies are fictional.

## 3. Tech stack (keep it simple and robust)

- **React 18 + Vite + TypeScript**, **Tailwind CSS**, **Zustand** for state, **Recharts** for charts, **lucide-react** for icons, **framer-motion** for a few deliberate animations, **cmdk** for the command palette.
- **No real backend needed for the demo.** Build a mock service layer (`src/services/*`) with async functions and realistic latency (150–600 ms). Persist state to `localStorage` so a page refresh keeps the demo state; provide a one-click **Reset demo data**.
- **Optional live AI:** a tiny Express server (`server/index.ts`) with one route `/api/ai` that calls the Claude API using `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` from `.env`. **Every AI feature must have a scripted fallback** that is used automatically if there is no key, no network, or the call takes longer than 6 seconds. The demo must be perfect with Wi-Fi off.
- One command to run everything: `npm run demo` (starts Vite and the optional server together).

## 4. Design system (make it genuinely beautiful)

- Light and dark themes, toggle in the top bar; both designed with care.
- Palette as CSS variables:
  - Ink `#0B1220`, surface `#FFFFFF`, canvas `#F5F7FA`, hairline `#E4E8EF`
  - Primary **"Signal teal"** `#0E7C86` (hover `#0A6670`), used sparingly for primary actions and focus
  - Status: success `#16A34A`, warning `#D97706`, critical `#DC2626`, info `#2563EB`
  - Priority chips: P1 red, P2 orange, P3 blue, P4 slate
  - Channel colours: phone indigo, WhatsApp green, email sky, web chat violet, Teams purple, app teal
- Type: **"Plus Jakarta Sans"** for UI, **"JetBrains Mono"** for ticket IDs, timers and part numbers (Google Fonts, with system fallbacks). Tabular numbers on all metrics.
- Layout: a slim left nav with icons and labels, a top bar (global search, ⌘K, live clock, agent status Available/Busy/Away, notifications bell, theme toggle, user avatar), and a content area with 8 px spacing steps.
- Detail: soft 1 px borders, 10–12 px radius, subtle shadows only on popovers and modals. Skeleton loaders, empty states with helpful copy, toasts for every action ("Ticket TM-10482 transferred to eDukaan"), keyboard shortcuts with hints.
- Must look sharp on a **projector at 1366×768** and on 1920×1080. Test both. No horizontal scrolling. Minimum 13 px text.
- Motion: one smooth slide-in for the incoming-call screen pop, a gentle pulse on SLA-at-risk badges, number count-up on dashboard load. Respect reduced motion.

## 5. Seed data (realism sells the demo)

Generate with a fixed random seed (`src/data/seed.ts`) so every reset produces identical data:
- **70 customers:** dealers, retailers, mechanics/garages, fleet owners, loyalty members, with Indian names and cities (Pune, Jamshedpur, Lucknow, Indore, Coimbatore, Guwahati, Nagpur, Ludhiana and others), dealer codes like `DLR-MH-0142`, loyalty IDs like `LYT-778201`, GSTINs (fictional), mobile numbers masked `+91 98XXX X4521`.
- **320 tickets** across the last 30 days, spread over desks (Helpline 55%, eDukaan 20%, Loyalty 25%) and channels (email, phone, WhatsApp, web chat, Teams, app), with all statuses, priorities, SLA states (on track / at risk / breached / met) and realistic subjects, for example:
  - "Brake pad PRT-27014-BRK not delivered against order ED-558210"
  - "Wrong clutch plate supplied for ICV, need replacement"
  - "Loyalty points not credited for invoice INV-2026-44817"
  - "Payment debited twice on eDukaan order"
  - "Part supersession query: old part number discontinued"
  - "Request for price list update, Q3"
  - "Warranty claim status for alternator"
  - "Unable to log in to the eDukaan retailer portal"
- **Interactions** on each ticket: email threads, call records (duration, IVR path, recording, transcript in English or Hinglish, AI summary), WhatsApp threads with media placeholders, internal notes, transfers, escalations, SLA events and an audit trail.
- **14 agents** across the 3 desks plus 2 supervisors, 1 manager and 1 function head, with avatars (initials), skills, shifts, status and productivity stats.
- **35 knowledge base articles** (returns policy, order tracking, loyalty points rules, supersession, payment failures, GST invoice copy, and others).
- Mock "connected system" data: eDukaan orders (status, dispatch, tracking number, invoice), SAP stock and dispatch, loyalty points ledger.

## 6. Screens and features (in build priority order)

### P0: must work perfectly (the demo storyline)

1. **Login and workspace**
   - Elegant split screen with product tagline: "Every call, chat and email. One ticket. Zero missed requests."
   - Choose a role: Agent, Supervisor, Manager. Choose a desk: Parts Helpline, eDukaan, Loyalty, or All.

2. **Command Center** (supervisor home)
   - Hero KPIs with sparklines: open tickets, new today, acknowledgement time (median 38 s), SLA compliance (96.4%), AI/self-service resolution (34%), first-contact resolution, CSAT 4.5/5, missed requests 0.
   - Charts: ticket volume by channel (stacked area, 30 days), SLA compliance by desk, priority mix, ageing buckets (0–4 h, 4–12 h, 12–24 h, 24–48 h, 48 h+).
   - Panels:
     - **SLA at risk now**: live countdown timers, colour by % consumed; clicking a row opens the ticket.
     - **AI insights**: "Recurring issue detected: 23 tickets this week on delayed dispatch from the Pune warehouse; up 41% week on week"; "Loyalty point credit failures spike after invoice batch runs".
     - **Agent board**: status, open load, handled today.
   - Every number drills down to a filtered ticket list.

3. **Unified Inbox / Ticket list**
   - Saved views (My tickets, Unassigned, SLA at risk, Breached, Escalated, Awaiting customer, By desk).
   - Filters: channel, priority, status, desk, category, agent, date. Bulk actions: assign, merge, change priority.
   - Each row shows: channel icon, ticket ID (mono), customer, subject, desk, priority chip, live SLA timer bar, assignee avatar, last updated.

4. **Ticket workspace** (the hero screen; spend the most design effort here). Three columns:
   - **Left: customer 360.** Profile, type, dealer/loyalty IDs, lifetime tickets, CSAT, sentiment trend, open orders (from eDukaan/SAP mock), loyalty points balance, and "Contacted 3 times in 7 days" flag.
   - **Centre: one unified timeline across all channels.**
     - Call cards: an audio player with a waveform (generated visual; a short bundled audio clip is optional), IVR path chips ("IVR: 2 → eDukaan"), full transcript with speaker labels, and an AI summary.
     - WhatsApp bubbles, email cards (collapsible), internal notes (yellow), system events (transferred, escalated, SLA paused).
     - Composer with channel switch (reply by email / WhatsApp / call back), templates, attachments and internal note toggle.
   - **Right: AI Copilot.**
     - Detected intent, category, priority suggestion with confidence and one-click accept.
     - Suggested reply (editable, with a tone switch: formal / friendly / Hindi).
     - Similar resolved tickets with their resolution steps.
     - Relevant KB articles.
     - **Next best actions** as buttons: "Check dispatch status in SAP", "Resend invoice on WhatsApp", "Credit loyalty points", "Escalate to warehouse team". Clicking runs a mock lookup with a nice result card added to the timeline.
   - Header: ticket ID, status dropdown, priority, desk, assignee, SLA ring (response and resolution), and buttons for Transfer, Escalate, Merge, Close.
   - **Transfer modal**: choose desk/agent and add a note. The receiving agent sees the full context, with a banner "Transferred from Parts Helpline by Rohan M. Customer does not need to repeat the issue."

5. **Live incoming call flow** (the wow moment; triggered from the Demo Director, section 7)
   - A toast-like call bar slides in: "Incoming call · +91 98XXX X4521 · IVR: eDukaan".
   - Screen pop opens with customer 360 already loaded, **and a ticket is already created at call start** (badge "Auto-created 0:02 ago"), with an acknowledgement SMS/WhatsApp marked "sent".
   - Accept: a live call panel with a timer, mute/hold/transfer buttons, and a **streaming live transcript** (Hinglish lines appearing every 1.5–2.5 s from a script). The AI copilot updates its intent and suggestions as the transcript grows.
   - End call: an animated "AI is summarising…" (about 1.5 s), then the summary, category, priority, extracted entities (order ID, part number) and next action are written into the ticket. The ticket timeline shows the recording and transcript, and the customer receives a WhatsApp update.

6. **WhatsApp journey simulator**
   - A realistic phone frame on the right of a split view, showing a customer's WhatsApp chat with a guided journey: menu → "Track my order" → order ID → bot answers from eDukaan data → customer types "need to talk to someone" → ticket created and handed to an agent.
   - The left side shows the same conversation appearing live in the agent's inbox.

7. **After-hours AI voice bot**
   - A screen showing a simulated 10 pm call handled by the **Indian-language voice bot** (Hindi transcript with English translation toggle).
   - The bot resolves "points balance" itself (ticket auto-resolved, counted in AI resolution %).
   - A second call asks for a human. The bot creates a P2 ticket with a callback task scheduled for 9:30 am, and the transcript is attached.

8. **Email to ticket with dedupe**
   - Show an incoming email arriving, a ticket being created, and then a follow-up email ("Re: …") automatically **linked to the same ticket**, with a "Duplicate prevented" chip.
   - Include a merge-suggestion banner for two similar tickets from the same dealer.

### P1: strong supporting screens

9. **SLA and escalation settings**
   - Editable P1–P4 matrix table.
   - A visual escalation ladder: owner at 75% → supervisor at breach → manager at breach + 4 h → function head at breach + 12 h.
   - Business hours (Mon–Sat 9:00–18:00), holiday calendar, pause/resume rules.

10. **Routing rules builder**
    - Readable IF/THEN cards (e.g. IF channel = WhatsApp AND intent = order status THEN desk = eDukaan, priority = P3, assign = least loaded). Drag to reorder, toggles, and a "Test rule" sandbox.

11. **Reports**
    - The daily operations bulletin (one-page, print-style preview), weekly SLA report and monthly performance dashboard, with an "Email schedule" setting and export buttons (simulated).
    - Drill-down everywhere.

12. **Ask your data** (natural-language analytics)
    - A search box: "How many P1 tickets breached SLA in eDukaan this week?" or "Top 5 recurring issues for Pune dealers".
    - Answers with a small chart plus the list of tickets (scripted answers for 6–8 sample questions; live AI if a key exists).

13. **Integrations hub**
    - Cards with a connected status, last sync and health:
      - TTSL Smartflo – Voice and IVR; TTSL Smartflo – Voice bot; TTSL Smartflo – WhatsApp
      - Microsoft 365 Email, Microsoft Teams, Microsoft Entra ID (SSO)
      - SAP, PLM, IPMS, eDukaan Admin Portal, iPromis, ADiTaaS, Loyalty CRM
    - Each card has an event log ("Call event received", "Ticket synced to iPromis").

14. **Knowledge base** with AI-drafted articles: "Suggested from 12 resolved tickets: How to request a GST invoice copy", with an approve button.

### P2: "better than asked" features (add if time allows; each must be polished or left out)

- **Wallboard / TV mode** for the support floor (full-screen, large numbers, auto-rotating panels).
- **SLA breach prediction**: a "likely to breach in 2 h" badge, with a reason.
- **Customer effort score** and sentiment heatmap by desk and category.
- **Proactive notifications**: order delay detected → proactive WhatsApp sent before the customer calls ("Prevented 41 inbound calls this week").
- **CSAT survey** after closure on WhatsApp (1–5 stars) feeding the dashboard.
- **Auto-translate** in the composer (Hindi, Marathi, Tamil, Bengali), clearly marked.
- **Command palette** (⌘K): jump to a ticket or customer, run actions.
- **Audit trail viewer** and role permissions matrix.
- **Mobile-responsive supervisor view.**

## 7. Demo Director (critical for a live demo)

A floating control panel, hidden by default and opened with **Shift+D** (and a small discreet button in the footer). It has buttons for:
1. Incoming call: eDukaan dispatch delay (Hinglish)
2. Incoming call: Loyalty points not credited
3. WhatsApp: track-order journey
4. Email: new warranty query, then follow-up email (dedupe)
5. After-hours voice bot call: self-resolved
6. After-hours voice bot call: hand-off with callback
7. Trigger SLA 75% warning, then breach and escalation, on a selected ticket (with notifications)
8. Transfer the current ticket Helpline → eDukaan
9. Jump to the Command Center with numbers updated
10. **Reset demo data**

Each scenario must run end to end with no typing required, and update the dashboard counts live.

## 8. Engineering quality

- Clean folders: `components/`, `features/<area>/`, `services/`, `store/`, `data/`, `lib/`.
- Typed models: Ticket, Interaction, Customer, Agent, SLAPolicy, RoutingRule, KBArticle, Integration.
- An SLA engine in `lib/sla.ts` that computes due times with business hours, holidays and pause, plus unit tests for it (Vitest).
- No console errors. Lighthouse accessibility of 90 or higher. Visible focus states. Every button does something or shows a polished "coming soon" tooltip; nothing is dead.
- Performance: the ticket list stays smooth with 320 rows (virtualise if needed).

## 9. Working method

1. First, write `PLAN.md` with the screen list, the data model and build order. Then build **P0 completely before starting P1**, and P1 before P2.
2. After each P0 screen, run the app and click through it. Fix visual issues immediately.
3. Run the full Demo Director storyline end to end twice at 1366×768 and 1920×1080, in light and dark mode. Fix anything awkward.
4. Run `npm run build` and confirm it serves cleanly with `npm run preview` with the network disabled.
5. Finally, write:
   - `README.md`: how to run, how to reset, and env variables.
   - `DEMO_SCRIPT.md`: a **20-minute talk track** for presenting to executives. Open with the business problem and the target KPIs, then do the incoming call wow moment, WhatsApp, the voice bot, email dedupe, transfer without repetition, SLA escalation, the Command Center, Ask your data, integrations, and close on the outcomes. Give the exact click path for each step, what to say, and a fallback if something goes wrong.

Start now. Ask me nothing unless you are truly blocked; make sensible decisions and note them in `PLAN.md`.
