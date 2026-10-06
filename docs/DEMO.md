# Watchman — 3-minute demo script

Rehearsed click by click on the real app. **Bold** = what you click. *Italics* = what you say.

## Before you go on stage (5 minutes earlier)
1. Start everything (see [RUNNING.md](RUNNING.md)).
2. **Warm up the AI:** open any scenario and click **Analyze incident** once. The first call loads Phi-4-mini into GPU memory.
3. Header: time machine on **Now**, acting as **Asha Rao · Incident Commander**.
4. Go back to the **Incoming alerts** screen (click the Watchman logo).
5. Have the `demo-evidence/` folder open in a file manager window, for drag-and-drop.
6. *(Optional, maximum predictability)* set `AI_MODE=replay` in `.env` and restart the server. The app then shows the recorded Phi answer instantly, with an amber "recorded replay" badge. Be upfront about it if asked.

---

## 0:00 – 0:20 · The hook
*"Every team tonight built an AI that writes NIST steps and a report. We built the one a bank's lawyers would let you use. Our rule is simple: the AI suggests, a human confirms, the rules compute, and everything is sealed. Nothing a regulator sees depends on the AI being right."*

Point at the green chip in the header: **phi4-mini · on-device**.
*"And it runs Microsoft's Phi model on this laptop. Customer breach data never leaves the bank."*

## 0:20 – 0:50 · An alert arrives; no clock yet
- **Click** "Customer records exfiltrated via unauthenticated export API" (a Microsoft Sentinel incident).
- Point at **"No regulatory clock is running yet."**
  *"Most tools start a 72-hour countdown here. That's legally wrong. GDPR's clock starts when the bank becomes **aware** of a **personal-data** breach, and that's a human judgement."*
- **Click Analyze incident** (~10 s). While it runs:
  *"The AI isn't writing steps from memory. It picks from the bank's approved playbooks and tailors them."*
- Scroll to the plan and point at:
  - step badges like `PB-EXFIL-C1`: *"every step traces to an approved playbook"*
  - the **amber** step: *"AI-proposed, not in the playbook, so the Incident Commander must approve it"*
  - the red **"AI output checks: N items caught"** box: *"everything the model said that we couldn't verify: invented ATT&CK IDs, indicators that aren't in the alert, notes on the wrong step. Dropped before a human ever relies on them."*
- In the ATT&CK box, **type `T1086`, click Tag**. It turns amber: "revoked → T1059.001".
  *"Checked against MITRE's official dataset, offline. AI models trained on old data love this retired ID."*

## 0:50 – 1:30 · Humans confirm, the clocks start
- Scroll up to **Key determinations**. Point at the purple **"suggests: confirm?"** cards.
  *"The assistant suggests determinations. It can never make them."*
- **Confirm** "Cyber incident detected" → **Confirm determination**. *CERT-In and RBI start: 6 hours.*
- **Confirm** "Personal-data breach confirmed", "EU/EEA residents affected" and "Indian residents affected". *GDPR 72h and DPDP start.*
- **Confirm** "DORA: classified as MAJOR". *DORA's 4-hour initial notice appears.*
- Point at one card's line: "Started by **Asha Rao (Incident Commander)** confirming 'Personal-data breach confirmed' · event #N".
  *"Every clock says who started it, when, and under which article. Click the citation for the legal text."*
- Optional: switch the role to **Analyst** and show that the breach confirmation is 🔒 locked. *"Only the Commander or DPO can make that call."*

## 1:30 – 1:50 · Time pressure
- **Click +60h** in the header. The yellow **DEMO +60h** badge appears.
  *"Sixty hours later: DORA, CERT-In and RBI are overdue, GDPR is red. Notice we simulate 'now'; we never rewrite stored times. The old version of this app did that, which is falsifying the record."*

## 1:50 – 2:20 · Evidence and tampering
- **Evidence tab** → **drag `waf-export-2026-10-06.csv`** onto the drop zone → **Register & seal**.
  *"The browser fingerprints the file with SHA-256. The file never leaves this laptop, and every hand-over is recorded."*
- **Click "Rogue DB edit"** in the header.
  *"A rogue insider with database access moves the breach-awareness time 30 hours later to hide the missed deadline."*
- Point at GDPR: it jumped from red to a comfortable green, *"exactly what a cover-up looks like"*, and the header now shows **AUDIT CHAIN BROKEN**.
- **Sealed timeline tab** → **Verify integrity**. The "Personal-data breach confirmed" event shows **SEAL BROKEN**, and everything after it is "untrusted".
  *"Every event is sealed with a keyed hash of the one before it. You can't edit history quietly."*

## 2:20 – 2:50 · The compliance report
*(Use a fresh incident for this part if you prefer a clean chain: the report correctly refuses to finalise on tampered data. That refusal is itself a good line.)*
- **Report tab**: "**6/17** required items" across CERT-In, RBI and GDPR, each item tagged with its clause, e.g. **Art. 33(3)(a)**.
- On "Nature of the incident" **click Draft with AI**, then **Review & approve**.
  *"The AI can draft narrative, but every number is checked against confirmed facts. In testing it wrote 'half a million records' when the truth was 50,214; Watchman rejected the draft automatically."*
- Point at **Finalise & seal** (disabled): *"It won't let you finalise until every legally required item is there **and** the audit chain is intact."*
- **Export PDF.** Point at the obligations table, the clause-by-clause content, and the head seal on the last page.

## 2:50 – 3:00 · Close
*"Deterministic where the law is. AI where judgement helps. Cryptographic where trust matters. It all ran offline on Microsoft Phi. In production: Azure OpenAI with one setting change, Sentinel as the feed, Azure Confidential Ledger to anchor the seals."*

---

## Likely judge questions
| Question | Answer |
|---|---|
| What if your legal rule is wrong? | Rules are data with citations, a version and a review date. Counsel can audit them in minutes. Uncertain ones show a **verify** tag in the UI. |
| Couldn't an admin recompute the hashes? | Not without the server's signing key (HMAC). And the head seal is printed in every report already sent out. Production: anchor it in Azure Confidential Ledger. |
| Why a small local model? | Data residency. Breach data shouldn't go to a third-party API during the breach. Our design assumes the model is sometimes wrong and checks everything it says. |
| What if the AI is down? | It replays the recorded answer or falls back to keyword rules. Clocks, chain and report don't depend on the AI. |
| Does it send notifications to regulators? | No, on purpose. A human sends them and records the submission ("Mark submitted"). |
| Is this legal advice? | No. Every page says so, and every deadline links to its source text. |
