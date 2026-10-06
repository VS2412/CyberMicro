// AI-assisted incident analysis, grounded in approved playbooks.
//
// The model is only allowed to: pick playbooks, tailor existing playbook steps,
// propose a few extra steps (flagged), suggest ATT&CK IDs and suggest facts.
// Everything it returns is validated here; anything unverifiable is dropped and
// reported as a warning. If the model is unavailable we replay a recorded answer,
// or fall back to deterministic keyword rules, so the app never stops working.
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { generateJSON, providerInfo } from './llm/index.js';
import { validateTechniques, ATTACK } from './attackService.js';
import { FACTS } from './clockEngine.js';
import { NIST_PHASES } from '../models/Incident.js';
import { logger } from '../config/logger.js';

const pbDir = new URL('../data/playbooks/', import.meta.url);
export const PLAYBOOKS = readdirSync(pbDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(new URL(f, pbDir))));
const PB = Object.fromEntries(PLAYBOOKS.map((p) => [p.id, p]));
const CORE = PLAYBOOKS.filter((p) => p.core);
const SELECTABLE = PLAYBOOKS.filter((p) => !p.core);
const SUGGESTABLE_FACTS = FACTS.filter((f) => f.aiMaySuggest !== false);

const cacheDir = new URL('../data/ai-cache/', import.meta.url);

const OBSERVABLE_TYPES = ['ip', 'url', 'domain', 'host', 'account', 'email', 'file', 'hash'];

// ---------- Prompt ----------

const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    playbookIds: { type: 'array', maxItems: 2, items: { type: 'string' } },
    stepNotes: {
      type: 'array',
      maxItems: 6,
      items: { type: 'object', properties: { stepId: { type: 'string' }, note: { type: 'string' } }, required: ['stepId', 'note'] },
    },
    extraSteps: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        properties: { phase: { type: 'string', enum: NIST_PHASES }, text: { type: 'string' }, rationale: { type: 'string' } },
        required: ['phase', 'text', 'rationale'],
      },
    },
    techniques: {
      type: 'array',
      maxItems: 6,
      items: { type: 'object', properties: { id: { type: 'string' }, evidence: { type: 'string' } }, required: ['id', 'evidence'] },
    },
    observables: {
      type: 'array',
      maxItems: 8,
      items: { type: 'object', properties: { type: { type: 'string', enum: OBSERVABLE_TYPES }, value: { type: 'string' } }, required: ['type', 'value'] },
    },
    suggestedFacts: {
      type: 'array',
      maxItems: 4,
      items: { type: 'object', properties: { key: { type: 'string' }, rationale: { type: 'string' } }, required: ['key', 'rationale'] },
    },
  },
  required: ['summary', 'playbookIds', 'stepNotes', 'extraSteps', 'techniques', 'observables', 'suggestedFacts'],
};

const SYSTEM = `You are an incident-response analyst assistant at a regulated bank. You follow NIST SP 800-61 and MITRE ATT&CK Enterprise.
Rules:
- Use ONLY information in the incident description. Never invent hosts, IPs, numbers or names.
- Choose playbooks only from the catalogue by their exact id.
- stepNotes: tailor existing playbook steps to this incident (e.g. which IP to block). Use exact step ids from the catalogue.
- extraSteps: at most 3 incident-specific actions that no catalogue step covers.
- techniques: at most 6 MITRE ATT&CK Enterprise techniques (id format T1234 or T1234.001), each with "evidence": words copied exactly from the INCIDENT description (not from the playbooks) that show it. No quote, no technique.
- suggestedFacts: only keys from the allowed list, only when the description clearly supports them. A human will decide; you only suggest.
- You do NOT decide legal deadlines or whether to notify regulators.
Answer with JSON only.`;

function techniqueHints() {
  const ids = [...new Set(SELECTABLE.flatMap((p) => p.attack))];
  return ids.map((id) => `${id} ${ATTACK.techniques[id]?.name || ''}`).join('; ');
}

function buildPrompt(incident) {
  const catalogue = SELECTABLE.map(
    (p) => `${p.id}: ${p.name}. ${p.description}\n${p.steps.map((s) => `  ${s.id} [${s.phase}] ${s.text}`).join('\n')}`
  ).join('\n');
  const facts = SUGGESTABLE_FACTS.map((f) => `${f.key}: ${f.question}`).join('\n');
  return `PLAYBOOK CATALOGUE
${catalogue}

CANDIDATE ATT&CK TECHNIQUES (use only those the description supports; each needs an exact quote)
${techniqueHints()}

ALLOWED FACT KEYS
${facts}

INCIDENT
Title: ${incident.title}
Severity: ${incident.severity}
Description: ${incident.description}

Return JSON with:
- summary: 2-3 factual sentences.
- playbookIds: the ONE best-matching PLAYBOOK id (e.g. "PB-BEC"), plus a second only if the incident clearly involves both. Never step ids.
- stepNotes: for up to 6 steps, {"stepId": "<exact step id>", "note": "<incident-specific detail: which IP, host, account, count>"}. Do not repeat the step text.
- extraSteps, techniques (with evidence quotes), observables, suggestedFacts as described.`;
}

// ---------- Deterministic helpers ----------

const RE = {
  ip: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  url: /\b(?:https?:\/\/)?[\w.-]+\.[a-z]{2,}(?:\/[\w\-./?=&%]*)?|\/api\/[\w\-./?=&%]+/gi,
  email: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
  host: /\b[A-Z]{2,}(?:-[A-Z0-9]{2,})+\b/g,
  file: /\b[\w-]+\.(?:txt|exe|dll|ps1|zip|lockd)\b/gi,
};

/** Indicators that literally appear in the incident text (no guessing). */
export function extractObservables(text) {
  const out = [];
  const add = (type, value) => {
    if (!out.some((o) => o.value === value)) out.push({ type, value });
  };
  for (const m of text.match(RE.ip) || []) add('ip', m);
  for (const m of text.match(RE.email) || []) add('email', m);
  for (const m of text.match(RE.host) || []) add('host', m);
  for (const m of text.match(RE.file) || []) add('file', m);
  for (const m of text.match(RE.url) || []) if (m.includes('/') && !out.some((o) => m.includes(o.value))) add('url', m);
  return out;
}

const FACT_RULES = [
  { key: 'cyber_incident_detected', test: (t, inc) => ['HIGH', 'CRITICAL'].includes(inc.severity) || /malicious|ransom|exfil|compromis|unauthori/i.test(t), why: 'The alert describes confirmed malicious activity, not just an anomaly.' },
  { key: 'personal_data_breach', test: (t) => /customer|personal|records|date of birth|iban|account/i.test(t) && /exfil|dump|stol|leak|returned|export|forward|downloaded/i.test(t), why: 'The description says customer/personal data left the bank.' },
  { key: 'eu_data_subjects', test: (t) => /\b(EU|EEA|Europe|Ireland|Irish|German|Germany|France|French|Spain|Italy|Netherlands)\b/i.test(t), why: 'Affected people include EU/EEA residents.' },
  { key: 'india_data_principals', test: (t) => /\bIndia(n)?\b/i.test(t), why: 'Affected people include residents of India.' },
];

function deterministicAnalysis(incident) {
  const text = `${incident.title} ${incident.description}`.toLowerCase();
  const scored = SELECTABLE.map((p) => ({ p, score: p.keywords.filter((k) => text.includes(k)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const picks = scored.slice(0, scored[1] && scored[1].score >= scored[0].score / 2 ? 2 : 1).map((x) => x.p.id);
  return {
    summary: incident.description.split(/(?<=\.)\s/).slice(0, 2).join(' '),
    playbookIds: picks,
    stepNotes: [],
    extraSteps: [],
    techniques: [],
    observables: [],
    suggestedFacts: [],
    _rules: true,
    _playbookTechniques: picks.flatMap((id) => PB[id].attack),
  };
}

// ---------- Validation: never trust the model ----------

// An evidence quote counts if most of its words literally occur in the incident text.
function quoteSupported(quote, text) {
  const q = [...words(quote)];
  if (!q.length) return false;
  const t = words(text);
  return q.filter((w) => t.has(w)).length / q.length >= 0.7;
}

// A "tailoring" note that just restates the step adds nothing.
const STOP = new Set('from with that this into have been were they their them which when before after every other only also more than what such your will must should could would about over under then there these those does done using used affected incident'.split(' '));
const words = (t) => new Set((t.toLowerCase().match(/[a-z0-9]{4,}/g) || []).filter((w) => !STOP.has(w)));
function isEcho(note, stepText) {
  const a = words(note);
  const b = words(stepText);
  const novel = [...a].filter((w) => !b.has(w)).length;
  return a.size === 0 || novel / a.size < 0.3;
}

const TYPE_CHECK = {
  ip: (v) => /^(?:\d{1,3}\.){3}\d{1,3}$/.test(v),
  email: (v) => /^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(v),
  url: (v) => /[/.]/.test(v) && !/\s/.test(v),
  domain: (v) => /^[\w-]+(\.[\w-]+)+$/.test(v),
  host: (v) => /^[\w.-]+$/.test(v),
  account: (v) => /^[\w.@\\-]+$/.test(v),
  file: (v) => /^[\w.-]+\.\w{1,6}$/.test(v),
  hash: (v) => /^[a-f0-9]{32,64}$/i.test(v),
};

export function validateAnalysis(raw, incident, { confirmedFacts = {} } = {}) {
  const warnings = [];
  const text = `${incident.title}\n${incident.description}`;

  // Playbooks
  const stepOwner = (id) => PLAYBOOKS.find((p) => p.steps.some((s) => s.id === id))?.id;
  let playbookIds = [...new Set((raw.playbookIds || []).map((id) => {
    id = String(id).trim();
    if (PB[id]) return id;
    const owner = stepOwner(id);
    if (owner) warnings.push(`Model gave step id "${id}" instead of a playbook id; mapped to ${owner}`);
    else warnings.push(`Ignored unknown playbook "${id.slice(0, 30)}"`);
    return owner || id;
  }))];
  playbookIds = [...new Set(playbookIds)].filter((id) => PB[id] && !PB[id].core).slice(0, 2);
  const lower = text.toLowerCase();
  if (playbookIds.length === 2 && !PB[playbookIds[1]].keywords.some((k) => lower.includes(k))) {
    warnings.push(`Dropped second playbook ${playbookIds[1]}: nothing in the incident text supports it`);
    playbookIds = playbookIds.slice(0, 1);
  }
  if (!playbookIds.length) {
    playbookIds = deterministicAnalysis(incident).playbookIds;
    warnings.push(`No valid playbook chosen by the model; selected by keyword rules: ${playbookIds.join(', ') || 'none'}`);
  }
  const selected = [...CORE, ...playbookIds.map((id) => PB[id])];
  const stepIndex = new Map(selected.flatMap((p) => p.steps.map((s) => [s.id, { ...s, playbookId: p.id }])));

  // Tailoring notes must reference real steps of the selected playbooks.
  // Small models often attach a good note to the wrong step, so re-attach each note
  // to the step whose wording it overlaps most (deterministic, logged).
  const notes = {};
  const overlap = (a, b) => { const w = words(b); return [...words(a)].filter((x) => w.has(x)).length; };
  for (const n of raw.stepNotes || []) {
    const note = String(n.note || '').trim();
    if (!note) continue;
    let step = stepIndex.get(n.stepId);
    const best = [...stepIndex.values()].reduce((a, b) => (overlap(note, b.text) > overlap(note, a.text) ? b : a));
    if (!step && overlap(note, best.text) === 0) {
      warnings.push(`Discarded note for unknown step "${String(n.stepId).slice(0, 30)}"`);
      continue;
    }
    if (!step || overlap(note, best.text) >= overlap(note, step.text) + 2) {
      if (step || n.stepId) warnings.push(`Re-attached AI note from ${String(n.stepId).slice(0, 20) || '(none)'} to ${best.id} (better match)`);
      step = best;
    }
    if (!isEcho(note, step.text) && !notes[step.id]) notes[step.id] = note.slice(0, 300);
  }

  const steps = [...stepIndex.values()].map((s) => ({
    playbookId: s.playbookId,
    stepId: s.id,
    phase: s.phase,
    text: s.text, // canonical approved wording, never the model's paraphrase
    rationale: notes[s.id],
    attack: s.attack || [],
    evidence: s.evidence || [],
    source: 'playbook',
  }));

  let kept = 0;
  for (const x of raw.extraSteps || []) {
    const t = String(x.text || '').trim().replace(/^[\s:;,.\-–]+/, '');
    if (!NIST_PHASES.includes(x.phase) || t.length < 10) {
      warnings.push('Discarded a malformed AI-proposed step');
      continue;
    }
    const dup = [...stepIndex.values()].find((st) => {
      const shared = [...words(t)].filter((w) => words(st.text).has(w)).length;
      return shared >= 3 && shared / Math.max(1, words(t).size) >= 0.4;
    });
    if (dup) {
      warnings.push(`Dropped AI step that duplicates approved step ${dup.id}`);
      continue;
    }
    if (kept++ >= 3) {
      warnings.push('Dropped AI-proposed step beyond the limit of 3');
      continue;
    }
    steps.push({ playbookId: null, stepId: null, phase: x.phase, text: t.slice(0, 300), rationale: String(x.rationale || '').slice(0, 300), source: 'ai' });
  }

  // ATT&CK: validated against MITRE's dataset
  const supported = [];
  for (const t of (raw.techniques || raw.techniqueIds || []).slice(0, 8)) {
    const id = typeof t === 'string' ? t : t.id;
    const evidence = typeof t === 'string' ? '' : String(t.evidence || '');
    if (typeof t !== 'string' && !quoteSupported(evidence, text)) {
      warnings.push(`Rejected ${String(id).slice(0, 12)}: its evidence quote "${evidence.slice(0, 50)}" is not in the incident text`);
      continue;
    }
    supported.push({ id, evidence });
  }
  const techniques = validateTechniques(supported.map((x) => x.id), 'ai').map((v) => ({
    ...v,
    note: v.note || (supported.find((x) => x.id.toUpperCase().replace('/', '.') === v.inputId)?.evidence ? `Evidence: “${supported.find((x) => x.id.toUpperCase().replace('/', '.') === v.inputId).evidence.slice(0, 160)}”` : undefined),
  }));
  const validCount = techniques.filter((t) => t.status !== 'rejected').length;
  const reference = raw._playbookTechniques || (validCount < 2 ? playbookIds.flatMap((id) => PB[id].attack) : []);
  if (reference.length) techniques.push(...validateTechniques(reference, 'playbook', techniques));
  for (const t of techniques.filter((t) => t.status === 'rejected')) warnings.push(`Rejected ATT&CK ID: ${t.note}`);

  // Observables: keep only ones that literally appear in the incident text
  const observables = extractObservables(text);
  for (const o of raw.observables || []) {
    const v = String(o.value || '').trim();
    if (!v || observables.some((x) => x.value === v)) continue;
    if (!text.includes(v)) warnings.push(`Rejected indicator "${v.slice(0, 40)}": not present in the incident data`);
    else if (!OBSERVABLE_TYPES.includes(o.type) || !TYPE_CHECK[o.type](v)) warnings.push(`Rejected indicator "${v.slice(0, 40)}": not a valid ${o.type}`);
    else observables.push({ type: o.type, value: v });
  }

  // Fact suggestions: only allowed keys, never already-confirmed ones, never legal-only ones
  const suggestedFacts = [];
  for (const f of raw.suggestedFacts || []) {
    const def = FACTS.find((d) => d.key === f.key);
    if (!def) warnings.push(`Rejected suggestion of unknown fact "${String(f.key).slice(0, 30)}"`);
    else if (def.aiMaySuggest === false) warnings.push(`Blocked: AI may not suggest "${def.label}" (human-only determination)`);
    else if (confirmedFacts[f.key]?.value === true) continue;
    else if (!suggestedFacts.some((s) => s.key === f.key)) suggestedFacts.push({ key: f.key, rationale: String(f.rationale || '').slice(0, 300), status: 'pending', by: raw._rules ? 'rules' : 'ai' });
  }
  // Deterministic keyword rules always contribute too (clearly labelled), so a quiet model can't hide an obvious trigger.
  for (const r of FACT_RULES) {
    if (confirmedFacts[r.key]?.value === true || suggestedFacts.some((s) => s.key === r.key)) continue;
    if (r.test(text, incident)) suggestedFacts.push({ key: r.key, rationale: r.why, status: 'pending', by: 'rules' });
  }

  // Numbers are where summaries go wrong. Flag any figure the source text doesn't contain.
  const summary = String(raw.summary || '').slice(0, 1200);
  const sourceNums = new Set((text.match(/\d[\d,.]*/g) || []).map((n) => n.replace(/[,.]$/, '')));
  for (const n of (summary.match(/\d[\d,.]*/g) || []).map((x) => x.replace(/[,.]$/, ''))) {
    if (!sourceNums.has(n)) warnings.push(`Summary contains the figure "${n}", which does not appear in the incident data`);
  }

  return {
    summary,
    playbookIds,
    steps,
    techniques,
    observables,
    suggestedFacts,
    warnings,
  };
}

// ---------- Orchestration: live -> replay -> deterministic ----------

function cachePath(scenarioId) {
  return new URL(`${scenarioId}.json`, cacheDir);
}

function readCache(scenarioId) {
  if (!scenarioId || !existsSync(cachePath(scenarioId))) return null;
  return JSON.parse(readFileSync(cachePath(scenarioId)));
}

function writeCache(scenarioId, record) {
  // Keep curated recordings: only overwrite when explicitly recording (AI_RECORD=1).
  if (!scenarioId || (existsSync(cachePath(scenarioId)) && process.env.AI_RECORD !== '1')) return;
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(cachePath(scenarioId), JSON.stringify(record, null, 2));
}

export async function analyzeIncident(incident, { confirmedFacts } = {}) {
  const info = providerInfo();
  const scenarioId = incident.source?.scenarioId;
  const started = Date.now();
  const notes = [];
  let raw = null;
  let meta = null;

  if (info.mode === 'live') {
    try {
      const out = await generateJSON({ system: SYSTEM, user: buildPrompt(incident), schema: SCHEMA });
      raw = out.json;
      meta = { provider: out.provider, model: out.model, onDevice: out.onDevice, mode: 'live' };
      writeCache(scenarioId, { recordedAt: new Date().toISOString(), ...meta, output: raw });
    } catch (err) {
      logger.warn({ err: err.message }, 'Live model failed; trying replay/fallback');
      notes.push(`Live model unavailable (${err.message.slice(0, 120)})`);
    }
  }

  if (!raw && info.mode !== 'fallback') {
    const cached = readCache(scenarioId);
    if (cached) {
      raw = cached.output;
      meta = { provider: cached.provider, model: cached.model, onDevice: cached.onDevice, mode: 'replay', recordedAt: cached.recordedAt };
      notes.push(`Replayed recorded ${cached.model} answer from ${cached.recordedAt}`);
    }
  }

  if (!raw) {
    raw = deterministicAnalysis(incident);
    meta = { provider: 'rules', model: 'keyword rules', onDevice: true, mode: 'fallback' };
    notes.push('Deterministic keyword fallback (no model output used)');
  }

  const result = validateAnalysis(raw, incident, { confirmedFacts });
  return { ...result, meta: { ...meta, durationMs: Date.now() - started, notes } };
}
