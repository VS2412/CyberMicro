# Watchman: Presentation Script (5–6 minutes)

> **How to use this file:** don't memorise it. Read **Part 1** until you could explain it to a friend over chai. Then skim **Part 3**: each moment gives you the *idea* in one line, plus an example of how you *could* say it. Say it in your own words. If you understand the idea, the words will come.
>
> **Two people:**
> - 🎤 **Speaker** tells the story and faces the judges.
> - 🖱️ **Driver** clicks on the laptop and adds short "look here" lines.
>
> With only one person, do both. The script still works.

---

## Part 1: Understand it first (read this twice, then close it)

### The problem in one breath
When a bank gets hacked, the clock starts ticking, **legally**. Different laws say "tell us within **6 hours**" (India's CERT-In and RBI), "within **72 hours**" (Europe's GDPR), "within **4 business days**" (America's SEC)… Miss one and the fines are huge. At 2 a.m., in panic, a team has to work out *what to do*, *who to tell, by when*, and later *prove everything they did*. Today that's spreadsheets, emails and memory.

### Why "just use ChatGPT" is dangerous here
AI sometimes **makes things up**. In a bank, a made-up deadline, a fake attack code or an invented number in a legal report isn't a small bug; it's a legal problem. So a bank's lawyers would never allow an AI that *decides*.

### Our answer: one sentence you must own
> **"Rules where the law is, AI where judgement helps, seals where trust matters."**

Everything in Watchman is one of these three:

| Part | What it means | Analogy | Where you'll show it |
|---|---|---|---|
| **Rules** | Deadlines are calculated from a rulebook we typed from the actual laws. Same input → same answer, every time. | A calculator, not a guess | The countdown clocks |
| **AI (but checked)** | The AI reads the alert, suggests steps and drafts text. A human must confirm, and the server fact-checks everything the AI says. | A junior assistant who can point, but can't sign | "AI output checks" red box, the fake code `T1999` |
| **Seals** | Every action is sealed with a fingerprint that includes the previous one. Edit history and the chain visibly breaks. | Wax seals on every page of a logbook | "Rogue DB edit" → AUDIT CHAIN BROKEN |

### The one clever legal point (judges love this)
The 72-hour GDPR clock doesn't start when an alarm rings. It starts when the bank **becomes aware** of a personal-data breach. That's a **human decision**. So in Watchman, **opening an alert starts zero clocks**. Clocks start only when a named person clicks **Confirm**, and the card shows *who* started it and *why*.

### The Microsoft angle
- The AI is **Microsoft Phi-4-mini**, running via Ollama **on our own hardware** (the teammate laptop next to us; see `TWO_LAPTOP_SETUP.md`), not in any cloud. Customer data never goes to a cloud AI, and the app still works with no AI at all.
- The alerts are in the format of **Microsoft Sentinel / Defender**, and the escalation is a **Microsoft Teams** card.

### If you remember only 5 things
1. Alarm ≠ legal clock. A **human** confirmation starts the clock.
2. Deadlines come from **rules**, not AI.
3. The AI is **fact-checked**; we *show* what it got wrong.
4. History is **sealed**; tampering is **caught**.
5. The report **won't finalise** until every legally required item is filled and the chain is intact.

---

## Part 2: Before you go on stage (10 minutes earlier)

- [ ] All 3 terminals running (database, server, website) on the presenting laptop. AI laptop ready per `TWO_LAPTOP_SETUP.md` (Analyze shows **live**). Open http://localhost:5173.
- [ ] **Warm up the AI:** open any incident, click **Analyze incident** once (the first run is slow).
- [ ] Header: name **Asha Rao**, role **Incident Commander**, time machine on **Now**.
- [ ] **Prepare a backup tab (Tab 2):** a separate incident where you already confirmed the facts and filled the report almost to 100%, with one item left (e.g. "Likely consequences"). The report part takes too long to do live, so you'll jump to this tab.
- [ ] Have the `demo-evidence/` folder open in the file manager, ready to drag from.
- [ ] Browser zoom so the back row can read it (Ctrl + / Ctrl −). Close other tabs and notifications.
- [ ] Decide who is Speaker 🎤 and who is Driver 🖱️.

---

## Part 3: The script (about 5½ minutes)

Each moment has:
- 🖱️ **Do**: what the Driver clicks.
- 💡 **Idea**: the one thing the audience must get.
- 🎤 **Say it like**: an *example*. Use your own words.

---

### Moment 1: The hook (0:00 – 0:40)
🖱️ **Do:** Show the first screen (3 alert cards). Point at the green **`phi4-mini · on-device`** chip.

💡 **Idea:** Bank gets hacked → legal clocks → panic. AI alone is dangerous here. We built the version a bank's lawyers would actually allow.

🎤 **Say it like:**
> "It's 2 a.m. and a bank's alarm goes off: someone is downloading customer data. From this moment, the law is watching. India wants a report in 6 hours, Europe in 72. Miss it and the fines run into crores.
> A lot of teams would say 'let an AI handle it'. But AI makes things up, and in a bank a made-up deadline is a legal disaster.
> So we built **Watchman**. Rules calculate the deadlines, the AI only suggests and gets fact-checked, and every action is sealed so nobody can rewrite history. And the AI is Microsoft Phi, running on our own machine right next to us, not in the cloud: no customer data goes to any AI company."

---

### Moment 2: Alert arrives, but no clock (0:40 – 1:05)
🖱️ **Do:** Click **"Customer records exfiltrated via unauthenticated export API"**. Point at **"No regulatory clock is running yet"**.

💡 **Idea:** An alarm is not legal awareness. Clocks start only on a human decision.

🎤 **Say it like:**
> "This is a real-style Microsoft Sentinel alert. Notice: **no clock is running.** That's on purpose. Legally, GDPR's 72 hours start when the bank *becomes aware* of a breach, and that's a human judgement, not an alarm. So Watchman waits for a person to decide."

---

### Moment 3: AI helps, and gets caught (1:05 – 2:00)
🖱️ **Do:**
1. Click **Analyze incident**. *While it thinks (~10 s), the Speaker talks.*
2. Point at the grey **`PB-…`** badges on the steps, then any **amber** AI step.
3. Point at the red **"AI output checks: N items caught"** box.
4. In the ATT&CK box type **`T1999`** → **Tag** (red, crossed out). Then **`T1086`** → **Tag** (amber, auto-corrected).

💡 **Idea:** The AI picks from the bank's **approved checklists**, extras are flagged, and anything false is thrown out *and shown*.

🎤 **Say it like:**
> "Now the AI reads the alert, locally, on Phi. *(wait)*
> Every step here comes from the bank's **approved playbook**; see these IDs. If the AI invents an extra step, it's marked in amber so a human knows it's not approved.
> And this red box is our favourite part: **everything the AI said that failed our checks.** A made-up IP address, a number that isn't in the alert. We don't hide AI mistakes, we catch them.
> Watch: if someone tags an attack code that doesn't exist, like T1999, it's rejected against MITRE's official list. An outdated code gets auto-corrected."

🖱️ *Driver can add:* "Even the attack technique names come from MITRE's official data, not from the AI."

---

### Moment 4: Humans decide, clocks start (2:00 – 2:50)
🖱️ **Do:** In **Key determinations**, click **Confirm** on:
1. **Cyber incident detected** → **Confirm determination** (CERT-In + RBI 6h clocks appear)
2. **Personal-data breach confirmed**, **EU/EEA residents affected**, **Indian residents affected** (GDPR 72h + DPDP appear)

Click a blue **⚖ citation** on the GDPR card to open the legal text. *(Optional, if time allows: switch role to **Analyst** to show the 🔒 lock on "Personal-data breach", then switch back.)*

💡 **Idea:** A named person confirms → the rulebook calculates every deadline, shows who started it, and cites the exact law.

🎤 **Say it like:**
> "Now the Incident Commander confirms the facts. Confirm 'cyber incident'… and immediately: **CERT-In and RBI, six hours each.** Confirm personal data, EU and Indian customers… **GDPR, 72 hours. India's DPDP too.**
> Each clock says **who started it, when, and why**, and links to the exact article of the law in plain English.
> These deadlines come from a rulebook, not the AI. Same facts, same deadline, every time. And roles matter: an analyst *can't* declare a data breach, only the commander or the data-protection officer can."

---

### Moment 5: Time pressure (2:50 – 3:10)
🖱️ **Do:** Click **+60h** in the header. Clocks turn red / **OVERDUE**.

💡 **Idea:** You see instantly what's late. The time machine is just a demo trick; stored data is never changed.

🎤 **Say it like:**
> "Let's jump 60 hours ahead. The 6-hour reports are now **overdue**, and GDPR is in the red. In a real incident, this is the screen the whole team watches. And this is only a demo time machine: it never touches the saved records."

---

### Moment 6: Evidence and tampering (3:10 – 4:15)
🖱️ **Do:**
1. Open the **Evidence** tab. Drag in `waf-export-2026-10-06.csv` → **Register & seal**. Point at the 64-character fingerprint.
2. Click **☠ Rogue DB edit** in the header. Read the pop-up message aloud (short).
3. Point at the blinking red **AUDIT CHAIN BROKEN**. Click it → **Verify integrity** → the row turns red: **SEAL BROKEN**.
4. Click **Now** to turn the time machine off.

💡 **Idea:** Files get a fingerprint (and never leave the laptop). An insider secretly edits the database to hide a missed deadline, and the seals catch it.

🎤 **Say it like:**
> "Evidence: we drop in the firewall log. The browser computes its **fingerprint**. Change one letter of the file and this code changes completely. The file itself never leaves the laptop.
> Now the scary part. Imagine a dishonest insider with database access. They quietly move the 'we became aware' time 30 hours later, so the missed deadline looks on time. *(click)* Look, GDPR suddenly looks fine…
> **But** every action in Watchman is sealed, and each seal includes the previous one, like wax seals on every page of a logbook. *(click Verify)* **Chain broken. This exact entry was changed after it was recorded,** and everything after it is marked untrusted. You can't quietly rewrite history."

---

### Moment 7: The report (4:15 – 5:10)
🖱️ **Do:** Switch to **Tab 2** (your prepared incident) → **Report** tab.
1. Point at the progress bar and the **legal clause** next to each item (e.g. `Art. 33(3)(a)`).
2. On the last missing item click **✨ Draft with AI**, so it turns amber ("needs human approval"). Then **Review & approve**.
3. **Finalise & seal** → **Export PDF**. Open the PDF briefly and scroll to the **head seal** on the last page.

💡 **Idea:** The report is a **legal checklist**, not an essay. AI may draft, but it counts only after a human approves. It refuses to finalise if anything is missing or the chain is broken.

🎤 **Say it like:**
> "Finally the report. Watchman knows what **each regulator legally requires**; here's GDPR's list, clause by clause, and it tracks where every value came from.
> The AI can draft the wording, but see: amber, *'needs human approval'*. It doesn't count until a person approves it as their own statement. If the AI slips in a number that isn't in the facts, the draft is rejected automatically.
> When everything's filled **and** the seals are intact, we finalise. The PDF carries the **final seal**, so an auditor can prove months later that nothing changed. And the tampered incident we just saw? It **refuses** to finalise."

---

### Moment 8: The close (5:10 – 5:40)
🖱️ **Do:** Go back to the incident screen with the clocks. Stop clicking. Look at the judges.

💡 **Idea:** Repeat the motto. One sentence on impact.

🎤 **Say it like:**
> "So that's Watchman. **Rules where the law is. AI where judgement helps. Seals where trust matters.**
> It tells the team what to do, tells legal who to notify and by when, and gives auditors proof nobody can fake. All on Microsoft's own AI, running locally, so customer data never leaves the bank. Thank you."

---

## Part 4: Splitting it between two people (suggestion)

| Moment | 🎤 Speaker | 🖱️ Driver |
|---|---|---|
| 1. Hook | talks | shows first screen |
| 2. No clock | talks | opens alert |
| 3. AI checked | talks during Analyze | "look here" lines on red box / T1999 |
| 4. Clocks start | talks | confirms facts, opens citation |
| 5. Time jump | one line | clicks +60h |
| 6. Evidence + tamper | **Driver can lead this one** (it's very visual) | narrates while clicking |
| 7. Report | talks | switches tab, drafts, exports |
| 8. Close | talks | hands off keyboard |

---

## Part 5: If something goes wrong on stage (stay calm, say this)

| Problem | Do | Say |
|---|---|---|
| Analyze is slow | Keep talking about playbooks | "It's running a real model on our own hardware, no cloud." |
| Badge says *recorded replay* or *rules fallback* | Continue | "If the AI is slow or offline, Watchman falls back to a recorded answer or plain rules. The bank never stops working because of an AI." |
| A red toast like "Only X may…" | Switch role in the header | "And that's the permission system working: only the right role can make that call." |
| Clocks all red unexpectedly | Click **Now** | "Time machine was still on." |
| Running out of time | Skip Moment 5 and the citation, go straight to tampering | (the tampering moment is the most memorable; never skip it) |

---

## Part 6: Quick answers if judges ask (understand, don't memorise)

- **"Is this legal advice?"** No. It's a decision-support tool. The rulebook is readable plain JSON that a lawyer reviews, and uncertain rules carry a **verify** tag.
- **"Why not let the AI decide deadlines?"** Because deadlines are law, and law must be predictable. AI is great at reading messy alerts, not at being legally certain.
- **"What if the AI is wrong?"** The server checks every claim: steps must come from approved playbooks, attack codes must exist in MITRE, clues must literally appear in the alert, numbers must match the facts. Failures are dropped and *shown*.
- **"Couldn't an admin just recalculate the seals?"** The seals use a secret key the database admin doesn't have, so editing the data without the key breaks the chain.
- **"Does data go to the cloud?"** No. Phi-4-mini runs locally via Ollama. Evidence files aren't even uploaded; only their fingerprints are stored.
- **"Does it send the reports to regulators?"** No, on purpose. A human sends them and records it with **Mark submitted**. Watchman tracks it, sealed, on time or late.
- **"How does it fit Microsoft's world?"** Sentinel/Defender-style alerts in, Phi on-device, a Teams Adaptive Card for escalation. It can also point at Azure OpenAI with one setting.
- **"What's next?"** Real Sentinel connection, posting the Teams card for real, more regulations, and legal review of the rulebook.

---

### The 10-second version (if someone stops you in the hallway)
> "When a bank is hacked, laws give 6 to 72 hours to report. Watchman calculates every deadline from the actual laws, uses Microsoft's on-device AI only to suggest, fact-checks that AI, and seals every action so nobody can fake the record."
