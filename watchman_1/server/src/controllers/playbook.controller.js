import { appendEvent } from '../utils/cryptoChain.js';
import { mutateIncident, findIncident, serializeIncident } from '../services/incidentStore.js';
import { analyzeIncident, PLAYBOOKS } from '../services/aiService.js';
import { validateTechniques } from '../services/attackService.js';
import { deriveFacts } from '../services/clockEngine.js';
import { providerInfo } from '../services/llm/index.js';
import { HttpError, actorFrom } from '../utils/httpError.js';

const stepKey = (s) => (s.stepId ? `pb:${s.stepId}` : `ai:${s.text}`);

// Run the (validated) AI analysis and merge it into the incident without losing human decisions.
export async function analyze(req, res) {
  const { actor, role } = actorFrom(req);
  const snapshot = await findIncident(req.params.id);
  const result = await analyzeIncident(snapshot, { confirmedFacts: deriveFacts(snapshot.timeline) });

  const { incident } = await mutateIncident(req.params.id, (inc) => {
    const decided = new Map(inc.steps.filter((s) => s.status !== 'proposed').map((s) => [stepKey(s), s]));
    const fresh = result.steps.filter((s) => !decided.has(stepKey(s)));
    inc.steps = [...decided.values(), ...fresh];

    const kept = inc.techniques.filter((t) => t.source === 'analyst' || t.review);
    const freshTechniques = result.techniques.filter((t) => !kept.some((k) => k.inputId === t.inputId || (t.id && k.id === t.id)));
    inc.techniques = [...kept, ...freshTechniques];

    const history = inc.suggestedFacts.filter((s) => s.status !== 'pending');
    inc.suggestedFacts = [...history, ...result.suggestedFacts.filter((s) => !history.some((h) => h.key === s.key))];
    inc.summary = result.summary;
    inc.playbookIds = result.playbookIds;
    inc.observables = result.observables;
    inc.ai = { ...result.meta, generatedAt: new Date(), warnings: [...result.meta.notes, ...result.warnings] };

    appendEvent(inc, {
      type: 'AI_ANALYSIS',
      action: `AI analysis (${result.meta.model}, ${result.meta.mode}): ${result.playbookIds.join(' + ')}`,
      phase: 'DETECTION_ANALYSIS',
      actor: `AI assistant (${result.meta.model})`,
      role: 'AI',
      details: {
        requestedBy: actor,
        requestedByRole: role,
        provider: result.meta.provider,
        model: result.meta.model,
        mode: result.meta.mode,
        onDevice: result.meta.onDevice,
        playbookIds: result.playbookIds,
        aiProposedSteps: result.steps.filter((s) => s.source === 'ai').map((s) => s.text),
        techniques: result.techniques.map((t) => `${t.inputId}:${t.status}`),
        suggestedFacts: result.suggestedFacts.map((s) => s.key),
        rejected: result.warnings,
      },
    });
  });
  req.log.info({ incidentId: req.params.id, mode: result.meta.mode, ms: result.meta.durationMs }, 'AI analysis complete');
  res.json(serializeIncident(incident));
}

// Human decision on a step: approve / reject (Incident Commander), or mark done (anyone).
export async function decideStep(req, res) {
  const { decision, note } = req.body || {};
  if (!['approve', 'reject', 'done', 'reopen'].includes(decision)) throw new HttpError(400, 'decision must be approve, reject, done or reopen');
  const { actor, role } = actorFrom(req);
  if (['approve', 'reject'].includes(decision) && role !== 'INCIDENT_COMMANDER') {
    throw new HttpError(403, `Only the Incident Commander may ${decision} plan steps. You are acting as ${role}.`);
  }
  const { incident } = await mutateIncident(req.params.id, (inc) => {
    const step = inc.steps.id(req.params.stepRef);
    if (!step) throw new HttpError(404, 'Step not found');
    const status = { approve: 'approved', reject: 'rejected', done: 'done', reopen: 'proposed' }[decision];
    step.status = status;
    step.decidedBy = actor;
    step.decidedAt = new Date();
    appendEvent(inc, {
      type: 'STEP_DECISION',
      action: `${{ approve: 'Approved', reject: 'Rejected', done: 'Completed', reopen: 'Reopened' }[decision]}: ${step.stepId || 'AI-proposed step'} – ${step.text.slice(0, 90)}`,
      phase: step.phase,
      actor,
      role,
      details: { stepId: step.stepId, playbookId: step.playbookId, source: step.source, decision, note: note ? String(note).slice(0, 500) : undefined },
    });
  });
  res.json(serializeIncident(incident));
}

// Analyst tags an ATT&CK technique by ID; it is validated exactly like AI output.
export async function tagTechnique(req, res) {
  const { actor, role } = actorFrom(req);
  const raw = String(req.body?.id || '').trim();
  if (!raw) throw new HttpError(400, 'id is required');
  const { incident } = await mutateIncident(req.params.id, (inc) => {
    const [v] = validateTechniques([raw], 'analyst', inc.techniques);
    if (!v) throw new HttpError(409, `${raw} is already mapped`);
    inc.techniques.push({ ...v, review: v.status === 'rejected' ? undefined : 'confirmed', reviewedBy: actor });
    appendEvent(inc, {
      type: 'TECHNIQUE',
      action: `ATT&CK ${v.status === 'valid' ? 'mapped' : v.status}: ${v.inputId}${v.id && v.id !== v.inputId ? ` → ${v.id}` : ''}${v.name ? ` (${v.name})` : ''}`,
      phase: 'DETECTION_ANALYSIS',
      actor,
      role,
      details: { inputId: v.inputId, id: v.id, status: v.status, note: v.note },
    });
  });
  res.json(serializeIncident(incident));
}

// Dataset validation proves an ID exists, not that it fits this incident, so a human reviews the mapping.
export async function reviewTechnique(req, res) {
  const { actor, role } = actorFrom(req);
  const decision = req.body?.decision;
  if (!['confirmed', 'removed'].includes(decision)) throw new HttpError(400, 'decision must be confirmed or removed');
  const { incident } = await mutateIncident(req.params.id, (inc) => {
    const t = inc.techniques.find((x) => x.inputId === req.params.inputId);
    if (!t) throw new HttpError(404, 'Technique not found');
    t.review = decision;
    t.reviewedBy = actor;
    appendEvent(inc, {
      type: 'TECHNIQUE',
      action: `ATT&CK mapping ${decision} by analyst: ${t.id || t.inputId}${t.name ? ` (${t.name})` : ''}`,
      phase: 'DETECTION_ANALYSIS',
      actor,
      role,
      details: { inputId: t.inputId, id: t.id, decision, source: t.source },
    });
  });
  res.json(serializeIncident(incident));
}

export function listPlaybooks(req, res) {
  res.json({ playbooks: PLAYBOOKS, ai: providerInfo() });
}
