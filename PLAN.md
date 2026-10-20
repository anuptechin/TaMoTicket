# BizSensAi Support Hub: build plan

## Decisions (made without asking)

| Topic | Decision | Why |
|---|---|---|
| Routing | Tiny hash router in the store (`#/ticket/TM-10482`) | Zero dependencies, survives refresh, works under `vite preview` offline |
| Persistence | Zustand `persist` → `localStorage` key `bizsensai-hub-v1`, wrapped in try/catch | Refresh keeps the demo state; "Reset demo data" reseeds |
| Seed dates | Fixed seed (mulberry32, seed 9242) generates identical data; timestamps are offsets from the moment of reset | Data always looks "recent" whatever day the demo runs |
| Fonts | `@fontsource` packages bundled (Plus Jakarta Sans, JetBrains Mono) instead of the Google Fonts CDN | The demo must be perfect with Wi‑Fi off |
| Seeded SLA timers | Seeded tickets get explicit due times to produce the wanted state mix (on track / at risk / breached / met); new tickets use the real SLA engine (`lib/sla.ts`) with business hours, holidays and pause | Predictable demo + a real, tested engine |
| AI | `services/ai.ts` calls `/api/ai` with a 6 s abort; any failure, 404 or missing key → scripted answer. Call summaries in scripted scenarios always use the script so the storyline is identical every time | Never breaks live |
| Server | `server/index.ts` (Express + `@anthropic-ai/sdk`), model from `ANTHROPIC_MODEL` (default `claude-opus-5-5`), effort `low`, 6 s timeout, server-side refusal fallback enabled | Optional live AI |
| Storage size | Call transcripts reference a script key instead of being copied into every ticket | Keeps localStorage well below quota |
| Nav | 88 px icon+label rail | Fits 1366×768 with the three-column ticket workspace |
| Offline AI bridge | A Vite middleware forwards `/api/*` to the AI server and answers "AI off" (200) when it is down | No failed-request noise in the console during an offline demo |
| KPI calibration | AI-resolved tickets are calibrated to exactly 34% after generation | A per-ticket coin flip made the KPI swing 26–38% with the reset hour |
| Overlays | Palette, Demo Director, modals and the call bar have entry animations only | An exit animation can stall when a heavy page mounts at the same moment, leaving a dead overlay |
| Text colour | Status/priority colours rendered as text go through `ink()` (CSS `color-mix`) | Keeps the spec palette for fills and charts while meeting WCAG AA contrast |
| 3D login | three.js scene built from primitives (no model files), lazy-loaded, error boundary + WebGL check fall back to the static hero | Offline, licence-free, no automaker styling, 60 fps on integrated GPUs |
| Database | None for the demo; `src/services/*` is the seam for a later PostgreSQL-backed API | A live demo must not depend on network or credentials |

## Screens

P0: Login · Command Center · Unified Inbox · Ticket workspace (customer 360 / unified timeline / AI copilot, transfer, escalate, merge, close) · Live incoming call flow · WhatsApp journey simulator · After-hours voice bot · Email-to-ticket with dedupe + merge suggestion · Demo Director (Shift+D)

P1: SLA & escalation settings · Routing rules builder (drag, toggle, test sandbox) · Reports (daily bulletin, weekly SLA, monthly) · Ask your data · Integrations hub · Knowledge base with AI-drafted articles

P2: Wallboard/TV mode · SLA breach prediction badge · Sentiment heatmap + customer effort score (Command Center) · Proactive notifications (own screen + Director scenario 10) · CSAT on WhatsApp · Auto-translate in composer · ⌘K command palette · Audit trail + permissions matrix

## Data model (`src/types.ts`)

`Customer`, `Agent`, `Ticket` (with `sla`, `interactions[]`, `transfer`, `escalationLevel`, `entities`, `linkedIds`), `Interaction` (email, call, whatsapp, webchat, teams, app, note, event, lookup, voicebot), `SLAPolicy`, `RoutingRule`, `KBArticle`, `Integration`, `Order`, `Notification`.

## Build order

1. Scaffold, design tokens, layout shell, store, seed, SLA engine + tests
2. Login → Command Center → Inbox → Ticket workspace
3. Call flow, WhatsApp, voice bot, email dedupe, Demo Director scenarios
4. P1 screens, then P2
5. `npm run build`, `npm test`, `npm run preview`; README + DEMO_SCRIPT
