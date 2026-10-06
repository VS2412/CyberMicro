import { Incident } from '../models/Incident.js';
import { appendEvent } from '../utils/cryptoChain.js';
import { findIncident, serializeIncident } from '../services/incidentStore.js';
import { HttpError, actorFrom } from '../utils/httpError.js';
import { findScenario, fromSentinel } from '../services/scenarios.js';

export async function createIncident(req, res) {
  let { title, description, severity = 'MEDIUM', source, scenarioId, sentinel } = req.body || {};
  if (sentinel) {
    const m = fromSentinel(sentinel);
    if (!m.title || !m.description) throw new HttpError(400, 'Could not find a title and description in the pasted Sentinel incident');
    ({ title, description, severity } = m);
    source = { kind: 'sentinel', alert: m.alert };
  }
  if (scenarioId) {
    const sc = findScenario(scenarioId);
    if (!sc) throw new HttpError(400, `Unknown scenario ${scenarioId}`);
    ({ title, description, severity } = sc);
    source = { kind: 'sentinel', scenarioId: sc.id, alert: sc.sentinel };
  }
  if (!title?.trim() || !description?.trim()) throw new HttpError(400, 'title and description are required');
  const { actor, role } = actorFrom(req);

  const incident = new Incident({
    title,
    description,
    severity,
    source: source && typeof source === 'object' ? source : { kind: 'manual' },

  });
  appendEvent(incident, {
    type: 'INCIDENT_CREATED',
    action: 'Incident opened',
    phase: 'DETECTION_ANALYSIS',
    actor,
    role,
    details: {
      title, severity, description,
      source: incident.source?.kind,
      sentinelIncident: incident.source?.alert?.incidentNumber,
    },
  });

  await incident.save();
  req.log.info({ incidentId: incident._id }, 'Incident initialized');
  res.status(201).json(serializeIncident(incident));
}

export async function listIncidents(req, res) {
  const incidents = await Incident.find({}, 'title severity status createdAt')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json(incidents);
}

export async function getIncidentById(req, res) {
  res.json(serializeIncident(await findIncident(req.params.id)));
}
