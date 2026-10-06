# Watchman: The Complete Hands-On Manual

> **Who this is for:** anyone who has never worked in cybersecurity and is seeing Watchman for the first time.
> **What it covers:** *every* screen, button, role and feature, walked through in baby steps, plus three complete end-to-end incident stories that use all of them.
>
> Keep this file open next to Chrome and follow along. Each step tells you **what to click**, then **👀 what you should see**, then sometimes **💡 why it matters**.

---

## Contents

- [Part 0: Words you need first (2 minutes)](#part-0-words-you-need-first-2-minutes)
- [Part 1: Starting, checking and stopping the app](#part-1-starting-checking-and-stopping-the-app)
- [Part 2: The map of the screen](#part-2-the-map-of-the-screen)
- [Part 3: The cast (4 roles + who does what)](#part-3-the-cast-4-roles--who-does-what)
- [Part 4: Story 1, full end-to-end: customer data stolen through an API](#part-4-story-1-full-end-to-end-customer-data-stolen-through-an-api)
- [Part 5: Story 2: ransomware (DORA chain, ransom, SEC, NYDFS)](#part-5-story-2-ransomware-dora-chain-ransom-sec-nydfs)
- [Part 6: Story 3: CFO email takeover, your own incident, Sentinel import](#part-6-story-3-cfo-email-takeover-your-own-incident-sentinel-import)
- [Part 7: The "prove it's safe" demos (tampering, fake evidence, fake AI codes)](#part-7-the-prove-its-safe-demos)
- [Part 8: Button-by-button reference (every single control)](#part-8-button-by-button-reference)
- [Part 9: Rulebook cheat-sheet: which decision starts which clock](#part-9-rulebook-cheat-sheet)
- [Part 10: Permissions table (who can click what)](#part-10-permissions-table)
- [Part 11: The AI: modes, badges and what gets caught](#part-11-the-ai-modes-badges-and-what-gets-caught)
- [Part 12: Settings you can change (`.env`)](#part-12-settings-you-can-change-env)
- [Part 13: When something looks wrong](#part-13-when-something-looks-wrong)
- [Part 14: "I've seen everything" checklist](#part-14-ive-seen-everything-checklist)

---

## Part 0: Words you need first (2 minutes)

| Word | Plain meaning |
|---|---|
| **Incident** | "Something bad happened to our computers." One incident = one case file in Watchman. |
| **Alert** | An automatic alarm from a security tool (here: Microsoft Sentinel / Defender). An alert becomes an incident when a human opens it. |
| **Regulator** | A government body the bank must report to (e.g. the EU data-protection authority, India's CERT-In, the RBI). |
| **Obligation / clock** | "You must tell regulator X within Y hours." Watchman shows each one as a countdown card. |
| **Determination / fact** | A yes/no decision a responsible human makes, like "Yes, personal data was breached." These are the **only** things that start clocks. |
| **Awareness time** | The moment the bank *knew*. Most laws count the deadline from this moment, not from when someone clicked. |
| **Playbook** | A pre-approved checklist for a type of attack ("ransomware playbook"). |
| **NIST phases** | The 4 standard stages of handling an incident: Preparation → Detection & Analysis → Containment/Eradication/Recovery → Post-Incident. |
| **MITRE ATT&CK** | An official public catalogue of hacker techniques. Each has a code like `T1567`. |
| **Hash / fingerprint / seal** | A 64-character code computed from data. Change one letter of the data and the code changes completely. |
| **Hash chain / sealed timeline** | Every event's seal includes the previous event's seal, like wax seals on a logbook where each seal covers the page before. Edit any old page and all later seals break. |
| **Chain of custody** | The list of who held a piece of evidence and when. Courts need it to trust evidence. |
| **SHA-256** | The specific fingerprint recipe used for evidence files. |
| **Observable / indicator (IOC)** | A concrete clue: an IP address, a URL, a hostname. |
| **DPO** | Data Protection Officer: the person legally responsible for personal-data decisions. |
| **IC** | Incident Commander: the person in charge of the response. |

---

## Part 1: Starting, checking and stopping the app

### 1.1 The 4 moving parts

| Part | What it is | Port (its "door number") |
|---|---|---|
| Database (MongoDB) | Saves incidents on your laptop in `.mongo-data/` | 27017 |
| Server | The brain: law rules, checks, sealing | 5000 |
| Website | What you see in Chrome | 5173 |
| Ollama + `phi4-mini` | The AI running on your laptop (optional) | 11434 |

### 1.2 Start (every time), with 3 terminals

1. **Terminal 1, the database:**
   ```bash
   cd ~/Documents/AdoVs/Cyber/watchman/watchman_1/server
   npm run db
   ```
   👀 It goes quiet and looks stuck. **That's normal**: it's running. Leave it open.

2. **Terminal 2, the server:**
   ```bash
   cd ~/Documents/AdoVs/Cyber/watchman/watchman_1/server
   npm start
   ```
   👀 You should see `Connected to MongoDB database` and `Incident Response Server running on port 5000`.

3. **Terminal 3, the website:**
   ```bash
   cd ~/Documents/AdoVs/Cyber/watchman/client
   npm run dev
   ```
   👀 It prints a `Local: http://localhost:5173/` line.

4. **Ollama** usually starts by itself. Check with `ollama list`: you should see `phi4-mini` in the list. If the command errors, open a 4th terminal and run `ollama serve`.

5. Open **http://localhost:5173** in Chrome.

### 1.3 Health check (30 seconds)

| Check | How | Good result |
|---|---|---|
| Server alive | open http://localhost:5000/health | `{"status":"OK"}` |
| Website ↔ server | the first screen shows 3 alert cards | no red "Server unreachable" pop-up |
| AI available | header shows green chip `phi4-mini · on-device` | green chip present |
| No duplicates | `ss -ltnp \| grep -E ':(5000\|5173\|27017\|11434)'` | exactly **one** line per port |

> 💡 If Vite says *"Port 5173 is in use, trying 5174"*, an old website copy is still running. Close the old terminal, or you'll end up with two websites. Same with "port already in use" for 5000/27017.

### 1.4 Warm up the AI (before showing anyone)

Open any incident and click **Analyze incident** once. The first AI call loads the model into memory (10–20 s). After that it takes about 8–10 s.

### 1.5 Stop

Press `Ctrl + C` in each terminal (website, server, database). Your incidents stay saved in `.mongo-data/`.

### 1.6 Things the app remembers for you

- **Your name and role** (top right) are remembered by Chrome between visits.
- **The open incident** is in the address bar after `#`. Refresh the page and you stay on the same incident.
- **The last tab** you used is remembered. You can also jump straight to a tab with `?tab=timeline`, `?tab=evidence`, `?tab=report` or `?tab=plan`, e.g. `http://localhost:5173/?tab=timeline#<incident-id>`.
- **The time machine** (Part 8.1) lives in the server's memory: it applies to **all** incidents and resets to **Now** if you restart the server.

---

## Part 2: The map of the screen

```
┌──────────────────────────────── HEADER (always visible) ─────────────────────────────────┐
│ 🛡 Watchman │ phi4-mini·on-device │ DEMO  Now +6h +24h +60h  ☠ Rogue DB edit │ [name] [role▼] │
└───────────────────────────────────────────────────────────────────────────────────────────┘

FIRST SCREEN (no incident open)
┌──────────── Incoming alerts ────────────┐ ┌─ Report a new incident ─┐
│ [card] Customer records exfiltrated...   │ ├─ Paste Sentinel JSON ───┤
│ [card] Ransomware encrypting...          │ ├─ Recent incidents ──────┤
│ [card] CFO mailbox takeover...           │ └─────────────────────────┘
└──────────────────────────────────────────┘

INCIDENT SCREEN
 Incident ab12cd · opened … · HIGH                      [🛡 Audit chain intact · N] [Switch incident]
 Title + description
┌──── Who must we tell, and by when? (clocks) ────┐ ┌──── Key determinations (9 decisions) ───┐
│ countdown cards…                                 │ │ purple suggestions…                       │
│ ▸ Watching N more obligations                    │ │ 9 rows with [Confirm] / [Retract]         │
└──────────────────────────────────────────────────┘ └───────────────────────────────────────────┘
┌ [Response plan] [Sealed timeline •] [Evidence 2] [Report 6/17] ──────────────────────────────┐
│ contents of the selected tab                                                                   │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                              toasts (small pop-ups) bottom-right →
```

- **Toasts** are the small messages that appear bottom-right for a few seconds. Red = error (e.g. "Only the Incident Commander may approve plan steps"), amber = warning, dark = info. **Always read them**: they explain why something didn't happen.
- **Pop-up dialogs** (dark boxes in the middle of the screen) ask for details before an action is sealed. **Cancel** or clicking outside = nothing happens.
- **Little badges on the tabs:** a red dot on *Sealed timeline* = chain broken; a number on *Evidence* = files registered; `6/17` on *Report* = required items done (green when ready).

---

## Part 3: The cast (4 roles + who does what)

In real life four different people work an incident. In Watchman **you play all of them** by changing the **name box** and **role dropdown** in the header. Everything you do is sealed under that name and role.

Use these names consistently so the timeline tells a clear story:

| Name to type | Role to pick | Their job in real life |
|---|---|---|
| **Ravi Menon** | Analyst | Security analyst on night shift. Spots the alert, investigates, collects evidence. |
| **Asha Rao** | Incident Commander | Runs the response. Approves the plan, makes big operational calls. |
| **Priya Nair** | Data Protection Officer | Decides personal-data questions (is it a breach? high risk to people?). |
| **Daniel Okafor** | Legal Counsel | Decides legal questions (material for the SEC? reportable to New York?). |
| **Lena Weiss** | Analyst *(any role works)* | External forensics expert who receives evidence. |

**How to switch person (do this many times below):**
1. Click the **name box** (top right), select all the text, type the new name.
2. Click the **role dropdown** next to it, pick the role.
3. 👀 Buttons you're not allowed to use now show a 🔒 lock or go faded. Hover over them to see who *is* allowed.

> 💡 The rules are enforced by the **server**, not just hidden in the page. Even a hacker editing the web page can't make an Analyst approve a plan step.

---

## Part 4: Story 1, full end-to-end: customer data stolen through an API

**The story:** At 02:14 UTC Microsoft Sentinel noticed an outside IP (`203.0.113.45`) downloading customer records through a public "export" API that accidentally skipped login. Customers in the EU and India are affected.

This story uses almost every feature. Do it in order. Before starting, make sure the time machine says **Now** (header, the `Now` button highlighted).

### Stage A: Night shift: the alert arrives (Analyst)

**A1. Become the analyst.**
Name box: `Ravi Menon` · Role: **Analyst**.

**A2. Open the alert.**
On the first screen, click the card **"Customer records exfiltrated via unauthenticated export API"**.
👀 You're now on the incident screen. Top-left shows `Incident xxxxxx · opened … · HIGH`.
👀 The clock panel says **"No regulatory clock is running yet"**.
💡 This is deliberate. An alarm going off is *not* legal awareness. Clocks start only when a responsible human confirms a fact.

**A3. Look at the integrity badge (top right).**
👀 Green: `Audit chain intact · 1 events`. Event #0 is "incident created", already sealed.

**A4. Run the AI analysis.**
Make sure the **Response plan** tab is selected (bottom section). Click the blue **Analyze incident** button (top right of that section).
👀 The button changes to `Analyzing on phi4-mini…` with a spinner (about 10 s).
👀 When it's done, the following appear:
1. **Summary box** with a coloured mode badge: `live` (green), `recorded replay` (amber) or `rules fallback (no AI)` (grey). Next to it you see the model, the time, how long it took, and `playbooks: PB-EXFIL + PB-CORE`.
2. The label **"AI-written summary · unverified, never copied into the report"**. Read it, but remember it's only a draft.
3. **Grey chips** with clues found in the alert, e.g. `ip: 203.0.113.45`, `url: /api/v2/accounts/export…`.
4. **Red box "AI output checks: N items caught"**: everything the AI said that failed fact-checking was thrown out. If it says *"All model output passed validation"*, the AI behaved this time. (Part 11 lists every kind of check.)
5. **MITRE ATT&CK mapping**: attacker techniques, each checked against MITRE's official list.
6. **Four columns** of steps: 1. Preparation, 2. Detection & Analysis, 3. Containment/Eradication/Recovery, 4. Post-Incident. Above them: `0/N steps done`.

**A5. Look at the suggestions in "Key determinations" (right panel, top).**
👀 Purple cards: **"AI suggests: confirm?"** or **"Keyword rule suggests: confirm?"**, each with a quoted reason.
💡 The AI may *point*, never *decide*. Some decisions (high risk, material, ransom paid, DORA major, NYDFS reportable) the AI is **not even allowed to suggest**. If it tries, the red checks box shows "Blocked: AI may not suggest…".

**A6. Confirm that a cyber incident happened.**
In the purple card or in the list row **"Cyber incident detected"**, click **Confirm**.
👀 A dialog: *"Confirm: Cyber incident detected"*, with two fields:
- **When did we become aware? (UTC)**: pre-filled with *now*. In real life you'd set the true moment, e.g. when the alert fired. **It can't be in the future.**
- **Basis for this determination** (optional): e.g. `Sentinel rule fired; WAF logs show 1,840 export requests from 203.0.113.45`.

Click **Confirm determination**.
👀 Left panel: **two clocks start**: `CERTIN`, *Report to CERT-In*, `5h 59m …`, and `RBI`, *Report to RBI*, with an orange **verify** tag.
👀 The row now reads `YES · Ravi Menon (Analyst) · aware … · event #N`.
👀 The integrity badge count went up by one.

**A7. Confirm who is affected.**
Click **Confirm** on **"EU/EEA residents affected"**, fill the basis (e.g. `Export contained customers with Irish and German addresses`) → **Confirm determination**.
Do the same for **"Indian residents affected"**.
👀 No new clock yet. Expand **"Watching N more obligations (not triggered)"** at the bottom of the clock panel: GDPR and DPDP are listed with **`needs: Personal-data breach confirmed`**.
💡 Several laws need **two or more** facts together. GDPR needs *breach + EU people*.

**A8. Try something you're not allowed to do.**
Look at **"Personal-data breach confirmed"**: 👀 its button shows a 🔒 lock. Hover: *"Only Incident Commander / Data Protection Officer can confirm this"*.

**A9. Dismiss a suggestion you don't agree with (optional).**
If a purple suggestion looks wrong, click **Dismiss**. 👀 It disappears, and the dismissal is sealed into the timeline (type `AI_SUGGESTION_DISMISSED`).

**A10. Log what you did by hand.**
Open the **Sealed timeline** tab. In the box *"Log an action or observation…"* type `Disabled feature flag export_skip_auth on api-gw-prod`. Choose phase **Containment, Eradication & Recovery** from the dropdown → **Seal into timeline**.
👀 A new `NOTE` row appears at the bottom with your name, time, and `prev … → seal …`.

**A11. Register evidence.**
Open the **Evidence** tab. Either drag the file `demo-evidence/waf-export-2026-10-06.csv` (from your file manager) onto the dashed box, or click the dashed box and pick it.
👀 Briefly: `Computing SHA-256 of waf-export…`. Then a dialog shows the **64-character fingerprint** and three fields:
- **Collected from**: e.g. `Azure WAF (prod-weu-waf01)`
- **Where the original is stored**: pre-filled with `Evidence vault: immutable (WORM) storage, case folder`
- **Description**: e.g. `WAF log export 23:00–02:30 UTC`

Click **Register & seal**.
👀 An evidence card with name, size, `SHA-256 …`, and a custody line: `Ravi Menon · collected …` ... `Current custodian: Ravi Menon`. The **Evidence** tab shows a badge `1`.
💡 The file is **not uploaded**. Only its fingerprint and details are stored, so customer data never leaves the laptop.

Register a second file the same way: `demo-evidence/sentinel-incident-4127.json`.
*(Registering the exact same file twice gives a red toast "This exact file is already registered". That's intended.)*

**A12. Hand the evidence to forensics.**
On the WAF card click **Hand over**. Fill **Receiving custodian** = `Lena Weiss` and **Reason** = `Forensic analysis of exfiltration volume` → **Record hand-over**.
👀 The custody line becomes `Ravi Menon · collected … → Lena Weiss · …`, with `Current custodian: Lena Weiss`.
💡 Only the **current holder** (matched by the exact name in the name box) or the **Incident Commander** can hand evidence over. Try clicking **Hand over** again as Ravi: 👀 a red toast says only `Lena Weiss` or the IC can do it.

### Stage B: The Incident Commander takes charge

**B1. Become the IC.** Name `Asha Rao` · Role **Incident Commander**.

**B2. Approve or reject plan steps.** Open **Response plan**. Each step card has:
- a **grey badge** like `PB-EXFIL-C1` = it comes from an approved playbook;
- or an **amber card "AI-proposed · not in approved playbook"** with a "Why:" line = an extra idea from the AI;
- a ✨ **purple note** = the AI tailored this step to this incident (e.g. names the IP to block);
- a teal **"Evidence to preserve"** line;
- violet technique codes (e.g. `T1567`) when the step relates to an attacker technique.

Click 👍 **approve** on two or three steps and 👎 **reject** on one amber AI step.
👀 Approved: cyan `approved by Asha Rao`. Rejected: struck through and faded, and its circle can't be ticked any more.
💡 Switch to Analyst for a moment: the 👍/👎 buttons are faded. Only the IC decides.

**B3. Mark steps done.** Click the **⭕ circle** at the left of a step.
👀 It turns into a green ✓, the text is struck through, and it says `done by Asha Rao · <time>`. The counter `X/N steps done` goes up. Click the ✓ again to **reopen** it.
💡 Any role may tick steps done. Every tick is sealed (`STEP_DECISION`).

**B4. Review the ATT&CK mapping.**
- Each technique card shows the code, the **official MITRE name**, a ↗ link to MITRE's page, `source: AI / playbook reference / analyst`, and its tactics.
- Cards marked **"needs analyst review"** have ✓ (confirm it fits) and ✕ (remove). Click ✓ on one: 👀 `✓ confirmed by Asha Rao`. Click ✕ on another: 👀 it disappears.
- Type `T1190` in the **"Tag ID"** box → **Tag**. 👀 A green **valid** card: *Exploit Public-Facing Application*.
- Click **Navigator layer**. 👀 A `.json` file downloads. Optional: open https://mitre-attack.github.io/attack-navigator/ → *Open Existing Layer* → *Upload from local* → pick the file. 👀 MITRE's matrix with your techniques coloured (green = confirmed, amber = AI, grey = playbook).

**B5. Confirm the breach.** In Key determinations click **Confirm** on **"Personal-data breach confirmed"**. Set the awareness time (keep *now*), basis e.g. `Export file contained names, IBANs and phone numbers of real customers` → **Confirm determination**.
👀 New clocks appear:
- `GDPR` *Notify supervisory authority*: **72h**
- `DPDP` *Detailed report to Board*: **72h** (verify tag)
- `DPDP` *Intimate Board & affected people*: amber card **"Without delay (no fixed hour count)"**

**B6. Read a clock card properly.** On the GDPR card:
- grey tag `GDPR` = which law; title = what must be done; grey line under it = the regulator;
- big countdown (green → orange below half → red below a quarter or under 1 hour → blinking **OVERDUE**);
- `due <date> UTC · 72h` = exact deadline and rule;
- thin bar = how much time is used up;
- `Started by Asha Rao (Incident Commander) confirming "Personal-data breach confirmed" · event #N · aware …` = who started it, traceable to the sealed timeline.

Click the blue **⚖ GDPR Art. 33(1)** link. 👀 It expands to show:
- **In plain English**: a simple explanation of the duty;
- **Legal text**: the exact wording of the law;
- **Exception**: when you may legally skip it (only on duties that have one);
- **Source ↗**: the official law website.

Click the link again to collapse it.

**B7. Send a Teams alert preview.** Click **Teams alert** (top right of the clock panel).
👀 A white Microsoft-Teams-style card lists the 3 most urgent clocks (due, time left, legal basis, started by), the report completeness, the audit-chain status, and an "Open incident in Watchman" button.
- **Copy card JSON** copies the technical card format (for a Teams webhook).
- **Show JSON** displays it.
- Close with **✕** or by clicking outside.

💡 It's **preview only**. Nothing is sent anywhere.

**B8. Look at the timeline so far.** Open **Sealed timeline**.
👀 A green banner `Integrity verified: all N events intact` and the `head seal …` (fingerprint of the whole history).
👀 Rows in order, colour-coded by type: `INCIDENT_CREATED`, `AI_ANALYSIS`, `FACT`, `NOTE`, `TECHNIQUE`, `EVIDENCE_REGISTERED`, `EVIDENCE_TRANSFER`, `STEP_DECISION`…
Each row shows `#number`, type, exact time (seconds, `Z` = UTC), who, phase, the action, any note / "aware at", and `prev <seal> → seal <seal>`. **Each `prev` equals the previous row's `seal`**: that's the chain.
Click **Verify integrity**. 👀 `Re-computing every seal…`, then `Checked <time>`.

### Stage C: The Data Protection Officer decides about people

**C1. Become the DPO.** Name `Priya Nair` · Role **Data Protection Officer**.

**C2. Decide high risk to individuals.** Click **Confirm** on **"High risk to individuals"**, with a basis such as `IBANs + phone numbers enable targeted fraud` → **Confirm determination**.
👀 New card: `GDPR` *Notify affected individuals*, amber **"Without undue delay (no fixed hour count)"**.
💡 Only the DPO can make this call. Try it as the IC and it's locked.

**C3. See the "Not required…" button.** On the **GDPR Notify supervisory authority** card there is now a **Not required…** button (only DPO/Legal see it, and only on duties the law lets you skip).
**Don't click it in this story** (Story 2 uses it). Just notice it exists.

**C4. Retract a fact (practice undo).** Pretend Indian residents turned out not to be affected: click **Retract** on **"Indian residents affected"**, give a reason (minimum 10 characters), e.g. `Re-check: the 3 Indian addresses were test accounts` → **Retract**.
👀 The DPDP cards disappear from the running clocks. The row says `Retracted by Priya Nair · event #N`. In the timeline, **both** the original confirmation and the retraction remain.
Now **confirm it again** (so the rest of the story has DPDP): click **Confirm** → **Confirm determination**. 👀 The DPDP clocks are back.

### Stage D: Notifying regulators (IC / DPO / Legal)

**D1. Record a submission.** As Priya (DPO) or Asha (IC): on the **CERTIN** card click **Mark submitted**.
👀 The dialog says *"Watchman never sends anything to a regulator itself"*. Enter **Reference** `CERTIN-2026-55120` (optional) → **Record submission**.
👀 The card turns blue: **"Submitted on time"**, plus `Recorded by … · ref CERTIN-2026-55120`.
Leave **RBI** open for now.
💡 Analysts can't do this (button faded). The timeline gets a `NOTIFICATION_SUBMITTED` row.

**D2. See a LATE submission.** Click **+24h** in the header (time machine). 👀 A yellow `DEMO +24h` badge. RBI (6h) is now blinking **OVERDUE**, and GDPR/DPDP (72h) have used a third of their time.
- Mark **RBI** submitted → 👀 red **"Submitted LATE"** (24h > 6h).
- Mark **GDPR Notify supervisory authority** submitted → 👀 blue **"Submitted on time"** (24h < 72h).

Click **Now** afterwards. 👀 The badge goes back to grey `DEMO`.
💡 The time machine never edits saved data. It only changes what "now" means. Events recorded while it's on carry an amber note: *"recorded during demo time-travel (+24h)"*.

### Stage E: Writing the compliance report (everyone helps)

**E1. Open the Report tab.** 👀 The header reads `Compliance report` with a `DRAFT` tag.
👀 Progress bar: **"Required items complete: X/Y across N triggered obligations"**, with an amber `N blocking` (or green `Ready to finalise`).
👀 One box per triggered regulator, e.g. *GDPR Art. 33(3) notification content*, *GDPR Art. 34(2) communication to individuals*, *CERT-In incident report*, *RBI cyber incident report*, *DPDP Rules 2025 Rule 7(2)(b) report to the Board*.
Each row shows the item, the **legal clause** (e.g. `Art. 33(3)(a)`), the value, and **where it came from**:
- `from sealed timeline` (blue): filled automatically (awareness time, detection time, indicators);
- `entered by <name>` (green): typed by a human;
- `AI draft: needs human approval` (amber): does **not** count yet;
- `missing` (grey).

💡 **Shared fields fill every box that needs them.** Type "nature of the incident" once and it completes GDPR, CERT-In, RBI and DPDP together.

**E2. Type simple facts (any role, e.g. Ravi the Analyst).** Click the ✏️ pencil on each and **Save**:

| Item | Example value |
|---|---|
| Categories of personal data affected | `Names, IBANs, phone numbers, email addresses` |
| Approximate number of people affected | `48210` (**whole number only**; text gives a red error) |
| Approximate number of records affected | `51377` |
| DPO / contact point details | `Priya Nair, DPO, dpo@contoso-bank.example, +353 1 555 0100` |
| Services / systems affected | `Public accounts export API (api-gw-prod)` |
| Regulatory reporting contact | `Asha Rao, Incident Commander, +44 20 5550 0199` |

**E3. Let the AI draft the hard text.** On **"Nature of the incident / breach"** click ✨ **Draft with AI**.
👀 `Drafting…`, then the row turns amber: **"AI draft: needs human approval"**, and the progress does **not** increase.
👀 If the AI wrote a number that isn't in the confirmed facts, an amber toast appears, *"Draft check: …"*, and the draft is replaced by a safe template.
Click **Review & approve**. 👀 A dialog titled *"Review AI draft"*. Edit the text if needed → **Approve as my statement**.
👀 The row turns green: `entered by <your name>`. It's now *your* statement, sealed under your name.
Repeat for **"Likely consequences for individuals"** (the only other AI-draftable item).

**E4. Fill "measures taken" from the plan.** On **"Measures taken or proposed"** click **From plan**.
👀 The edit box opens pre-filled with `- Done: …` and `- Planned: …` lines built from the steps you ticked or approved in Stage B. Edit if you like → **Save**.

**E5. Finalise.** When the bar is full and green (`Ready to finalise`), become **Asha Rao / Incident Commander** (or DPO/Legal) → click **Finalise & seal** → confirm.
👀 The tag changes to `FINAL · <time> · Asha Rao`, and a `REPORT_FINALIZED` row appears in the timeline.
Finalise is **blocked** (faded, hover to see why) when:
- you're an Analyst;
- any required item is missing or still an unapproved AI draft;
- the audit chain is broken.

**E6. Export the PDF.** Click **Export PDF** (works anytime). 👀 A `Watchman-xxxxxx-FINAL.pdf` (or `-DRAFT.pdf`) downloads. Open it:
- a big diagonal **DRAFT** watermark if not finalised;
- every regulator section with clauses, values and who provided them, with unapproved AI text marked `[AI DRAFT, NOT APPROVED]`;
- the full sealed timeline;
- the **head seal** printed at the end, so anyone can later prove the record hasn't changed since.

**E7. Change after finalising.** Add a timeline note (or edit any report field). Back on Report: 👀 an amber warning, *"Records changed since the report was finalised: re-issue an updated report."*

🎉 **Story 1 complete.** You've used the plan, the facts, the clocks, submissions, the Teams preview, the timeline, evidence and the report.

---

## Part 5: Story 2: ransomware (DORA chain, ransom, SEC, NYDFS)

**The story:** Ransomware encrypted the India loan-processing servers. The attackers claim to have stolen 300 GB of data and demand payment. This story shows the clocks **Story 1 didn't trigger**.

**S2-1.** Click the **Watchman** logo (or **Switch incident**) → click **"Ransomware encrypting core loan servers"** (CRITICAL).

**S2-2.** As **Ravi / Analyst**: **Analyze incident**. 👀 The playbooks will include `PB-RANSOM`. Notice the AI was **not** allowed to suggest "Ransom paid".
Confirm **Cyber incident detected** → 👀 CERT-In 6h + RBI 6h start.
Confirm **Indian residents affected**.

**S2-3. DORA: an EU rule for banks' IT incidents.** As **Asha / Incident Commander**: confirm **"DORA: classified as MAJOR"**.
👀 Card `DORA` *Initial notification* starts. Click its ⚖ citation: 👀 **"Deadline = earliest of: 4h after classification … · 24h after detection …"**. The engine picks whichever comes first.
👀 Below it, *DORA Intermediate report* appears as a grey card with **⏳ waiting for …** (the initial report's submission). *DORA Final report* waits in turn for the intermediate one.

**S2-4. The DORA chain.** Mark **DORA Initial notification** submitted.
👀 **DORA Intermediate report** starts: **72h counted from your submission time**. Mark it submitted too.
👀 **DORA Final report** starts: **1 month** after the intermediate report.
💡 Some clocks start from *your own previous report*, not from a fact. The card says "Started by <that submission>".

**S2-5. Ransom paid (NYDFS, New York).** Still as IC (or Legal): confirm **"Ransom / extortion paid"**.
👀 `NYDFS` *Notice of extortion payment*: **24h**.

**S2-6. Legal's decisions.** Become **Daniel Okafor / Legal Counsel**.
Confirm **"NYDFS: reportable incident determined"** → 👀 `NYDFS` *Notify DFS*: **72h**.
Confirm **"SEC: determined MATERIAL"** → 👀 `SEC` *File Form 8-K Item 1.05*: **4 business days** (weekends skipped; verify tag).
💡 Only Legal can make the SEC call. Try as IC: locked.

**S2-7. Personal data + "Not required" (waiver).**
1. As **Priya / DPO**: confirm **Personal-data breach confirmed** and **EU/EEA residents affected**. 👀 The GDPR 72h clock starts.
2. Pretend forensics found the stolen data was strongly encrypted. On the GDPR *Notify supervisory authority* card click **Not required…**.
3. 👀 The dialog shows the allowed legal exception. Type a justification of **at least 20 characters**, e.g. `Exfiltrated archive was AES-256 encrypted and the key was not compromised; unlikely to result in a risk to individuals.` → **Record decision**.
4. 👀 The card turns grey: **"Not required (documented)"** with Priya's name and quote. It's sealed as `OBLIGATION_WAIVED`.

💡 Only GDPR's authority notice has a legal exception, so other cards don't show this button. Analysts and ICs never see it.

**S2-8. Report differences.** Open **Report**. 👀 New sections:
- *DORA initial notification* (needs **Number of clients affected** + automatic detection and classification times);
- *NYDFS 500.17(a) notice*;
- *Form 8-K Item 1.05 disclosure*, which needs **"Material aspects: nature, scope, timing, impact"**. Its pencil is 🔒 **Legal only**. As Daniel, write it.

The waived GDPR section is no longer required.

**S2-9.** Use the **Teams alert** now: 👀 its colour is red ("Attention") because a deadline is under 12h away.

---

## Part 6: Story 3: CFO email takeover, your own incident, Sentinel import

### 6.1 Business email compromise
**S3-1.** Open **"CFO mailbox takeover after invoice phishing"** (MEDIUM) → **Analyze incident**.
👀 Playbook `PB-BEC`. Steps like resetting sessions and removing the forwarding inbox rule.
**S3-2.** Confirm only **Cyber incident detected**. 👀 Just CERT-In + RBI. No personal-data clocks until a human decides personal data was involved.
💡 The same app gives a completely different set of duties for a different incident, because the deadlines come from the rulebook, not from the AI.

### 6.2 Report your own incident
**S3-3.** First screen → **Report a new incident** box:
- **Title**: `Contractor copied customer list to USB`
- **What happened?**: `HR reported that a departing contractor copied a CSV of 2,000 customer emails to a personal USB stick on 5 Oct.`
- **Severity** dropdown: `HIGH` → **Open incident**.

**S3-4.** **Analyze incident**. 👀 The playbook chosen should be `PB-INSIDER` (insider theft). Playbooks also exist for third-party/supplier compromise (`PB-THIRDPARTY`), triggered by words like "vendor", "supplier", "SaaS".
Try another custom incident mentioning a supplier to see `PB-THIRDPARTY`.

### 6.3 Paste a Sentinel / Defender incident
**S3-5.** Open `demo-evidence/sentinel-incident-4127.json` in a text editor, copy **everything**, paste it into **Paste a Sentinel / Defender incident** → **Import as incident**.
👀 A new incident with the title/description/severity taken directly from the JSON (no AI involved).
Paste nonsense instead: 👀 red toast *"That is not valid JSON…"*.

### 6.4 Recent incidents
**S3-6.** Click the **Watchman** logo. 👀 **Recent incidents** (right column) lists everything you opened, newest first. Click one to reopen it exactly as you left it.

---

## Part 7: The "prove it's safe" demos

These are the moments judges remember. Use a **throw-away incident** for 7.1, because tampering is permanent for that incident (by design).

### 7.1 Insider tampering → caught
1. Open an incident where you've confirmed **Personal-data breach confirmed** (e.g. a fresh copy of Story 1 up to B5).
2. Click **+60h** in the header. 👀 CERT-In/RBI are blinking OVERDUE; GDPR (72h) is red with only ~12h left.
3. Click **☠ Rogue DB edit** (header, red).
   👀 A toast tells the story: *"Moved the 'personal_data_breach' awareness time in event #N 30 hours later … to make a missed deadline look on-time."*
   👀 GDPR suddenly shows ~42h left and looks comfortable. That's what the forger wanted.
   👀 **But:**
   - the header badge turns into a blinking red **AUDIT CHAIN BROKEN**;
   - the clock panel shows a red banner, *"…computed from timeline data that may have been altered. Do not rely on them…"*;
   - the *Sealed timeline* tab gets a red dot.
4. Click the red badge (it jumps to the timeline) → **Verify integrity**.
   👀 A red banner, **"TAMPERING DETECTED: …"**. The edited row is dark red with **"✖ SEAL BROKEN: modified after recording"**, and every later row is marked **"untrusted (after break)"**.
5. Go to **Report**: 👀 *"Audit chain broken: a report cannot be finalised on untrusted data."* **Finalise** is blocked.
6. Click **Now** to turn the time machine off.

💡 How does it know? Each seal is computed with a secret key (`CHAIN_SECRET`) that a database administrator doesn't have. Changing the data without re-sealing breaks the math. (If the incident had no confirmed facts, Rogue edit instead silently rewrites the last event's text. It's caught the same way.)

### 7.2 Swapped evidence → caught
1. **Evidence** tab → on the `waf-export-2026-10-06.csv` card click **Re-verify file** → pick the **same** file.
   👀 Green toast *"✓ … matches the registered fingerprint"*, and the card says `Intact: re-verified by <you> at <time>`.
2. Click **Re-verify file** again → pick `waf-export-2026-10-06.ALTERED.csv` (identical except **one line deleted**).
   👀 Red toast *"✖ MISMATCH … It has been altered or substituted"*, and the card turns red: `MISMATCH: presented file differs from the registered evidence`.

Both checks are sealed (`EVIDENCE_VERIFIED`).

### 7.3 Fake attacker codes → caught
In the ATT&CK box:
- `T1086` → **Tag** → 👀 amber **revoked → remapped** `→ T1059.001` (an old retired code auto-updated to the current one).
- `T1999` → **Tag** → 👀 red, crossed out **rejected** (doesn't exist, the kind of thing an AI makes up).
- Tag the same valid code twice → 👀 red toast "already mapped".

### 7.4 AI made-up facts → caught
After **Analyze incident**, read the red **AI output checks** box. Typical entries:
- `Rejected indicator "…": not present in the incident data` (AI invented an IP)
- `Summary contains the figure "…", which does not appear in the incident data`
- `Blocked: AI may not suggest "SEC: determined MATERIAL" (human-only determination)`
- `Dropped AI step that duplicates approved step PB-…`

Click **Re-analyze** to run it again. Results can differ in `live` mode; the checks apply every time.

---

## Part 8: Button-by-button reference

### 8.1 Header

| Control | What happens when you click |
|---|---|
| 🛡 **Watchman** logo | Closes the incident, returns to the first screen. Nothing is lost. |
| Green chip **`phi4-mini · on-device`** | Info only (hover for a tooltip). Grey instead of green = a cloud provider is configured. |
| **DEMO** badge | Info only. Turns yellow `DEMO +Nh` when the time machine is on. |
| **Now / +6h / +24h / +60h** | Time machine. Pretends N hours have passed, for **all** incidents, until you click **Now** or restart the server. Saved data is never changed. A toast confirms. |
| **☠ Rogue DB edit** | (Only inside an incident.) Simulates an insider editing the database directly. Permanent for that incident. Needs ≥ 2 timeline events. |
| **Name box** | Who you are. Recorded on every action. Also used to check who holds evidence. |
| **Role dropdown** | Analyst / Incident Commander / Data Protection Officer / Legal Counsel. Changes what you're allowed to do. |

*Demo controls only appear when `DEMO_MODE=1`.*

### 8.2 First screen

| Control | Result |
|---|---|
| Alert card (×3) | Creates a **new** incident from that scenario each time you click. Clicking twice = two incidents (find them under Recent). |
| **Report a new incident**: Title, description, severity, **Open incident** | Creates an incident from your text. Title and description are required. |
| **Paste a Sentinel / Defender incident** → **Import as incident** | Creates an incident from pasted JSON. The button stays disabled while the box is empty. |
| **Recent incidents** list | Reopens an existing incident. |

### 8.3 Incident top strip

| Control | Result |
|---|---|
| `Incident xxxxxx · opened … · SEVERITY` | Info: the last 6 characters of the ID, when it was opened, the severity. |
| **Integrity badge** | Green `Audit chain intact · N events` / red blinking `AUDIT CHAIN BROKEN`. Click → jumps to Sealed timeline. |
| **Switch incident** | Back to the first screen. |

### 8.4 Clock panel ("Who must we tell, and by when?")

| Element | Meaning / action |
|---|---|
| Sub-title "Deterministic rule engine · rule pack 2026.10-hackathon (reviewed 2026-10-06)" | Which version of the law rulebook is in use. |
| `N clocks running`, `N OVERDUE` | Counters (top right). |
| **Teams alert** | Opens the Teams card preview (only when at least one clock is running). |
| Red banner "Audit chain integrity is broken…" | Shown after tampering: don't trust these deadlines. |
| **Green / orange / red / blinking card** | A running clock. Colours: > 50% time left / < 50% / < 25% or < 1h / overdue. |
| **Amber card "Without (undue) delay"** | The law says "promptly" with no hour count. |
| **Card "⏳ waiting for …"** | Starts after an earlier report is submitted (DORA chain). |
| **Blue "Submitted on time / LATE"** | Done. Shows who recorded it and the reference. |
| **Grey "Not required (documented)"** | Waived, with the justification. |
| **verify** tag (hover) | The legal reading has some uncertainty; a lawyer should double-check. |
| **⚖ citation** link | Expands plain English, legal text, "deadline = earliest of" (if several), exception, and the source link. |
| **Mark submitted** | IC / DPO / Legal. Asks for an optional reference number. |
| **Not required…** | DPO / Legal, only on duties with a legal exception. Needs a 20+ character justification. |
| **▸ Watching N more obligations** | Duties that could apply, and which decisions they still need. |
| Small grey text at the bottom | Disclaimer: the rulebook is a hackathon model, not legal advice. |

### 8.5 Key determinations panel

| Element | Meaning / action |
|---|---|
| Purple **"AI suggests" / "Keyword rule suggests"** card | Appears after Analyze. **Confirm** (opens the confirm dialog with the AI's reasoning as a hint) or **Dismiss** (sealed). |
| 9 rows (question text in grey under each) | Hover a row's button to see the help text. |
| **Confirm** | Dialog: awareness time (UTC, not in the future) + optional basis → **Confirm determination**. |
| 🔒 **Confirm** (faded) | Your role isn't allowed. Hover to see who is. |
| `YES · name (role) · aware … · event #N` | Confirmed. |
| **Retract** | Dialog with a reason (≥ 10 chars). Stops the clocks it started. The history stays. |
| `Retracted by … · event #N` | Retracted (you can confirm again later). |

### 8.6 Response plan tab

| Element | Meaning / action |
|---|---|
| **Analyze incident / Re-analyze** | Runs the AI (or replay/fallback). Builds the plan from playbooks. Sealed as `AI_ANALYSIS`. |
| Mode badge `live` / `recorded replay` / `rules fallback (no AI)` | Where the answer came from (see Part 11). |
| `playbooks: PB-… + PB-CORE` | Which checklists were used. PB-CORE always applies. |
| Summary + grey indicator chips | AI draft text + verified clues. |
| Amber small text under the summary | Notes (e.g. "Deterministic keyword fallback"). |
| Red **AI output checks** box | Everything rejected. |
| **ATT&CK box**: Tag ID input + **Tag**, **Navigator layer**, ✓ / ✕, ↗ | See Stage B4 and 7.3. |
| `X/N steps done` | Progress (rejected steps don't count). |
| ⭕ / ✓ circle | Mark done / reopen (any role). |
| 👍 / 👎 | Approve / reject (IC only, only while the step is "proposed"). |
| Grey `PB-XXX-N` badge vs amber "AI-proposed" | Approved checklist step vs AI extra (max 3 extras). |

### 8.7 Sealed timeline tab

| Element | Meaning / action |
|---|---|
| Green / red banner + `head seal …` | Current integrity + fingerprint of the entire history. |
| **Verify integrity** | Re-computes every seal now; shows `Checked <time>`. |
| Text box + phase dropdown + **Seal into timeline** | Adds a `NOTE` event (any role). |
| Row colours | Normal / dark red **SEAL BROKEN** / faded red **untrusted (after break)**. |
| Type tags | `INCIDENT_CREATED`, `FACT`, `NOTE`, `AI_ANALYSIS`, `AI_SUGGESTION_DISMISSED`, `STEP_DECISION`, `TECHNIQUE`, `EVIDENCE_REGISTERED`, `EVIDENCE_TRANSFER`, `EVIDENCE_VERIFIED`, `NOTIFICATION_SUBMITTED`, `OBLIGATION_WAIVED`, `REPORT_FIELD`, `REPORT_FINALIZED`. |
| Amber "recorded during demo time-travel (+Nh)" | That event happened while the time machine was on. |

### 8.8 Evidence tab

| Element | Meaning / action |
|---|---|
| Dashed drop box | Drag a file or click to choose → fingerprint dialog → **Register & seal**. |
| Evidence card | Name, size, source, SHA-256, description, storage location. |
| Custody line `A · collected … → B · … → C` | Every holder in order (hover a hand-over to see its reason). `Current custodian` on the right. |
| **Re-verify file** | Pick a file → match ✅ / mismatch ❌ (any role). |
| **Hand over** | Receiving custodian + reason. Current holder (exact name) or IC only. |
| Red line "Registry record differs from the sealed registration event" | The evidence entry was edited in the database directly. |

### 8.9 Report tab

| Element | Meaning / action |
|---|---|
| `DRAFT` / `FINAL · time · name` tag | Report status. |
| **Finalise & seal** | IC / DPO / Legal, when complete and the chain is intact. |
| **Export PDF** | Downloads the PDF at any time (`Preparing PDF…` first). |
| Progress bar + `N blocking` / `Ready to finalise` | Completeness. |
| Amber "Records changed since the report was finalised" | Re-issue needed. |
| Red "Audit chain broken: … cannot be finalised" | Tampering detected. |
| Regulator sections with `done/total` | One per triggered duty that has a report format. |
| ✏️ pencil | Type the value (any role; numbers must be whole; 🔒 materiality = Legal only). |
| ✨ **Draft with AI** | Only "Nature of the incident" and "Likely consequences". |
| **Review & approve** | Turns an AI draft into your statement. |
| **From plan** | Pre-fills "Measures taken" from done/approved steps. |
| Footer "Acting as …" | Reminder of who will be recorded. |

### 8.10 Pop-ups

| Pop-up | Buttons |
|---|---|
| Any dialog | Fields + **Cancel** / a confirm button. Required fields and minimum lengths are checked before it closes. |
| Teams preview | **Copy card JSON**, **Show / Hide JSON**, ✕ |

---

## Part 9: Rulebook cheat-sheet

**Which decisions start which clocks** (exactly as coded in `watchman_1/server/src/rules/regulations.json`):

| Law (tag) | Duty | Needs ALL of these decisions | Deadline |
|---|---|---|---|
| CERT-In (`CERTIN`) | Report to CERT-In | Cyber incident detected | **6h** from detection |
| RBI (`RBI`) ⚠verify | Report to RBI | Cyber incident detected | **6h** from detection |
| GDPR (`GDPR`) | Notify supervisory authority | Personal-data breach + EU/EEA residents | **72h** from breach awareness · *can be waived by DPO/Legal* |
| GDPR (`GDPR`) | Notify affected individuals | Breach + EU/EEA + High risk to individuals | "Without undue delay" |
| DPDP India (`DPDP`) ⚠verify | Intimate Board & affected people | Breach + Indian residents | "Without delay" |
| DPDP India (`DPDP`) ⚠verify | Detailed report to Board | Breach + Indian residents | **72h** from breach awareness |
| DORA EU (`DORA`) | Initial notification | Cyber incident + DORA major | **earliest of** 4h from classification / 24h from detection |
| DORA EU (`DORA`) | Intermediate report | DORA major | **72h** after the initial report is **submitted** |
| DORA EU (`DORA`) | Final report | DORA major | **1 month** after the intermediate report is **submitted** |
| NYDFS New York (`NYDFS`) | Notify DFS | NYDFS reportable | **72h** |
| NYDFS New York (`NYDFS`) | Notice of extortion payment | Ransom paid | **24h** |
| SEC USA (`SEC`) ⚠verify | Form 8-K Item 1.05 | SEC material | **4 business days** |

**Which report sections each duty needs** (Report tab):

| Section | Items |
|---|---|
| GDPR Art. 33(3) | nature, data categories, # people, # records, DPO contact, likely consequences, measures taken, *awareness time (auto)* |
| GDPR Art. 34(2) | nature, DPO contact, likely consequences, measures taken |
| DORA initial | nature, services affected, # clients affected, reporting contact, *detection time (auto)*, *classification time (auto)* |
| CERT-In | nature, services affected, reporting contact, *indicators (auto)*, *detection time (auto)* |
| RBI | nature, services affected, measures taken, *detection time (auto)* |
| DPDP Rule 7(2)(b) | nature, # people, likely consequences, measures taken, DPO contact |
| NYDFS 500.17(a) | nature, services affected, measures taken, reporting contact |
| SEC 8-K 1.05 | materiality assessment (**Legal only**) |

*Duties without a row here (DPDP intimation, DORA intermediate/final, NYDFS extortion) have a clock but no report section in this version.*

---

## Part 10: Permissions table

Enforced by the server. ✅ = allowed.

| Action | Analyst | Incident Commander | DPO | Legal |
|---|:-:|:-:|:-:|:-:|
| Open / import incidents, Analyze | ✅ | ✅ | ✅ | ✅ |
| Confirm/retract **Cyber incident detected** | ✅ | ✅ | | |
| Confirm/retract **Personal-data breach** | | ✅ | ✅ | |
| Confirm/retract **EU/EEA** or **Indian residents** | ✅ | ✅ | ✅ | |
| Confirm/retract **High risk to individuals** | | | ✅ | |
| Confirm/retract **DORA major** | | ✅ | | |
| Confirm/retract **NYDFS reportable**, **Ransom paid** | | ✅ | | ✅ |
| Confirm/retract **SEC material** | | | | ✅ |
| Dismiss a suggestion | ✅ | ✅ | ✅ | ✅ |
| Approve / reject plan steps | | ✅ | | |
| Mark steps done/reopen, log notes, tag/review ATT&CK | ✅ | ✅ | ✅ | ✅ |
| Register / re-verify evidence | ✅ | ✅ | ✅ | ✅ |
| Hand over evidence | holder | ✅ any | holder | holder |
| Mark submitted | | ✅ | ✅ | ✅ |
| "Not required" (waive) | | | ✅ | ✅ |
| Edit report fields / ask AI drafts | ✅ | ✅ | ✅ | ✅ |
| Write SEC materiality assessment | | | | ✅ |
| Finalise report | | ✅ | ✅ | ✅ |

**The AI may never suggest:** High risk, DORA major, NYDFS reportable, SEC material, Ransom paid.

---

## Part 11: The AI: modes, badges and what gets caught

### 11.1 Where answers come from (`AI_MODE` in `.env`)

| Mode badge | When | What it means |
|---|---|---|
| 🟢 **live** | `AI_MODE=live` and Ollama answers | Fresh answer from phi4-mini on your laptop. |
| 🟠 **recorded replay** | AI slow/off, or `AI_MODE=replay` | A saved AI answer for that scenario (`data/ai-cache/`). Good for offline demos. |
| ⚪ **rules fallback (no AI)** | No AI and no saved answer, or `AI_MODE=fallback` | Pure keyword matching. Always works. |

The app **never breaks** because of the AI. It just steps down a level.

### 11.2 What the AI is allowed to do
- choose which playbooks fit (max 2 + PB-CORE);
- add tailoring notes to approved steps;
- propose up to 3 extra steps (shown amber);
- propose ATT&CK codes (checked against MITRE);
- extract indicators (each one must literally appear in the alert);
- suggest *some* facts (never the human-only ones);
- draft two report texts (counted only after a human approves).

### 11.3 What gets thrown out (red "AI output checks" box)

| Message starts with | Meaning |
|---|---|
| `Ignored unknown playbook` / `Model gave step id … instead of a playbook id` | AI named a checklist that doesn't exist (or confused names); fixed or ignored |
| `Dropped second playbook … nothing in the incident text supports it` | AI over-reached |
| `Discarded note for unknown step` / `Re-attached AI note … (better match)` | Note pointed at a wrong step |
| `Discarded a malformed AI-proposed step` / `Dropped AI step that duplicates…` / `…beyond the limit of 3` | Junk, duplicate or too many extras |
| `Rejected T…: its evidence quote … is not in the incident text` | AI justified a technique with a made-up quote |
| `Rejected ATT&CK ID` | Code doesn't exist |
| `Rejected indicator … not present` / `not a valid ip/url/…` | Invented or malformed clue |
| `Rejected suggestion of unknown fact` / `Blocked: AI may not suggest…` | AI tried to make a legal call |
| `Summary contains the figure …` | AI invented a number |

---

## Part 12: Settings you can change (`.env`)

File: `watchman_1/server/.env` (created by `npm run setup`). **Never share or commit it.** Restart the server (`Ctrl+C`, `npm start`) after changing it.

| Setting | Values | Effect |
|---|---|---|
| `DEMO_MODE` | `1` / `0` | Show/hide the time machine and Rogue DB edit. Use `0` to show "the real product". |
| `AI_MODE` | `live` / `replay` / `fallback` | See 11.1. Use `replay` for a guaranteed-fast demo. |
| `LLM_PROVIDER` | `ollama` / `azure` / `gemini` | Where the AI runs. `ollama` = on the laptop (green chip). Others need keys in `.env`. |
| `OLLAMA_MODEL` | e.g. `phi4-mini` | Which local model to use. |
| `CHAIN_SECRET` | long random text | The sealing key. **Changing it makes every existing incident show "chain broken"** (by design). |
| `PORT`, `MONGO_URI` | | Where the server listens / the database lives. Leave as-is. |

---

## Part 13: When something looks wrong

| You see | Why / fix |
|---|---|
| Red toast "Server unreachable" | Server terminal stopped → `npm start` in `watchman_1/server`. |
| Server says "Failed to connect to MongoDB" | Database terminal stopped → `npm run db`. |
| "CHAIN_SECRET is not set" | Run `npm run setup` in `watchman_1/server`. |
| Analyze shows replay/fallback | AI off or slow → `ollama serve`, `ollama pull phi4-mini`. The app still works either way. |
| Red toast "Only X may …" | Wrong role. Switch role in the header. |
| Red toast "awareAt cannot be in the future" | You typed a time later than "now". Pick an earlier time. |
| Red toast "Only the current custodian (…)" | Your name box doesn't exactly match the holder's name. Type it exactly, or switch to IC. |
| Every clock suddenly red/overdue | Time machine is on (yellow `DEMO +Nh`) → click **Now**. |
| Old incidents all show "AUDIT CHAIN BROKEN" | `CHAIN_SECRET` changed, or you used Rogue edit on them. Open fresh incidents. |
| Finalise stays faded | Hover it: wrong role, items missing, AI drafts unapproved, or the chain is broken. |
| "Port … already in use" / Vite moves to 5174 | A second copy is running. Close the old terminal (check with the `ss` command in 1.3). |
| Page looks empty after a refresh | The incident ID in the URL may be gone. Pick it from **Recent incidents**. |

---

## Part 14: "I've seen everything" checklist

Tick these off and you've used **every** feature:

**Setup**
- [ ] Started database, server, website; `/health` OK; one copy of each port
- [ ] Green `phi4-mini · on-device` chip

**Opening incidents**
- [ ] Opened each of the 3 alert cards
- [ ] Created my own incident
- [ ] Imported the Sentinel JSON
- [ ] Reopened one from Recent incidents

**Plan & AI**
- [ ] Analyze / Re-analyze; read the mode badge, summary, indicator chips
- [ ] Read the AI output checks box
- [ ] Approved 👍, rejected 👎 (as IC); tried as Analyst (blocked)
- [ ] Ticked a step done and reopened it
- [ ] Tagged T1190 (valid), T1086 (remapped), T1999 (rejected); confirmed ✓ / removed ✕ a technique
- [ ] Downloaded the Navigator layer

**Decisions & clocks**
- [ ] Confirmed and dismissed a suggestion
- [ ] Confirmed all 9 decisions across the right roles (Stories 1 + 2)
- [ ] Retracted a fact and re-confirmed it
- [ ] Opened a ⚖ citation (plain English, legal text, source)
- [ ] Saw "Without delay" cards, "waiting for" cards and the DORA chain
- [ ] Mark submitted (on time and LATE)
- [ ] "Not required…" waiver as DPO
- [ ] Expanded "Watching N more obligations"
- [ ] Teams alert preview, Copy/Show JSON

**Timeline & evidence**
- [ ] Logged a manual action; Verify integrity
- [ ] Registered 2 evidence files; tried a duplicate
- [ ] Handed over (and was blocked when not the holder)
- [ ] Re-verify: match ✅ and mismatch ❌ (ALTERED file)

**Report**
- [ ] Typed fields (and tried text in a number field)
- [ ] Draft with AI → Review & approve
- [ ] From plan
- [ ] SEC materiality as Legal (locked for others)
- [ ] Finalise & seal; Export PDF (DRAFT and FINAL); saw "changed since final"

**Demo tricks**
- [ ] Time machine +6h / +24h / +60h / Now
- [ ] Rogue DB edit → chain broken → SEAL BROKEN rows → finalise blocked

🎉 If every box is ticked, you know Watchman better than most of the people you'll demo it to.
