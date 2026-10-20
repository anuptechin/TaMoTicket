# Demo script: 20 minutes

**Audience:** senior executives of the Parts Business. **Goal:** show one hub replacing three desks and three tools, with measurable outcomes.

## Before you start (5 minutes before)

1. Double-click **start.bat** (or run `npm run preview`). The browser opens http://localhost:4173; press F11 for full screen. Works with Wi‑Fi off.
2. Press **Shift+D** → **11 Reset demo data**. Close the Director with **Esc**.
3. Sign in as **Supervisor**, **All desks** → Continue. You land on the Command Center.
4. Light theme reads best on projectors. Theme toggle is the moon icon, top right.

> **Universal fallback:** if anything looks wrong, press **Shift+D → 11 Reset**, and repeat the step. Every scenario is idempotent and takes under 30 seconds.

---

## 1. The problem and the targets (2 min) · Command Center

**Click path:** you are already on **Command Center**.

**Say:**
"Today the Parts Business runs three desks on three systems: the Helpline on iPromis, eDukaan on ADiTaaS, Loyalty on an in-house CRM, with email, Teams and phone spread across them. Customers repeat themselves when they are passed between desks, and nobody sees one picture.

This is that one picture. Every call, chat and email becomes a ticket automatically. Look at the targets you set: acknowledgement under a minute, here 38 seconds; SLA compliance over 95%; 30 to 40% resolved by AI and self-service; and missed requests: zero."

Point at the eight KPI cards, then **SLA compliance by desk**.

**Fallback:** numbers still counting up? Wait one second; they animate on load.

## 2. The wow moment: incoming call (4 min)

**Click path:** **Shift+D → 1 Incoming call: eDukaan dispatch delay**.

**Say (call bar slides in):** "A retailer from Pune is calling. The IVR already knows he chose eDukaan. Notice two things: the ticket was created the second the phone rang, and he already has a WhatsApp acknowledgement with his ticket number."

**Click:** **Accept**. The screen pops with customer 360.

**Say:** "Before the agent says hello, she sees who this is: retailer, Pune, contacted three times in seven days, sentiment declining, and his delayed order ED‑558210 straight from eDukaan and SAP."

Let the transcript stream (Hinglish). Point at the right column as it updates.

**Say:** "The AI copilot is listening. It picked up the order number and the part number, recognised a dispatch delay, saw that vehicles are off the road and suggests P2. It also found his earlier email, so he does not have to repeat himself."

**Click:** **Accept** on the suggested priority. Then **Check dispatch status in SAP** in Next best actions → a result card appears in the timeline.

**Click:** **End call** (it pulses when the conversation is over).

**Say:** "When the call ends the AI writes the summary, category, priority, the order and part numbers and the next action into the ticket, attaches the recording and transcript, and sends the customer a WhatsApp update. No after-call typing."

Scroll the timeline: open **Show transcript** on the call card, press play on the recording.

**Fallback:** call bar did not appear → Shift+D → 1 again. Transcript stuck → it pauses on **Hold**; press **Resume**.

## 3. WhatsApp self-service and hand-off (2 min)

**Click path:** **Shift+D → 3 WhatsApp: track-order journey**.

**Say:** "A fleet owner in Ludhiana messages on WhatsApp. On the right is his phone; on the left, the agent's inbox, live. The bot answers from eDukaan data: dispatched, tracking number, expected date. He then types 'need to talk to someone'. A ticket is created with the whole chat, routed to eDukaan, and Aditi picks it up already knowing everything."

**Click:** **Open TM‑…** to show the ticket with the full chat history.

**Fallback:** press **Play track-order journey** on the page.

## 4. After-hours voice bot in Hindi (2.5 min)

**Click path:** **Shift+D → 5 After-hours voice bot: self-resolved**.

**Say:** "It is 10 pm. No agents. The Indian-language voice bot answers in Hindi." Keep **English translation** on for the room. "It verifies the member, reads the points balance and offers to send it on WhatsApp. Resolved, no agent, and it counts in the AI resolution KPI."

**Click path:** **Shift+D → 6 After-hours voice bot: hand-off**.

**Say:** "Now a garage owner with a truck stuck in his workshop asks for a human. The bot does not argue: it logs a P2 ticket, books a 9:30 am callback, assigns it, and attaches the Hindi transcript with translation."

**Fallback:** use the two Play buttons at the top of the page.

## 5. Email to ticket, with duplicate prevention (1.5 min)

**Click path:** **Shift+D → 4 Email: warranty query + follow-up**.

**Say:** "A dealer in Coimbatore emails about a warranty claim. Parsed, classified as Warranty P3, routed to the Helpline, acknowledged in 41 seconds. Two minutes later he replies with the job card. Instead of a second ticket, the system matches the thread and links it: 'Duplicate prevented'."

Point at the **Merge suggestion** banner: "And when the same dealer raises the same request on email and Teams, the system suggests a merge." **Click** **Merge into TM‑…**.

**Fallback:** press **Simulate warranty email + follow-up** on the page.

## 6. Transfer without repetition (1.5 min)

**Click path:** **Shift+D → 8 Transfer Helpline → eDukaan**.

**Say:** "This Helpline ticket is really about an eDukaan order. One click moves it to eDukaan with a handover note. Aditi sees the banner: transferred by Rohan, customer does not need to repeat the issue. The full timeline, calls and emails travel with it."

Point at the **possible duplicate** banner: the call from step 2 and this email are the same problem; merge them if you like.

**Fallback:** open any Helpline ticket → **Transfer** button → pick eDukaan → **Transfer with context**.

## 7. SLA control and escalation (2 min)

**Click path:** stay on the ticket → **Shift+D → 7 SLA 75% → breach → escalation**. Press **Esc** to close the Director so the timeline is visible.

**Say:** "SLAs run on business hours, Monday to Saturday, skipping holidays, and pause when we are waiting on the customer. At 75% the owner is alerted. On breach it escalates to the supervisor, then the manager at breach plus 4 hours, then the function head at plus 12." Point at the toasts, the bell, and the escalation events.

**Optional:** left nav **SLA** → show the P1–P4 matrix, the escalation ladder and holidays. "These are your numbers: P1 is 3 hours response, 12 hours resolution."

## 8. Back to the Command Center (1 min)

**Click path:** **Shift+D → 9 Jump to Command Center**.

**Say:** "Every scenario we just ran is already in these numbers. And every number drills down." **Click** **Open tickets** → the filtered inbox. **Click** a row → the ticket. Back.

Point at **AI insights**: "Recurring issue: dispatch delays from the Pune warehouse, up 41% week on week. Loyalty credits failing after the 2 am batch. The system tells you where to act."

Scroll to **Customer sentiment & effort**: "This heatmap shows where customers are unhappy, by desk and category. Dispatch delays and wrong parts run hot; price and invoice requests are calm." Switch to **Customer effort (CES)**: "And this is how hard we make it for them. Extra contacts, transfers and reopens all cost effort. eDukaan dispatch queries are the hardest today, so that is where to improve first." Click any cell to show the tickets behind it.

## 8b. Proactive notifications (1.5 min)

**Click path:** **Shift+D → 10 Proactive: delay detected → WhatsApp**.

**Say:** "The best call is the one that never has to happen. The system scans SAP and eDukaan for orders past their promised dispatch, works out why for each warehouse, and messages every affected customer on WhatsApp with a new delivery date before they call." Let the statuses run Sending → Delivered → Read. "About 7 in 10 of these customers would have called us. That is the calls-prevented number on the Command Center, and it just went up."

**Fallback:** left nav **Proactive** → **Scan for delays** → **Send WhatsApp to customers**.

## 9. Ask your data (1.5 min)

**Click path:** left nav **Ask data** → click **"How many P1 tickets breached SLA in eDukaan this week?"**, then **"Top 5 recurring issues for Pune dealers"**.

**Say:** "Managers ask in plain English and get the number, a chart and the actual tickets behind it."

## 10. Integrations (1 min)

**Click path:** left nav **Integrations**.

**Say:** "TTSL Smartflo for voice, IVR, voice bot and WhatsApp. Microsoft 365, Teams and Entra ID. SAP, PLM, IPMS, the eDukaan admin portal, and two-way sync with iPromis and ADiTaaS during migration, so nothing breaks on day one." Click **Event log** on one card, then **Test**.

## 11. Close on outcomes (1 min)

**Click path:** **Command Center** (or **Wallboard** for drama: it is the TV view for the support floor).

**Say:**
"One touchpoint for every Parts Business query. 100% automated capture, acknowledgement in under a minute, zero missed requests, SLA compliance above 95%, a third of requests resolved by AI and self-service, and well over 60% less manual effort, because nobody types summaries, chases status, or asks the customer to repeat themselves."

---

## Quick reference

| Need | Do |
|---|---|
| Open the Director | **Shift+D** (or footer **v1.0**) |
| Reset everything | Director → **11** |
| Start / stop the app | Double-click **start.bat** / **stop.bat** |
| Find any ticket or customer | **Ctrl+K**, type a name, city, order or part number |
| Leave the wallboard | **Esc** or the × top right |
| Switch to agent view | Account menu → Sign out → **Agent** + desk |
| Dark mode | Moon icon, top right |
