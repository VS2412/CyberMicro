import { NIST_PHASES } from '../models/Incident.js';
import { appendEvent, verifyChain } from '../utils/cryptoChain.js';
import { findIncident, mutateIncident, serializeIncident } from '../services/incidentStore.js';
import { HttpError, actorFrom } from '../utils/httpError.js';

// Responder logs a free-text action/observation into the sealed timeline.
export async function addTimelineAction(req, res) {
  const { action, phase, details } = req.body || {};
  if (!action?.trim()) throw new HttpError(400, 'action is required');
  if (phase && !NIST_PHASES.includes(phase)) throw new HttpError(400, `phase must be one of ${NIST_PHASES.join(', ')}`);
  const { actor, role } = actorFrom(req);

  const { incident } = await mutateIncident(req.params.id, (inc) => {
    appendEvent(inc, { type: 'NOTE', action: action.trim().slice(0, 500), phase, actor, role, details: details || {} });
  });
  req.log.info({ incidentId: req.params.id }, 'Timeline action appended');
  res.json(serializeIncident(incident));
}

export async function verifyAuditChain(req, res) {
  const incident = await findIncident(req.params.id);
  const result = verifyChain(incident.timeline);
  req.log.info({ incidentId: req.params.id, valid: result.valid }, 'Chain integrity checked');
  res.json(result);
}
