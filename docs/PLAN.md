# Watchman — The Plan (plain-English edition)

> Hackathon problem #27, **"The Clock Is Running"**. Read this first if you're new to cybersecurity.
> The live build log is in [`PROGRESS.md`](PROGRESS.md). How to run it: [`RUNNING.md`](RUNNING.md). The rehearsed demo script (supersedes section 6 below): [`DEMO.md`](DEMO.md). Words in **bold** are explained in the [Glossary](#glossary) at the bottom.

---

## 1. The problem in one paragraph

A bank gets hacked. From that moment, a lot of people need answers fast. The **incident responders** need to know what to do next. The lawyers need to know **which regulators must be told, and by when**, because laws like **GDPR** give you as little as **72 hours** to report a personal-data breach, and some Indian rules give you only **6 hours**. Auditors later need proof of what was done, by whom, and when, and that nobody edited that history afterwards. Our app, **Watchman**, is the assistant that helps with all three.

## 2. What everyone else will build (and why that's not enough)

Most teams will build "type in an incident, an AI writes some steps and a report". That's easy, and it's dangerous in a bank, because AI models sometimes **hallucinate**: they confidently make things up. In this domain that means:

| What the AI might invent | Real-world consequence |
|---|---|
| A wrong deadline ("you have 7 days") | Bank misses a legal deadline → fines |
| A fake attack-technique ID ("T1999") | The report sent to the regulator contains nonsense |
| "This isn't a breach, no need to notify" | Bank fails to notify → serious legal trouble |
| A made-up report section | A legally required field is missing from the report |

## 3. Our big idea (the one sentence to remember)

> **"Deterministic where the law is, AI where judgement helps, cryptographic where trust matters."**

In plain words:
- **Deadlines and legal rules come from a fixed rulebook we wrote, not from the AI.** The same input always gives the same answer. That's what "deterministic" means.
- **The AI only *suggests*.** For example: "this looks like customer data was stolen, confirm?" A **human** clicks confirm, and only then does any legal clock start. That human's name and the time are recorded.
- **The history can't be secretly edited.** Every event is locked to the one before it with a **hash chain**. If someone edits an old entry, the chain visibly "breaks", and we show this happening live in the demo.
- **The AI runs on the laptop itself.** It uses Microsoft's **Phi** model through **Ollama**, so bank data never leaves the building and the demo works without wifi.

## 4. The features we're building (in build order)

| Step | What it is | Everyday analogy | Why judges care |
|---|---|---|---|
| **D0** | These docs | A lab notebook | Shows a clear process |
| **T0** | Fix what's broken (server didn't start, styling broken, `[cite: 1, 2]` junk text on screen) | Cleaning the house before guests arrive | Nothing embarrassing on screen |
| **T1** | Tamper-evident timeline + "simulate a rogue database edit" button | A wax seal on every page of a logbook: break one and everyone can see | Auditors need proof nobody altered the record |
| **T2** | **Regulatory clock engine**: 7 regulations, each with its own clock, trigger and legal citation | A kitchen with 7 timers, each started by a different event | This is the "72-hour clock" in the problem title, done properly |
| **T3** | **Playbooks**: pre-written, approved response checklists. The AI picks and tailors steps from them, and every step shows where it came from | A pilot's checklist plus a co-pilot who points at the right page | Stops the AI inventing random steps |
| **T4** | **Compliance report** + completeness checker ("6 of 8 required fields filled; missing: DPO contact") | A tax form that won't let you submit until every box is filled | "Compliance-ready" actually means something |
| **T5** | **MITRE ATT&CK** ID checker: AI-suggested technique IDs are checked against MITRE's official list | A spell-checker, but for attack codes | Catches AI hallucinations automatically |
| **T6** | **Evidence registry**: fingerprint (**SHA-256**) every evidence file and record who handed it to whom | Evidence bags with sign-out sheets on a TV crime show | This is real **chain of custody** |
| **T7** | Realistic sample incidents + offline backups of AI answers | Rehearsal props | The demo can't break on stage |

**Stretch goals (if time allows):** DPO "no notification needed" sign-off with written justification; a Microsoft Teams alert-card preview; pasting in a Microsoft Sentinel alert; exporting to the ATT&CK Navigator.

## 5. How the AI is used, and where it's not allowed

```
Incident description
        │
        ▼
  AI (Phi, on-device) ──suggests──► playbook steps, ATT&CK IDs, "possible facts"
        │                                   │
        │                     server CHECKS everything:
        │                     • step must exist in a real playbook (else flagged amber)
        │                     • ATT&CK ID must exist in MITRE's list (else rejected red)
        │                     • facts are only SUGGESTIONS → a human must confirm
        ▼
  Human confirms a fact (e.g. "customer data stolen", by J. Rao at 14:02)
        │
        ▼
  Rule engine (no AI) ──► which regulators, which deadlines, which legal article
        │
        ▼
  Every action is appended to the hash-chained timeline ──► report + PDF
```

If the AI is down or slow, Watchman falls back to (1) recorded answers for the demo scenarios, then (2) simple keyword matching ("ransomware" → the ransomware playbook). **The app always works.**

## 6. The 3-minute demo script

1. **Hook (0:00):** "Every team built an AI that writes NIST steps. We built the one your lawyers would let you use."
2. **Load the "customer data stolen via API" scenario (0:20).** The clocks panel is *empty*. Say: "The 72-hour clock doesn't start when an alert fires. Legally, it starts when the bank becomes *aware* of a personal-data breach."
3. **Click Analyze.** Steps appear, each tagged with its source playbook and NIST phase. One is amber: "AI-proposed, not in approved playbook". The analyst approves it, and that approval is logged. ATT&CK tags show green. We manually type an outdated code, `T1086`, and it turns amber: "revoked → replaced by T1059.001".
4. **Confirm the fact (0:55).** The AI asks "Customer PII exfiltrated? Confirm?" The commander confirms. **Six clocks start at once** (CERT-In 6h, RBI 6h, DORA, GDPR 72h, DPDP 72h; SEC "waiting for materiality decision"), and each one shows *why* it started and *which law* applies.
5. **Time machine +60h (1:30).** GDPR turns red. A "DEMO MODE" badge is visible. "We simulate the clock. We never rewrite the record."
6. **Evidence + tamper (1:50).** Drop a log file, its fingerprint appears, and custody is handed to Forensics. Click "Simulate rogue DB edit", then Verify: the timeline goes red from the edited entry onward.
7. **Report (2:20).** "GDPR Art. 33(3): 6/8 complete." Fill in the missing fields → 8/8 FINAL → export the PDF.
8. **Close (2:50).** "All of this ran offline on Microsoft Phi; no customer data left this laptop. Production path: Azure OpenAI, Microsoft Sentinel, Azure Confidential Ledger."

## 7. What we are deliberately NOT building (and why)

- **A chatbot.** Everyone has one, and it adds nothing here.
- **Automatically emailing regulators.** That would be dangerous; a human must always send.
- **Letting the AI decide deadlines or legal triggers.** That's the exact risk we're solving.
- **Logins/user accounts.** A simple "acting as: Analyst / Commander / DPO" dropdown is enough for a demo.
- **Blockchain.** Expensive, slow, and unnecessary; a hash chain gives the same tamper-evidence. We mention Azure Confidential Ledger as the production path.
- **Deploying it online.** The demo runs locally, on purpose.

> ⚠️ **Legal disclaimer we show in the app:** deadlines are encoded from public regulatory text as of 2026 and must be verified with counsel. Watchman supports decisions; it is not legal advice.

---

## Glossary

Each term has **what it is** and **why a judge cares**.

### Incident response basics
- **Incident response (IR).** The organised process of handling a security problem (hack, leak, ransomware) from first alert to lessons learned. *Judge:* it's the whole problem domain.
- **NIST SP 800-61.** The US government's standard guide to incident response. It splits the work into **4 phases**: (1) *Preparation*: be ready beforehand; (2) *Detection & Analysis*: notice it and figure out what happened; (3) *Containment, Eradication & Recovery*: stop the spread, remove the attacker, restore systems; (4) *Post-Incident Activity*: lessons learned. *Judge:* the problem explicitly requires these phases. (NIST published Rev. 3 in 2025, which re-maps IR onto the Cybersecurity Framework 2.0; the 4-phase model from Rev. 2 is still what the brief asks for.)
- **Playbook.** A pre-approved checklist for a type of incident, e.g. "Ransomware playbook: step 1 isolate the machine…". *Judge:* the brief says "common playbooks". Grounding the AI in them is our anti-hallucination strategy.
- **Incident Commander (IC).** The person in charge during an incident. They make the call on things like "yes, this is a breach".
- **IOC / observable.** "Indicator of Compromise": a clue such as a suspicious IP address, file name or domain.
- **SIEM / Microsoft Sentinel / Defender.** Tools that collect security alerts from across a company. Sentinel is Microsoft's cloud SIEM. *Judge:* Microsoft judges; our sample incidents are shaped like Sentinel alerts.

### Attacks
- **MITRE ATT&CK.** A free, public encyclopedia of attacker techniques, each with an ID, e.g. **T1566** = Phishing, **T1486** = Data Encrypted for Impact (ransomware). *Judge:* the brief requires ATT&CK mapping.
- **Technique / sub-technique / tactic.** A *tactic* is the attacker's goal ("Exfiltration"), a *technique* is how they do it (T1567 "Exfiltration Over Web Service"), and a *sub-technique* is a more specific variant (T1059.001 = PowerShell).
- **Revoked / deprecated ID.** MITRE sometimes retires IDs. For example, old T1086 "PowerShell" became T1059.001. AI models trained on old data often output these. *Judge:* catching this proves we validate rather than trust.
- **STIX.** The standard file format MITRE publishes ATT&CK in. We download it once and check IDs against it.
- **Exfiltration ("exfil").** Data being stolen out of the network.
- **Ransomware.** Malware that encrypts files and demands payment.
- **C2 (command and control).** The attacker's server that the malware "phones home" to.

### Trust and evidence
- **Hash / SHA-256.** A function that turns any data into a fixed 64-character "fingerprint". Change even one letter of the input and the fingerprint becomes completely different. *Judge:* this is how we prove evidence wasn't altered.
- **Hash chain.** Each timeline entry's fingerprint includes the *previous* entry's fingerprint. Editing entry #5 changes its fingerprint, which no longer matches what entry #6 recorded, so the chain "breaks" from #5 onward. *Judge:* this is our live tamper demo.
- **HMAC.** A hash mixed with a secret key, so an attacker who edits the database can't simply recompute all the fingerprints without also stealing the key.
- **Chain of custody.** The documented record of who collected each piece of evidence, when, where it's stored, and every hand-over since. Courts and regulators reject evidence without one. *Judge:* the brief explicitly requires this.
- **Head hash.** The fingerprint of the newest entry. It's printed in the PDF report, so later anyone can check that the record hasn't changed since the report was issued.
- **Non-repudiation.** Someone can't later deny they did something, because it's recorded and sealed.

### Regulations (the "clocks")
- **GDPR.** The EU's data-protection law. **Article 33**: notify the data-protection authority "without undue delay and, where feasible, not later than **72 hours** after having become aware" of a personal-data breach (unless it's unlikely to harm anyone). **Article 33(3)** lists what the notification must contain: (a) the nature of the breach, including categories and approximate numbers of people and records; (b) the DPO's contact details; (c) likely consequences; (d) measures taken. **Article 34**: tell the affected people too, if the risk is high. **Article 33(5)**: document *every* breach, even ones you don't report. *Judge:* this is the "72-hour clock" in the title.
- **"Becoming aware".** Under GDPR the clock starts when the bank is reasonably certain a personal-data breach happened, *not* when the first alert fired. This is why our clocks start on a confirmed fact.
- **DPO (Data Protection Officer).** The person legally responsible for data-protection compliance. Their contact details must be in the GDPR notification.
- **PII (personally identifiable information).** Data that identifies a person: name, account number, address…
- **DORA.** The EU Digital Operational Resilience Act, applicable since January 2025 to banks and other financial firms. Major ICT incidents need an *initial* notification (within 4 hours of classifying it as major, and no later than 24 hours after detection), an *intermediate* report (within 72 hours), and a *final* report (within 1 month).
- **NYDFS 23 NYCRR 500.17.** New York's financial-services cyber rule: notify the regulator within **72 hours** of determining a reportable cybersecurity incident occurred.
- **SEC Form 8-K, Item 1.05.** For US-listed companies: disclose a *material* cyber incident within **4 business days** of deciding it's material. Note *business* days: weekends don't count.
- **Materiality.** Whether something is important enough that investors would care. Lawyers decide this; the AI must not.
- **CERT-In.** India's national cyber agency. Its April 2022 directions require reporting listed incident types within **6 hours** of noticing them.
- **RBI.** The Reserve Bank of India. Banks must report cyber incidents to it within hours (we encode 6 hours, marked "verify").
- **DPDP Act 2023 / DPDP Rules 2025.** India's data-protection law. Notify the Data Protection Board and affected people; the Rules require a detailed report to the Board within **72 hours** (marked "verify").

### AI terms
- **LLM (large language model).** The AI that reads and writes text (e.g. GPT, Gemini, Phi).
- **Hallucination.** When an LLM states something false with confidence.
- **Phi.** Microsoft's family of small, efficient LLMs that can run on a laptop.
- **Ollama.** A free tool that runs LLMs locally on your own computer.
- **Grounding.** Forcing the AI to base answers on provided source material (our playbooks) instead of its memory.
- **Deterministic.** Same input → same output, every time. Our rule engine is deterministic; LLMs are not.
- **Structured output / JSON schema.** We force the AI to answer in a strict data format so the server can check each field.
