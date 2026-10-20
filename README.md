# BizSensAi Support Hub

A demo-grade, AI-first unified support platform for an automotive spare-parts business: Parts Helpline, eDukaan and Loyalty desks in one hub, with omnichannel capture, SLA control, an AI copilot, an Indian-language voice bot and live dashboards.

Everything runs locally with **no backend and no internet**. Data is generated from a fixed seed and kept in the browser (`localStorage`).

## One-click start / stop (Windows)

- **`start.bat`**: double-click. The first run installs dependencies (needs internet once). It rebuilds only when the code or `.env` changed, starts the app and the optional AI helper in minimised windows, waits until the app answers, and opens http://localhost:4173. If the app is already running, it just opens the browser.
- **`stop.bat`**: double-click to stop everything (ports 4173, 5173 and 8787).

After the first run, no internet is needed.

## Run it from a terminal

```bash
npm install
npm run demo        # web app on http://localhost:5173 + optional AI server on :8787
```

Other commands:

| Command | What it does |
|---|---|
| `npm run dev` | Web app only (all AI features use scripted answers) |
| `npm run build` | Typecheck + production build into `dist/` |
| `npm run preview` | Serve the production build on http://localhost:4173 (works with Wi‑Fi off) |
| `npm test` | Unit tests for the SLA engine (business hours, holidays, pause/resume, escalation) |
| `npm run server` | Optional AI server only |

**Recommended for the live demo:** `npm run build` once, then `npm run preview`, and open http://localhost:4173 in a full-screen browser window. It is the fastest and has no dev tooling in the way.

## Reset the demo

- Press **Shift+D** to open the **Demo Director**, then **11 · Reset demo data**, or
- account menu (top right) → **Reset demo data**.

Reset rebuilds the identical 320 tickets, 70 customers, 18 people and 37 knowledge articles. Your theme and sign-in are kept.

## Demo Director (Shift+D)

A hidden control panel that runs each scenario end to end with no typing: incoming calls (eDukaan, Loyalty), WhatsApp journey, email + duplicate prevention, after-hours voice bot (self-resolved and hand-off), SLA 75% → breach → escalation, transfer Helpline → eDukaan, jump to Command Center, proactive delay notifications, reset. A small "v1.0" button in the footer opens it too. See `DEMO_SCRIPT.md` for the talk track.

Other shortcuts: **Ctrl/⌘+K** or **/** command palette · **Esc** closes panels · **Ctrl+Enter** sends a reply · wallboard: **← →** to change panel, **Esc** to exit.

## Environment variables (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| `VITE_CLIENT_LABEL` | `Parts Business` | Workspace name shown in the app (plain text, no branding) |
| `VITE_PREPARED_FOR` | empty | When set, the login screen shows "Prepared for &lt;value&gt;" |
| `ANTHROPIC_API_KEY` | empty | Optional. Enables live Claude answers for "Regenerate reply" and free-form "Ask your data" questions |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | Model used by the optional AI server |
| `AI_PORT` | `8787` | Port of the optional AI server |

`VITE_*` values are baked in at build time: rebuild after changing them.

**AI safety net:** every AI feature has a scripted fallback, used automatically when there is no key, no network, an error, or a response slower than 6 seconds. The scripted demo storyline (calls, voice bot, WhatsApp, email) always uses its script so it is identical every time. If the AI server is not running, the web server answers "AI off" itself, so the browser console stays clean.

## Project layout

```
src/
  components/   App shell, overlays (call bar, Demo Director, palette, toasts), UI primitives
  features/     One folder per screen (command, inbox, ticket, whatsapp, voicebot, email, settings, reports, ask, integrations, kb, wallboard, audit, login)
  services/     ai.ts (live AI + fallback), lookups.ts (mock SAP / CRM / eDukaan calls), scenarios.ts (Demo Director)
  store/        Zustand store with persistence, hash router, shared clock
  data/         seed.ts (fixed-seed generator), scripts.ts (call, voice bot, WhatsApp scripts), catalog.ts
  lib/          sla.ts (+ tests), metrics.ts, copilot.ts, meta.ts, format.ts, rng.ts
server/index.ts Optional Express route /api/ai using the Anthropic SDK
```

## Testing done before the demo

- **Unit tests (`npm test`, 91 tests):** proactive delay detection (never re-notifies, never touches storyline customers), heatmap totals and the effort scale, SLA engine (business hours, Saturdays, Sundays, holidays, pause/resume, escalation ladder) and seed data (exact volumes, identical on every reset, valid references, no future dates, readable overdue times). KPI targets (SLA > 95%, AI resolution 30–40%, acknowledgement < 60 s, CSAT > 4.3, zero missed) are checked for a reset at every 3 hours across a full week, so the numbers hold whenever you reset.
- **Browser click-through (Edge, production build):** the full Demo Director storyline in light and dark mode at 1366×768 and 1920×1080, plus a 50-step interaction suite covering every screen, every ticket action, both roles, and abuse cases (scenarios triggered twice, reset during a live call, declined calls, interrupted journeys, page refresh, bad URLs). Result: no failures, no console errors, no horizontal scrolling.
- **Accessibility:** axe-core (the Lighthouse accessibility engine) reports zero WCAG 2.1 A/AA violations on every screen in both themes. All text is at least 13 px.
- **Offline:** the app makes no request outside localhost; fonts are bundled.

## Database (later, not needed for the demo)

The demo deliberately has no database so it cannot fail on a network or credentials problem. For a pilot, the mock service layer in `src/services/` is the seam: replace those functions with API calls to a backend that stores tickets, interactions, customers and SLA events in your existing PostgreSQL instance. The types in `src/types.ts` map directly to tables.

## Notes

- All people, dealers, companies, numbers and GSTINs are fictional. No automaker names, logos or colours are used.
- Fonts are bundled (no Google Fonts request) so the app looks identical offline.
