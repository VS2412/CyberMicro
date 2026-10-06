// Builds the compliance report from structured, sealed data only, and checks it
// against what each triggered regulation requires (e.g. GDPR Art. 33(3)(a)–(d)).
import { readFileSync } from 'node:fs';
import { generateJSON, providerInfo } from './llm/index.js';
import { logger } from '../config/logger.js';
import { extractObservables } from './aiService.js';

export const REPORT_RULES = JSON.parse(readFileSync(new URL('../rules/reportFields.json', import.meta.url)));
export const FIELD_DEFS = Object.fromEntries(REPORT_RULES.fields.map((f) => [f.key, f]));

const isFilled = (v) => v !== undefined && v !== null && String(v).trim() !== '';

function systemValue(key, data) {
  const f = data.facts || {};
  const t = (k) => (f[k]?.value === true ? { value: f[k].awareAt, source: 'system', note: `event #${f[k].seq}, ${f[k].actor}` } : null);
  if (key === 'awareness_time') return t('personal_data_breach');
  if (key === 'detection_time') return t('cyber_incident_detected');
  if (key === 'classification_time') return t('major_ict_incident');
  if (key === 'indicators') {
    const obs = data.observables?.length ? data.observables : extractObservables(`${data.title}\n${data.description}`);
    return obs.length ? { value: obs.map((o) => `${o.type}: ${o.value}`).join('; '), source: 'system', note: 'extracted from alert text' } : null;
  }
  return null;
}

/** Completeness of every report profile for obligations that are currently triggered. */
export function buildCompleteness(data) {
  const fields = data.report?.fields || {};
  const active = (data.obligations || []).filter((o) => ['running', 'asap', 'submitted'].includes(o.status));
  const sections = [];
  for (const ob of active) {
    const profile = REPORT_RULES.profiles[ob.stageId];
    if (!profile) continue;
    const items = profile.items.map((it) => {
      if (it.system) {
        const v = systemValue(it.system, data);
        return { key: it.system, label: it.label, clause: it.clause, system: true, value: v?.value ?? null, note: v?.note, complete: Boolean(v) };
      }
      const f = fields[it.field];
      const def = FIELD_DEFS[it.field];
      const complete = isFilled(f?.value) && f.source !== 'ai_draft';
      return {
        key: it.field, label: def.label, clause: it.clause, value: f?.value ?? null, source: f?.source || null,
        approvedBy: f?.approvedBy || null, complete, pendingAiDraft: f?.source === 'ai_draft',
      };
    });
    sections.push({
      stageId: ob.stageId, regulationId: ob.regulationId, title: profile.title, obligation: ob.label,
      deadline: ob.deadline || ob.deadlineText || null, status: ob.status,
      items, done: items.filter((i) => i.complete).length, total: items.length,
    });
  }
  const done = sections.reduce((a, s) => a + s.done, 0);
  const total = sections.reduce((a, s) => a + s.total, 0);
  const blockers = [];
  if (!data.integrity?.valid) blockers.push('Audit chain integrity is broken');
  if (!sections.length) blockers.push('No notification obligation is triggered yet');
  for (const s of sections) for (const i of s.items) if (!i.complete) blockers.push(`${s.regulationId}: ${i.label}${i.pendingAiDraft ? ' (AI draft awaiting human approval)' : ''}`);
  return { sections, done, total, canFinalize: blockers.length === 0, blockers };
}

// ---------- Drafting narrative fields (AI, constrained, number-checked) ----------

function draftFacts(data) {
  const fields = data.report?.fields || {};
  const facts = Object.values(data.facts || {}).filter((f) => f.value === true).map((f) => `${f.key} (aware ${f.awareAt})`);
  return {
    title: data.title,
    description: data.description,
    confirmedDeterminations: facts,
    dataCategories: fields.data_categories?.value || 'not yet recorded',
    approxPeople: fields.approx_subjects?.value ?? 'not yet recorded',
    approxRecords: fields.approx_records?.value ?? 'not yet recorded',
    indicators: (data.observables || []).map((o) => o.value),
    completedActions: (data.steps || []).filter((s) => s.status === 'done').map((s) => s.text),
  };
}

// Figures in a draft must come from the confirmed facts, whether written as digits ("50,214")
// or as words ("half a million"); models like to round, inflate, or mislabel numbers.
const NUMBER_WORDS = /\b(hundreds?|thousands?|millions?|billions?|dozens?|lakhs?|crores?|half[\s-]a[\s-]\w+)\b/gi;
export function unsupportedFigures(text, payload) {
  const lowerPayload = payload.toLowerCase();
  const plain = payload.replace(/,/g, '');
  const digits = (text.match(/\d[\d,.]*/g) || []).map((n) => n.replace(/[,.]$/, '')).filter((n) => !plain.includes(n.replace(/,/g, '')));
  const words = (text.match(NUMBER_WORDS) || []).filter((w) => !lowerPayload.includes(w.toLowerCase()));
  return [...new Set([...digits, ...words])];
}

const fmtNum = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : n);

function templateDraft(key, data) {
  const ff = draftFacts(data);
  if (key === 'nature_of_breach') {
    const scale = ff.approxRecords !== 'not yet recorded'
      ? ` Approximately ${fmtNum(ff.approxRecords)} records relating to ${fmtNum(ff.approxPeople)} individuals were affected (${ff.dataCategories}).`
      : '';
    return `${ff.title}.${scale} Detection and analysis are ongoing; details may be supplemented in phases as permitted (GDPR Art. 33(4)).`;
  }
  if (key === 'likely_consequences') {
    const c = String(ff.dataCategories).toLowerCase();
    const risks = [];
    if (/iban|account|card|balance/.test(c)) risks.push('financial fraud or unauthorised transactions');
    if (/email|phone|contact/.test(c)) risks.push('targeted phishing and social-engineering attempts');
    if (/birth|passport|id|address/.test(c)) risks.push('identity theft');
    if (!risks.length) risks.push('loss of confidentiality of personal data');
    return `Affected individuals may face ${risks.join(', ')}. The bank is monitoring affected accounts and will advise individuals on protective steps.`;
  }
  return '';
}

export async function draftField(key, data) {
  const def = FIELD_DEFS[key];
  const facts = draftFacts(data);
  const payload = JSON.stringify(facts);
  try {
    const out = await generateJSON({
      system: 'You draft sections of a bank\'s regulatory breach notification. Use ONLY the facts given. Never invent numbers, names, dates or systems. If something is unknown, say it is under investigation. 2-4 sentences, formal, plain English. Answer as JSON {"text": "..."}',
      user: `Draft the section "${def.label}" (${def.help || ''}).\nFACTS:\n${payload}`,
      schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
    });
    const text = String(out.json.text || '').trim().slice(0, 2000);
    const unsupported = unsupportedFigures(text, payload);
    if (text.length < 20) throw new Error('empty draft');
    if (unsupported.length) {
      return { text: templateDraft(key, data), model: 'template', rejected: `AI draft used figures not in the confirmed facts (${unsupported.join(', ')}); replaced with a template draft` };
    }
    return { text, model: out.model };
  } catch (err) {
    logger.warn({ err: err.message }, 'Draft generation failed; using template');
    return { text: templateDraft(key, data), model: 'template', rejected: `AI unavailable (${err.message.slice(0, 80)}); template draft used` };
  }
}

export { providerInfo };
