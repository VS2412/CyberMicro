import { appendEvent } from '../utils/cryptoChain.js';
import { mutateIncident, findIncident, serializeIncident, registerDecorator } from '../services/incidentStore.js';
import { buildCompleteness, draftField, FIELD_DEFS } from '../services/reportService.js';
import { HttpError, actorFrom } from '../utils/httpError.js';

// Every incident sent to the UI carries its report completeness (runs after the obligations decorator).
registerDecorator((data) => {
  data.reportStatus = buildCompleteness(data);
  data.reportStatus.finalized = Boolean(data.report?.finalizedAt);
  data.reportStatus.changedSinceFinal = Boolean(data.report?.finalHeadHash && data.report.finalHeadHash !== data.integrity.headHash);
});

const HUMAN_ROLES = ['ANALYST', 'INCIDENT_COMMANDER', 'DPO', 'LEGAL'];

export async function setField(req, res) {
  const { key, value, approvedDraft } = req.body || {};
  const def = FIELD_DEFS[key];
  if (!def) throw new HttpError(400, `Unknown report field ${key}`);
  const { actor, role } = actorFrom(req);
  if (!HUMAN_ROLES.includes(role)) throw new HttpError(403, 'Only a human role may set report fields');
  if (key === 'materiality_assessment' && role !== 'LEGAL') throw new HttpError(403, 'Only Legal may write the materiality assessment');

  let v = typeof value === 'string' ? value.trim().slice(0, 4000) : value;
  if (def.type === 'number') {
    v = Number(String(v).replace(/[, _]/g, ''));
    if (!Number.isInteger(v) || v < 0) throw new HttpError(400, `${def.label} must be a whole number`);
  } else if (!v) {
    throw new HttpError(400, `${def.label} cannot be empty`);
  }

  const { incident } = await mutateIncident(req.params.id, (inc) => {
    const prev = inc.report.fields.get(key);
    inc.report.fields.set(key, { value: v, source: 'human', approvedBy: actor, approvedAt: new Date() });
    appendEvent(inc, {
      type: 'REPORT_FIELD',
      action: `${approvedDraft ? 'Approved AI draft' : prev ? 'Updated' : 'Recorded'} report field: ${def.label}`,
      phase: 'POST_INCIDENT',
      actor,
      role,
      details: { key, value: v, approvedDraft: Boolean(approvedDraft), previousSource: prev?.source || null },
    });
  });
  res.json(serializeIncident(incident));
}

export async function draft(req, res) {
  const { key } = req.body || {};
  const def = FIELD_DEFS[key];
  if (!def?.aiDraftable) throw new HttpError(400, `${key} cannot be AI-drafted`);
  const { actor, role } = actorFrom(req);
  const data = serializeIncident(await findIncident(req.params.id));
  const result = await draftField(key, data);

  const { incident } = await mutateIncident(req.params.id, (inc) => {
    inc.report.fields.set(key, { value: result.text, source: 'ai_draft' });
    appendEvent(inc, {
      type: 'REPORT_FIELD',
      action: `AI draft created for: ${def.label} (${result.model}), awaiting human approval`,
      phase: 'POST_INCIDENT',
      actor: `AI assistant (${result.model})`,
      role: 'AI',
      details: { key, value: result.text, requestedBy: actor, requestedByRole: role, rejected: result.rejected || null },
    });
  });
  res.json({ ...serializeIncident(incident), draftNote: result.rejected || null });
}

export async function finalize(req, res) {
  const { actor, role } = actorFrom(req);
  if (!['INCIDENT_COMMANDER', 'DPO', 'LEGAL'].includes(role)) throw new HttpError(403, 'Only the Incident Commander, DPO or Legal may finalise the report');
  const current = serializeIncident(await findIncident(req.params.id));
  if (!current.reportStatus.canFinalize) {
    throw new HttpError(409, `Report cannot be finalised yet: ${current.reportStatus.blockers.slice(0, 3).join('; ')}${current.reportStatus.blockers.length > 3 ? '…' : ''}`);
  }
  const { incident } = await mutateIncident(req.params.id, (inc) => {
    const ev = appendEvent(inc, {
      type: 'REPORT_FINALIZED',
      action: `Compliance report finalised (${current.reportStatus.sections.map((s) => s.regulationId).join(', ')})`,
      phase: 'POST_INCIDENT',
      actor,
      role,
      details: { sections: current.reportStatus.sections.map((s) => `${s.stageId}:${s.done}/${s.total}`), headHashBefore: current.integrity.headHash },
    });
    inc.report.finalizedAt = ev.timestamp;
    inc.report.finalizedBy = actor;
    inc.report.finalHeadHash = ev.currentHash;
  });
  res.json(serializeIncident(incident));
}
