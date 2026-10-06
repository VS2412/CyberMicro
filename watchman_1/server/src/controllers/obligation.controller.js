import { appendEvent } from '../utils/cryptoChain.js';
import { mutateIncident, serializeIncident, registerDecorator } from '../services/incidentStore.js';
import { evaluateObligations, FACTS, RULES, ORG_PROFILE } from '../services/clockEngine.js';
import { effectiveNow, demoStamp, getOffsetHours } from '../services/demoClock.js';
import { HttpError, actorFrom } from '../utils/httpError.js';
import { ROLES } from '../models/Incident.js';
import { providerInfo } from '../services/llm/index.js';
import { ATTACK } from '../services/attackService.js';

// Every incident sent to the UI carries its live obligations.
registerDecorator((data) => {
  const result = evaluateObligations({ timeline: data.timeline, now: effectiveNow() });
  data.obligations = result.obligations;
  data.obligationSummary = result.summary;
  data.facts = result.facts;
  data.clock = { now: result.now, demoOffsetHours: getOffsetHours() };
  data.computedFromUntrustedData = !data.integrity.valid;
});

const allStages = RULES.regulations.flatMap((r) => r.stages.map((s) => ({ ...s, regulationId: r.id })));

function roleCheck(role, allowed, what) {
  if (!ROLES.includes(role)) throw new HttpError(400, `Unknown role ${role}`);
  if (!allowed.includes(role)) {
    throw new HttpError(403, `Only ${allowed.join(' or ')} may ${what}. You are acting as ${role}.`);
  }
}

// A human asserts (or retracts) a fact. This is the ONLY thing that can start a regulatory clock.
export async function assertFact(req, res) {
  const { key, value = true, awareAt, note } = req.body || {};
  const def = FACTS.find((f) => f.key === key);
  if (!def) throw new HttpError(400, `Unknown fact '${key}'`);
  if (typeof value !== 'boolean') throw new HttpError(400, 'value must be true or false');
  const { actor, role } = actorFrom(req);
  roleCheck(role, def.allowedRoles, `confirm "${def.label}"`);

  const now = effectiveNow();
  const aware = awareAt ? new Date(awareAt) : now;
  if (Number.isNaN(aware.getTime())) throw new HttpError(400, 'awareAt is not a valid date');
  if (aware > now) throw new HttpError(400, 'awareAt cannot be in the future');

  const { incident } = await mutateIncident(req.params.id, (inc) => {
    const suggestion = inc.suggestedFacts.find((s) => s.key === key && s.status === 'pending');
    if (suggestion) suggestion.status = value ? 'confirmed' : 'dismissed';
    appendEvent(inc, {
      type: 'FACT',
      action: `${value ? 'Confirmed' : 'Retracted'}: ${def.label}`,
      phase: 'DETECTION_ANALYSIS',
      actor,
      role,
      details: {
        key,
        value,
        awareAt: aware.toISOString(),
        note: note ? String(note).slice(0, 500) : undefined,
        fromAiSuggestion: Boolean(suggestion),
        ...demoStamp(),
      },
    });
  });
  req.log.warn({ incidentId: req.params.id, key, value, actor }, 'Fact asserted');
  res.json(serializeIncident(incident));
}

export async function dismissSuggestion(req, res) {
  const { actor, role } = actorFrom(req);
  const { incident } = await mutateIncident(req.params.id, (inc) => {
    const s = inc.suggestedFacts.find((x) => x.key === req.params.key && x.status === 'pending');
    if (!s) throw new HttpError(404, 'No pending suggestion for that fact');
    s.status = 'dismissed';
    appendEvent(inc, {
      type: 'AI_SUGGESTION_DISMISSED',
      action: `Dismissed AI suggestion: ${FACTS.find((f) => f.key === s.key)?.label || s.key}`,
      phase: 'DETECTION_ANALYSIS', actor, role, details: { key: s.key },
    });
  });
  res.json(serializeIncident(incident));
}

function findTriggeredStage(inc, stageId) {
  const stage = allStages.find((s) => s.id === stageId);
  if (!stage) throw new HttpError(404, `Unknown obligation ${stageId}`);
  const ob = evaluateObligations({ timeline: inc.timeline, now: effectiveNow() }).obligations.find((o) => o.stageId === stageId);
  return { stage, ob };
}

// Records that a notification was actually sent (by a human, outside this tool).
export async function markSubmitted(req, res) {
  const { actor, role } = actorFrom(req);
  roleCheck(role, ['INCIDENT_COMMANDER', 'DPO', 'LEGAL'], 'record a regulatory submission');
  const reference = String(req.body?.reference || '').trim().slice(0, 120);
  const { incident } = await mutateIncident(req.params.id, (inc) => {
    const { stage, ob } = findTriggeredStage(inc, req.params.stageId);
    if (!['running', 'asap'].includes(ob.status)) throw new HttpError(409, `${stage.id} is ${ob.status}; nothing to submit`);
    appendEvent(inc, {
      type: 'NOTIFICATION_SUBMITTED',
      action: `Notification submitted: ${ob.regulationId} – ${stage.label}${reference ? ` (ref ${reference})` : ''}`,
      phase: 'CONTAINMENT_ERADICATION_RECOVERY', actor, role,
      details: { stageId: stage.id, reference, deadline: ob.deadline || null, effectiveAt: effectiveNow().toISOString(), ...demoStamp() },
    });
  });
  res.json(serializeIncident(incident));
}

// "We decided NOT to notify", allowed only where the law permits it, only by the DPO/Legal,
// and only with a written justification (GDPR Art. 33(5) requires documenting it).
export async function waiveObligation(req, res) {
  const { actor, role } = actorFrom(req);
  roleCheck(role, ['DPO', 'LEGAL'], 'decide a notification is not required');
  const justification = String(req.body?.justification || '').trim();
  if (justification.length < 20) throw new HttpError(400, 'A written justification of at least 20 characters is required');
  const { incident } = await mutateIncident(req.params.id, (inc) => {
    const { stage, ob } = findTriggeredStage(inc, req.params.stageId);
    if (!stage.waivable) throw new HttpError(400, `${stage.id} cannot be waived under its rule`);
    if (!['running', 'asap'].includes(ob.status)) throw new HttpError(409, `${stage.id} is ${ob.status}`);
    appendEvent(inc, {
      type: 'OBLIGATION_WAIVED',
      action: `Decided NOT to notify: ${ob.regulationId} – ${stage.label}`,
      phase: 'DETECTION_ANALYSIS', actor, role,
      details: { stageId: stage.id, justification: justification.slice(0, 2000), legalBasis: stage.waivable },
    });
  });
  res.json(serializeIncident(incident));
}

// Static reference data for the UI: fact catalogue, roles, org profile, rule pack header.
export function getMeta(req, res) {
  res.json({
    facts: FACTS,
    roles: ROLES,
    profile: ORG_PROFILE,
    ruleset: { version: RULES.version, reviewedAt: RULES.reviewedAt, disclaimer: RULES.disclaimer },
    regulations: RULES.regulations.map((r) => ({ id: r.id, name: r.name, jurisdiction: r.jurisdiction, regulator: r.regulator, verify: r.verify || null })),
    demo: { enabled: process.env.DEMO_MODE === '1', offsetHours: getOffsetHours() },
    ai: providerInfo(),
    attack: { source: ATTACK.source, version: ATTACK.version, techniques: Object.keys(ATTACK.techniques).length },
  });
}
