# Watchman: Incident Response & Breach-Notification Assistant

> **Hackathon problem #27, "The Clock Is Running".** When a bank gets hacked, Watchman tells the team **what to do next**, **which regulators must be told and by when**, keeps a **tamper-proof record** of everything, and produces a **compliance-ready report**.

This README is the **one file you need**. It explains, in plain words:

1. [What this project is (the story)](#1-what-is-this-the-30-second-story)
2. [The 4 big ideas](#2-the-4-big-ideas-why-its-special)
3. [How the pieces fit together](#3-how-the-pieces-fit-together)
4. [Install it from zero](#4-install-it-from-zero-one-time-only)
5. [Start it every time](#5-start-it-every-time)
6. [A tour of the website, button by button](#6-a-tour-of-the-website-button-by-button)
7. [Who is allowed to do what (roles)](#7-who-is-allowed-to-do-what-roles)
8. [Practice run: 10 minutes, step by step](#8-practice-run-10-minutes-step-by-step)
9. [The 3-minute demo for judges](#9-the-3-minute-demo-for-judges)
10. [How it works inside (for teammates who code)](#10-how-it-works-inside-for-teammates-who-code)
11. [Words you'll hear (mini glossary)](#11-words-youll-hear-mini-glossary)
12. [When something breaks](#12-when-something-breaks)
13. [Pushing to GitHub safely](#13-pushing-to-github-safely)
14. [Judge questions & answers](#14-judge-questions--answers)

---

## 1. What is this? (the 30-second story)

Imagine you work at a bank. At 2 a.m. an alarm goes off: someone is downloading customer data. Now three groups of people need answers **fast**:

| Who | What they need |
|---|---|
| **Responders** (the security team) | "What do we do next?" Block the attacker, save the evidence, fix the hole. |
| **Lawyers & the Data Protection Officer** | "Which regulators must we tell, and by when?" Some laws give **72 hours**, some in India only **6 hours**. Missing a deadline = big fines. |
| **Auditors** (later) | "Prove what you did, when, and that nobody secretly changed the record afterwards." |

**Watchman does all three in one screen.**

---

## 2. The 4 big ideas (why it's special)

Most hackathon teams will build "an AI chatbot that writes steps and a report". That's risky in a bank, because AI sometimes **makes things up** (this is called *hallucinating*): a wrong deadline, a fake attack code, a made-up number in a legal report.

Watchman's motto is:

> **Deterministic where the law is, AI where judgement helps, cryptographic where trust matters.**

In baby terms:

| # | Idea | What it means | Everyday analogy |
|---|---|---|---|
| 1 | **Deadlines come from a rulebook, not the AI** | We typed the laws (GDPR, DORA, CERT-In, RBI, DPDP, NYDFS, SEC) into a rulebook. The same input always gives the same deadline. | A calculator, not a guess |
| 2 | **The AI only suggests; humans decide** | The AI can say "looks like customer data was stolen, confirm?". A **named person** must click Confirm. Only then does a legal clock start. | A junior assistant who can point, but can't sign |
| 3 | **The AI is fact-checked** | Everything the AI says is checked: steps must come from approved checklists, attack codes must exist in MITRE's official list, numbers must match the facts. Anything wrong is thrown out and shown in a red box. | A teacher marking homework |
| 4 | **History can't be secretly edited** | Every action is "sealed" with a fingerprint that includes the previous action's fingerprint. Edit any old entry and the chain visibly breaks. | Wax seals on every page of a logbook |

**Bonus:** the AI (Microsoft's **Phi-4-mini**) runs **on the laptop itself** through a free tool called **Ollama**. Customer data never leaves the machine, and the demo works without internet. If the AI is slow or missing, the app still works (it uses saved answers or simple keyword rules).

---

## 3. How the pieces fit together

```
   YOU (in a web browser)
        │  http://localhost:5173
        ▼
 ┌──────────────────────┐        ┌───────────────────────────┐
 │  WEBSITE  (client/)  │  ───►  │  SERVER  (watchman_1/server)│
 │  React + Tailwind    │  /api  │  Node.js + Express          │
 │  what you see & click│ ◄───   │  rules, checks, sealing     │
 └──────────────────────┘        └───────┬─────────────┬───────┘
                                          │             │
                                          ▼             ▼
                              ┌─────────────────┐  ┌──────────────────┐
                              │  DATABASE       │  │  AI MODEL        │
                              │  MongoDB        │  │  Ollama +        │
                              │  (on laptop)    │  │  Phi-4-mini      │
                              │  port 27017     │  │  port 11434      │
                              └─────────────────┘  └──────────────────┘
```

- **Website (client)**: the pages and buttons. It never decides anything important; it just shows what the server says.
- **Server**: the brain. It holds the law rulebook, the playbooks, the fact-checking, and the sealing.
- **Database (MongoDB)**: where incidents are saved, on your laptop in the folder `.mongo-data/`.
- **AI model (Ollama + Phi-4-mini)**: optional helper. If it's off, the app falls back automatically.

### Folder map (only the parts that matter)

```
watchman/
├── README.md                ← this file
├── client/                  ← THE WEBSITE
│   └── src/
│       ├── App.jsx                    page layout, header, tabs
│       └── components/
│           ├── ScenarioPicker.jsx     first screen (incoming alerts)
│           ├── ObligationsPanel.jsx   the countdown clocks
│           ├── FactsPanel.jsx         "Key determinations" (human decisions)
│           ├── NistPlaybook.jsx       Response plan tab
│           ├── AttackPanel.jsx        MITRE ATT&CK box
│           ├── AuditTimeline.jsx      Sealed timeline tab
│           ├── EvidencePanel.jsx      Evidence tab
│           ├── ReportPanel.jsx        Report tab
│           ├── ComplianceReportPDF.jsx the PDF layout
│           └── TeamsCardPreview.jsx   Microsoft Teams alert preview
├── watchman_1/
│   ├── .env.example         ← settings template (copy → .env, never commit .env)
│   └── server/              ← THE SERVER
│       ├── src/
│       │   ├── server.js              starts everything
│       │   ├── rules/                 THE LAW RULEBOOK (plain JSON, lawyers can read it)
│       │   │   ├── regulations.json      deadlines + legal citations
│       │   │   ├── facts.json            the 9 human decisions that start clocks
│       │   │   └── reportFields.json     what each regulator's report must contain
│       │   ├── data/
│       │   │   ├── playbooks/            6 approved response checklists
│       │   │   ├── scenarios/            3 sample incidents (Sentinel-style)
│       │   │   ├── attack.min.json       MITRE's official attack list (compact)
│       │   │   └── ai-cache/             saved AI answers for offline demos
│       │   ├── services/              the logic (clock engine, AI, report…)
│       │   ├── controllers/ routes/   the API the website calls
│       │   └── utils/cryptoChain.js   the tamper-proof sealing
│       └── test/                      automated tests (npm test)
├── demo-evidence/           ← sample files to drag into the Evidence tab
└── docs/                    ← extra detail (build log, plan, screenshots)
```

---

## 4. Install it from zero (one time only)

### 4.1 Install these 4 programs first

| Program | Why | Get it | Check it worked (type in a terminal) |
|---|---|---|---|
| **Git** | download the project | git-scm.com | `git --version` |
| **Node.js** (version 20 or newer; LTS is fine) | runs the server and website | nodejs.org | `node --version` |
| **MongoDB Community Server** | the database | mongodb.com/try/download/community | `mongod --version` |
| **Ollama** (optional but recommended) | runs the AI on your laptop | ollama.com/download | `ollama --version` |

> **Windows users:** the MongoDB installer usually sets it up as a "service" that is **always running**. Then you can skip the "start the database" step later. **Mac:** `brew install mongodb-community ollama` works too.

### 4.2 Get the code

```bash
git clone https://github.com/777mudit/watchman.git
cd watchman
```

### 4.3 Install the server

```bash
cd watchman_1/server
npm install          # downloads the libraries (takes ~1 minute)
npm run setup        # creates watchman_1/.env with a fresh secret key
```

`npm run setup` copies `watchman_1/.env.example` to `watchman_1/.env` and fills in a random `CHAIN_SECRET`. **The `.env` file is private: never send it or commit it.**

### 4.4 Install the website

```bash
cd ../../client
npm install
```

### 4.5 Download the AI model (optional, ~2.5 GB, once)

```bash
ollama pull phi4-mini
```

No Ollama? No problem: the app uses saved answers and keyword rules instead. Everything else works the same.

✅ **Setup done.** You never repeat section 4 again.

---

## 5. Start it every time

You need **3 terminal windows** (plus Ollama, which usually starts by itself).

**Terminal 1: the database**
```bash
cd watchman/watchman_1/server
npm run db
```
Leave it open. It looks "stuck"; that's normal, it's running. *(Windows with the MongoDB service: skip this.)*

**Terminal 2: the server**
```bash
cd watchman/watchman_1/server
npm start
```
You should see `Connected to MongoDB database` and `Incident Response Server running on port 5000`.
Check in a browser: http://localhost:5000/health should show `{"status":"OK"}`.

**Terminal 3: the website**
```bash
cd watchman/client
npm run dev
```
Then open **http://localhost:5173** in Chrome/Edge.

**Ollama:** if `ollama list` works, it's already running. If not, open a 4th terminal and run `ollama serve`.

**To stop everything:** press `Ctrl + C` in each terminal.

> 💡 **Before a demo:** open any incident and click **Analyze incident** once. The first AI call loads the model into memory (10–20 s); after that it takes about 8–10 s.

---

## 6. A tour of the website, button by button

### 6.1 The header (top bar, always visible)

| You see | What it is |
|---|---|
| **Watchman** logo | Click it to go back to the first screen |
| Green chip **`phi4-mini · on-device`** | Which AI model is used. "on-device" = it runs on this laptop and no data leaves |
| **DEMO** badge | Demo mode is on (`DEMO_MODE=1` in `.env`) |
| **Time machine: Now / +6h / +24h / +60h** | *Demo only.* Pretends time has passed so you can see clocks turn red. It **never changes saved data**; it only changes what "now" means. A yellow `DEMO +60h` badge shows when it's on |
| **Rogue DB edit** (red, skull) | *Demo only.* Pretends a bad insider secretly edited the database. Use it to show the tamper alarm |
| **Name box + role dropdown** | **Who you are pretending to be.** Every action is recorded under this name and role. Change the role to see what each person is allowed to do (section 7) |

### 6.2 First screen: "Incoming alerts"

| Area | What to do |
|---|---|
| **3 alert cards** (left) | Realistic incidents in the style of **Microsoft Sentinel / Defender** alerts: customer data leaked through an API, ransomware, CFO email takeover. **Click one to open it as an incident.** |
| **Report a new incident** | Type your own title and description and click **Open incident** |
| **Paste a Sentinel / Defender incident** | Paste incident JSON from Microsoft Sentinel; it becomes an incident (no AI involved) |
| **Recent incidents** | Re-open something you worked on before |

Opening an incident **does not start any legal clock**. That's on purpose (see 6.4).

### 6.3 Incident screen: the top strip

- Small line: incident ID, when it was opened, severity.
- Big title and the alert's description.
- **Integrity badge** (top right):
  - 🟢 **`Audit chain intact · N events`**: nobody has tampered with the record.
  - 🔴 **`AUDIT CHAIN BROKEN`** (blinking): someone edited history. Click it to jump to the timeline.
- **Switch incident**: back to the first screen.

### 6.4 Left panel: "Who must we tell, and by when?" (the clocks)

At first it says **"No regulatory clock is running yet"**. Clocks only start when a person confirms a key fact (next section). When they start, you get **one card per legal duty**:

| Part of a card | Meaning |
|---|---|
| Grey tag, e.g. **`GDPR`**, **`CERTIN`**, **`DORA`** | Which law |
| Title, e.g. "Notify supervisory authority" | What must be done |
| Big countdown, e.g. **`71h 59m 12s`** | Time left. Colour: 🟢 plenty → 🟠 under half → 🔴 under a quarter → 🔴 blinking **OVERDUE** |
| "due Thu 09 Oct 11:16 UTC · 72h" | Exact deadline (always UTC time) and the rule |
| Thin bar | How much of the time is used up |
| "Started by Asha Rao (Incident Commander) confirming '…' · event #3" | **Who started this clock, and why.** Traceable to the sealed timeline |
| Blue ⚖ citation, e.g. "GDPR Art. 33(1)" | **Click it** to see the plain-English meaning, the exact legal wording and a link to the law |
| Orange **verify** tag | This rule has some legal uncertainty; a lawyer should double-check |
| **Mark submitted** button | After *a human* sends the notification to the regulator, click this and record the reference number. **Watchman never sends anything itself.** |
| **Not required…** button | (DPO/Legal only, and only where the law allows it) Record a decision **not** to notify, with a written reason of at least 20 characters |

Other cards you may see:
- 🟡 **"Without delay (no fixed hour count)"**: the law says "promptly" without a number.
- ⏳ **"waiting for submission of DORA_INITIAL"**: this step starts after an earlier report is sent.
- 🔵 **"Submitted on time / LATE"** and ⚪ **"Not required (documented)"**: finished duties.

At the bottom: **"Watching N more obligations"**. Click to see laws that *could* apply and which decision they're waiting for. The **Teams alert** button (top right of the panel) shows a preview of the alert card that would be posted to a Microsoft Teams channel. It's preview only; nothing is sent.

### 6.5 Right panel: "Key determinations" (human decisions)

These **9 yes/no decisions** are the only things that can start a legal clock:

| Decision | Starts which clocks |
|---|---|
| Cyber incident detected | CERT-In 6h, RBI 6h, DORA's 24h outer limit |
| Personal-data breach confirmed | GDPR 72h + DPDP 72h (together with the next two) |
| EU/EEA residents affected | makes GDPR apply |
| Indian residents affected | makes DPDP apply |
| High risk to individuals | GDPR Art. 34: tell the affected people too |
| DORA: classified as MAJOR | DORA initial report (4h) |
| NYDFS: reportable incident determined | New York regulator 72h |
| SEC: determined MATERIAL | US SEC filing in 4 **business** days |
| Ransom / extortion paid | New York regulator 24h |

- **Purple cards at the top** = suggestions. "AI suggests" comes from the AI model; "Keyword rule suggests" comes from simple word matching (e.g. "Ireland" → EU residents). **Confirm** or **Dismiss**.
- **Confirm** opens a box asking **"When did we become aware?"** (legal clocks count from this moment, not from when you click) and an optional reason.
- **Retract** = "turned out not to be true". It stops the clock, but the original decision stays in the record.
- A 🔒 lock means **your current role isn't allowed** to make that decision. Switch role in the header.

### 6.6 Tab 1: Response plan

1. Click **Analyze incident** (blue, top right). The AI reads the alert (~10 s).
2. You get:
   - **Summary box**, with a badge for how the answer was made:
     - 🟢 **live**: fresh from the AI
     - 🟠 **recorded replay**: a saved AI answer, used when the AI is slow, off, or in replay mode
     - ⚪ **rules fallback (no AI)**: keyword matching only

     The summary is marked "AI-written · unverified, never copied into the report". Grey chips show indicators found in the alert (IP addresses, URLs, hosts).
   - 🔴 **"AI output checks: N items caught"**: everything the AI said that failed fact-checking, e.g. a fake attack code, an IP that isn't in the alert, a number it invented. **This box is a highlight of the demo.**
   - **MITRE ATT&CK mapping box** (the attacker's techniques):
     - 🟢 **valid**: real technique (name comes from MITRE, not the AI)
     - 🟠 **revoked → remapped**: an old retired code, auto-updated (try typing `T1086` and clicking **Tag**)
     - 🔴 **rejected** (crossed out): doesn't exist; the AI made it up (try `T1999`)
     - "needs analyst review" with ✓ / ✕: a real code, but a human confirms it fits
     - **Navigator layer**: downloads a file you can open in MITRE's official ATT&CK Navigator website
   - **4 columns = the 4 NIST phases**: 1. Preparation, 2. Detection & Analysis, 3. Containment/Eradication/Recovery, 4. Post-Incident.
3. Each **step card**:
   - Grey badge like **`PB-EXFIL-C1`**: this step comes from an approved playbook (checklist).
   - 🟠 Amber card **"AI-proposed · not in approved playbook"**: an extra idea from the AI. Treat it with care.
   - ✨ Purple note: the AI tailored this step to the incident (e.g. which IP to block).
   - Teal "Evidence to preserve": what to save before fixing things.
   - ⭕ **Circle on the left**: click to mark the step done (records who and when).
   - 👍 / 👎: approve or reject the step (**Incident Commander only**).

### 6.7 Tab 2: Sealed timeline

Every action ever taken, oldest first, each with its **seal** (fingerprint).

- Green banner "**Integrity verified: all N events intact**", or red "**TAMPERING DETECTED: event #X was modified after it was recorded**".
- **Verify integrity** button: re-checks every seal right now.
- **Log an action** box + phase dropdown + **Seal into timeline**: write down something you did ("Blocked IP at firewall").
- Each row: `#number`, type tag (FACT, NOTE, AI_ANALYSIS, EVIDENCE…), time, who, the action, and `prev … → seal …`. Each row's seal includes the previous row's seal; that's the "chain".
- After a tamper, the edited row is **dark red "SEAL BROKEN"**, and every row after it is "untrusted".

### 6.8 Tab 3: Evidence

- **Drop a file** (or click the dashed box). Try `demo-evidence/waf-export-2026-10-06.csv`.
- Your browser computes the file's **SHA-256 fingerprint** (a 64-character code; change one letter in the file and it changes completely). **The file is not uploaded**: only its fingerprint and details are saved.
- Fill in where it came from and where the original is stored → **Register & seal**.
- **Hand over**: give the evidence to someone else (e.g. forensics). Only the current holder or the Incident Commander can do this. The chain of holders is shown as `Asha → Lena → …`.
- **Re-verify file**: pick the file again later. ✅ "Intact" if it's identical; ❌ **MISMATCH** if it was changed. Try `waf-export-2026-10-06.ALTERED.csv` (one line deleted) to see the mismatch.

### 6.9 Tab 4: Report

- Progress bar: **"Required items complete: 6/17"**. Only the regulators whose clocks are running are listed.
- One box per regulator (e.g. "GDPR Art. 33(3) notification content"). Each row shows the **legal clause** (e.g. `Art. 33(3)(a)`), the value, and **where it came from**:
  - "entered by Priya" (a human)
  - "from sealed timeline" (filled automatically, e.g. awareness time)
  - 🟠 "AI draft: needs human approval" (does **not** count until approved)
- Buttons on each row:
  - ✏️ pencil: type the value.
  - ✨ **Draft with AI** (only for "nature of the incident" and "likely consequences"): the AI writes a draft from confirmed facts. If the draft contains a number that isn't in the facts, it's **automatically rejected** and replaced with a safe template.
  - **Review & approve**: read and edit the AI draft, then approve it as your own statement.
  - **From plan**: pre-fills "measures taken" from completed steps.
- **Finalise & seal**: only when everything is filled **and** the audit chain is intact (IC/DPO/Legal only).
- **Export PDF**: downloads the report. Unfinished = big "DRAFT" watermark. The last page shows the **head seal**, a fingerprint of the whole history at that moment.

---

## 7. Who is allowed to do what (roles)

Pick your role in the header's dropdown. The app enforces these rules on the **server**, so they can't be bypassed from the browser.

| Action | Analyst | Incident Commander | DPO | Legal |
|---|:-:|:-:|:-:|:-:|
| Confirm "cyber incident detected" | ✅ | ✅ | | |
| Confirm "personal-data breach" | | ✅ | ✅ | |
| Confirm EU / Indian residents affected | ✅ | ✅ | ✅ | |
| Confirm "high risk to individuals" | | | ✅ | |
| Confirm "DORA: major" | | ✅ | | |
| Confirm "NYDFS reportable" / "ransom paid" | | ✅ | | ✅ |
| Confirm "SEC: material" | | | | ✅ |
| Approve / reject plan steps | | ✅ | | |
| Mark a step done, log notes, tag ATT&CK, register evidence | ✅ | ✅ | ✅ | ✅ |
| Hand over evidence | current holder | ✅ any | current holder | current holder |
| Mark notification submitted | | ✅ | ✅ | ✅ |
| "Not required" decision | | | ✅ | ✅ |
| Write the SEC materiality text | | | | ✅ |
| Finalise the report | | ✅ | ✅ | ✅ |

The **AI may never** suggest "material", "ransom paid", "DORA major", "NYDFS reportable" or "high risk". Those are human-only legal calls.

---

## 8. Practice run: 10 minutes, step by step

Do this once yourself before explaining it to anyone.

1. **Start everything** (section 5) and open http://localhost:5173.
2. In the header, set the name to **Asha Rao** and the role to **Incident Commander**. Make sure the time machine shows **Now**.
3. Click the alert **"Customer records exfiltrated via unauthenticated export API"**.
   👀 Notice: *"No regulatory clock is running yet."*
4. Scroll down to **Response plan** → click **Analyze incident**. Wait ~10 s.
   👀 Look at the grey `PB-…` step badges, any amber AI step, and the red **"AI output checks"** box.
5. In the ATT&CK box, type **`T1086`** → **Tag**. 👀 It turns amber: "revoked → T1059.001". Then type **`T1999`** → **Tag**. 👀 Red, crossed out: it doesn't exist.
6. Scroll up to **Key determinations**. Click **Confirm** on **"Cyber incident detected"** → **Confirm determination**.
   👀 Two clocks start: **CERT-In 6h** and **RBI 6h**.
7. Confirm **"Personal-data breach confirmed"**, **"EU/EEA residents affected"** and **"Indian residents affected"**.
   👀 **GDPR 72h** and **DPDP** start. Read the "Started by Asha Rao…" line on a card. Click the blue citation to see the law.
8. Switch your role to **Analyst** and look at "Personal-data breach": 🔒 locked. Switch back to **Incident Commander**.
9. Click **+60h** in the header. 👀 CERT-In and RBI are **OVERDUE**; GDPR is red.
10. Open the **Evidence** tab. Drag in `demo-evidence/waf-export-2026-10-06.csv` → **Register & seal**. 👀 A 64-character fingerprint appears.
11. Click **Rogue DB edit** in the header.
    👀 GDPR suddenly looks *fine* (the forger moved the "aware" time 30h later), **but** the header shows **AUDIT CHAIN BROKEN**.
12. Open **Sealed timeline** → **Verify integrity**. 👀 The breach event shows **SEAL BROKEN**; everything after it is "untrusted".
13. Click **Now** in the header to turn the time machine off.
14. For the report, open a **fresh** incident (a tampered one correctly refuses to finalise), confirm the same facts, then go to **Report**:
    - Fill the missing items with ✏️, try **Draft with AI** → **Review & approve**, and use **From plan** for "measures taken".
    - When it reaches 100%, click **Finalise & seal** → **Export PDF**.

🎉 You've now used every feature.

---

## 9. The 3-minute demo for judges

(Full version with exact lines to say: [`docs/DEMO.md`](docs/DEMO.md).)

| Time | Show | Say |
|---|---|---|
| 0:00 | The green **on-device** chip | "Every team built an AI that writes steps. Ours is the one a bank's lawyers would allow: the AI suggests, humans decide, rules compute, everything is sealed. And it runs on Microsoft Phi, on this laptop. No customer data leaves." |
| 0:20 | Open the API-leak alert: **no clock running** | "The 72-hour clock legally starts when the bank becomes *aware* of a personal-data breach, not when an alert fires." |
| 0:30 | **Analyze** → playbook steps, red **AI output checks**, tag `T1086` | "Every step comes from an approved checklist. Here's everything the AI got wrong, caught automatically." |
| 0:55 | Confirm the facts → **clocks start** | "Six-hour Indian deadlines, 72-hour GDPR. Each clock shows who started it and the legal article." |
| 1:30 | **+60h** | "We simulate time; we never rewrite stored records." |
| 1:50 | Evidence drop → **Rogue DB edit** → **Verify** | "An insider hides a missed deadline… and the seal breaks." |
| 2:20 | **Report**: clause checklist, AI draft, PDF | "It won't finalise until every legally required item is filled and the chain is intact." |
| 2:50 | Close | "Deterministic where the law is, AI where judgement helps, cryptographic where trust matters." |

---

## 10. How it works inside (for teammates who code)

### 10.1 What happens when you click "Confirm" on a decision
1. The website sends `POST /api/incidents/:id/facts` with `{ key, value, awareAt, actor, role }`.
2. The server checks your **role** is allowed (`rules/facts.json` → `allowedRoles`).
3. It **appends a sealed event** to the timeline (`utils/cryptoChain.js → appendEvent`). The seal = HMAC-SHA256 of the event plus the previous seal, using `CHAIN_SECRET`.
4. The **clock engine** (`services/clockEngine.js`) re-reads all facts **from the sealed timeline** and the rulebook (`rules/regulations.json`) and computes every deadline. It's pure logic: no AI, no randomness.
5. The server sends back the whole incident plus `obligations`, `integrity` and `reportStatus`, and the website redraws.

Because deadlines are computed *from the timeline*, tampering with the timeline both changes the deadlines **and** breaks the seals, so it's always visible.

### 10.2 What happens when you click "Analyze incident"
`services/aiService.js`:
1. Builds a prompt with the playbook catalogue and the alert text.
2. Asks the model (`services/llm/index.js`: Ollama, Azure OpenAI or Gemini, chosen by `LLM_PROVIDER`).
3. If the model fails, it uses the **saved answer** (`data/ai-cache/<scenario>.json`); if there isn't one, it uses **keyword rules**.
4. **Validates everything** (`validateAnalysis`):

   | Check | Rule applied |
   |---|---|
   | Playbook IDs | must exist |
   | Step wording | always the approved text, never the AI's paraphrase |
   | Notes | re-attached to the step they actually match |
   | Duplicate AI steps | dropped |
   | ATT&CK codes | checked against MITRE's data (`services/attackService.js`) and must come with a quote from the alert |
   | Indicators | must literally appear in the alert |
   | Legal facts | the AI is never allowed to suggest them |
   | Numbers in the summary | must exist in the source |

   Anything rejected goes into the red "AI output checks" list.

### 10.3 Main API endpoints (all under `http://localhost:5000/api`)
| Method & path | Does |
|---|---|
| `GET /scenarios` · `GET /meta` · `GET /playbooks` | Sample alerts, rulebook info, playbooks |
| `GET /incidents` · `POST /incidents` · `GET /incidents/:id` | List / create (also from `scenarioId` or pasted `sentinel` JSON) / read |
| `POST /incidents/:id/facts` | Confirm or retract a decision |
| `POST /incidents/:id/obligations/:stageId/submit` · `/waive` | Record a submission / a "not required" decision |
| `POST /incidents/:id/analyze` | AI analysis (validated) |
| `POST /incidents/:id/steps/:stepRef/decision` | approve / reject / done / reopen a step |
| `POST /incidents/:id/techniques` · `/techniques/:inputId/review` | Tag / review ATT&CK codes |
| `POST /incidents/:id/timeline` · `GET /incidents/:id/verify-chain` | Log a note / verify seals |
| `POST /incidents/:id/evidence` · `/evidence/:eid/transfer` · `/evidence/:eid/verify` | Evidence register |
| `POST /incidents/:id/report/fields` · `/report/draft` · `/report/finalize` | Report |
| `POST /demo/clock` · `POST /demo/tamper/:id` | Demo-only controls (`DEMO_MODE=1`) |

### 10.4 Settings (`watchman_1/.env`)
| Setting | Meaning |
|---|---|
| `MONGO_URI` | Database address (local by default) |
| `CHAIN_SECRET` | Secret key for the seals. **Changing it makes old timelines show as tampered** |
| `DEMO_MODE` | `1` = show time machine and Rogue DB edit |
| `LLM_PROVIDER` | `ollama` / `azure` / `gemini` |
| `OLLAMA_MODEL` | `phi4-mini` or `phi3` |
| `AI_MODE` | `live` (normal) / `replay` (saved answers first: most predictable on stage) / `fallback` (no AI) |
| `AI_RECORD` | `1` = overwrite saved AI answers with new live ones |

### 10.5 Tests
```bash
cd watchman_1/server
npm test
```
28 automated tests cover: the seal chain (tampering is caught), every deadline rule (including weekends for the SEC), ATT&CK validation, AI fact-checking (using real wrong answers the model gave), and report completeness.

### 10.6 Updating the MITRE ATT&CK data (rarely needed)
Download `enterprise-attack.json` from github.com/mitre/cti (folder `enterprise-attack`), then:
```bash
node scripts/build-attack.mjs /path/to/enterprise-attack.json
```

---

## 11. Words you'll hear (mini glossary)

| Word | Simple meaning |
|---|---|
| **Incident** | A security problem: hack, leak, ransomware |
| **NIST SP 800-61** | The US standard guide for handling incidents, in 4 phases: Prepare → Detect & Analyse → Contain/Remove/Recover → Learn lessons |
| **Playbook** | A pre-approved checklist for one type of incident |
| **MITRE ATT&CK** | A public encyclopedia of attacker tricks, each with a code (e.g. `T1566` = phishing) |
| **Hallucination** | When an AI confidently says something false |
| **GDPR** | EU privacy law: tell the regulator within **72 hours** of becoming aware of a personal-data breach (Art. 33) |
| **DORA** | EU law for banks' IT incidents: initial report within 4h of calling it "major" (max 24h after detection) |
| **CERT-In / RBI** | India's cyber agency / central bank: report within **6 hours** |
| **DPDP** | India's privacy law: detailed report within 72h |
| **NYDFS** | New York's financial regulator: 72h; 24h if a ransom is paid |
| **SEC 8-K** | US stock-market regulator: disclose within **4 business days** after deciding it's "material" |
| **DPO** | Data Protection Officer: the person responsible for privacy compliance |
| **PII** | Personal data: names, emails, account numbers… |
| **SHA-256 / hash / fingerprint** | A 64-character code computed from a file; any change gives a completely different code |
| **HMAC / seal** | A fingerprint that also uses a secret key, so it can't be faked without the key |
| **Hash chain** | Each record's seal includes the previous record's seal; editing one breaks all later ones |
| **Chain of custody** | The record of who held a piece of evidence, when, and every hand-over |
| **Head seal** | The seal of the newest record; printed in the PDF so anyone can check later that nothing changed |
| **Sentinel / Defender** | Microsoft's security alerting products; our sample alerts are shaped like theirs |
| **Ollama / Phi** | Free tool to run AI models locally / Microsoft's small AI model family |

---

## 12. When something breaks

| Problem | Fix |
|---|---|
| Website says **"Server unreachable"** | Terminal 2 (server) isn't running. Run `npm start` in `watchman_1/server` |
| Server says **"Failed to connect to MongoDB"** | Terminal 1 (database) isn't running. Run `npm run db`. On Windows, start the "MongoDB" service |
| `mongod: command not found` | MongoDB isn't installed or not on your PATH. Reinstall it (section 4.1) |
| Server crashes with **"CHAIN_SECRET is not set"** | Run `npm run setup` in `watchman_1/server` |
| **Analyze** is slow or shows "recorded replay" / "rules fallback" | The AI is off or slow. That's fine; the app still works. To use the AI: `ollama serve` and `ollama pull phi4-mini` |
| **Port already in use** (5000 / 5173 / 27017) | Another copy is already running. Close the old terminal |
| Every old incident suddenly shows **AUDIT CHAIN BROKEN** | `CHAIN_SECRET` in `.env` changed. Use the original value, or just open new incidents |
| Clocks look weird after the tamper demo | That's the point! Open a fresh incident |
| Time machine still on (yellow badge) | Click **Now** in the header |

---

## 13. Pushing to GitHub safely

The `.gitignore` already keeps these **out** of GitHub:
- `.env` and any `.env.*` (your secrets; `.env.example` *is* committed, it has no secrets)
- `node_modules/` (libraries; teammates run `npm install`)
- `.mongo-data/` (your local database)
- build output, logs and editor clutter

⚠️ **One-time fix:** the very first commit accidentally included `watchman_1/server/node_modules` (about 3,000 library files). `.gitignore` doesn't remove files that are already tracked, so run this once from the `watchman` folder:

```bash
git rm -r --cached watchman_1/server/node_modules   # stops tracking them (files stay on your disk)
git add .
git status          # check: NO ".env", NO "node_modules", NO ".mongo-data" in the list
git commit -m "Watchman: deterministic regulatory clocks, sealed timeline, validated AI, evidence & report"
git push
```

Before every push, run `git status` and make sure no `.env` file is listed.

---

## 14. Judge questions & answers

| Question | Answer |
|---|---|
| What if a legal rule in your rulebook is wrong? | The rules are plain data with citations, a version and a review date, so a lawyer can check them in minutes. Uncertain ones show a "verify" tag. It's not legal advice, and the app says so on every page. |
| Couldn't a database admin just recompute the seals? | Not without the server's secret key (HMAC). Also, the head seal is printed in every report already sent out. In production we'd anchor it in Azure Confidential Ledger. |
| Why a small local AI instead of GPT? | During a breach, customer data shouldn't be sent to an outside AI company. And we designed for the AI being wrong sometimes: everything it says is checked. Switching to Azure OpenAI is one setting. |
| What if the AI is down? | It uses saved answers, then keyword rules. The clocks, the seals and the report don't depend on the AI at all. |
| Does it email the regulators? | No, on purpose. A human sends the notification and records it with "Mark submitted". |
| Is the evidence file uploaded? | No. Only its fingerprint. The original stays in the bank's secure storage. |

---

**More detail:** [`docs/PROGRESS.md`](docs/PROGRESS.md) (step-by-step build log with screenshots) · [`docs/PLAN.md`](docs/PLAN.md) (design plan & longer glossary) · [`docs/RUNNING.md`](docs/RUNNING.md) · [`docs/DEMO.md`](docs/DEMO.md)
