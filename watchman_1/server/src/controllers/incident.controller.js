import { Incident } from '../models/Incident.js';
import { generateEventHash, GENESIS_HASH } from '../utils/cryptoChain.js';

export async function createIncident(req, res) {
  try {
    const { title, description, severity, dataBreachConfirmed, responder = 'SecOps Responder' } = req.body;
    const startedAt = new Date();
    const isBreach = Boolean(dataBreachConfirmed);

    const initialHash = generateEventHash({
      previousHash: GENESIS_HASH,
      action: 'Incident Initialized',
      responder,
      details: { title, severity },
      timestamp: startedAt,
    });

    const incident = new Incident({
      title,
      description,
      severity,
      regulatoryClock: {
        triggered: isBreach,
        startedAt: isBreach ? startedAt : undefined,
        deadline: isBreach ? new Date(startedAt.getTime() + 72 * 60 * 60 * 1000) : undefined,
        dataBreachConfirmed: isBreach,
      },
      timeline: [
        {
          timestamp: startedAt,
          action: 'Incident Initialized',
          phase: 'DETECTION_ANALYSIS',
          responder,
          details: { title, severity },
          previousHash: GENESIS_HASH,
          currentHash: initialHash,
        },
      ],
    });

    await incident.save();
    req.log.info({ incidentId: incident._id }, 'Incident initialized');
    return res.status(201).json(incident);
  } catch (error) {
    req.log.error({ error }, 'Failed to create incident');
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function getIncidentById(req, res) {
  try {
    const incident = await Incident.findById(req.params.id).lean();
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    return res.status(200).json(incident);
  } catch (error) {
    req.log.error({ error }, 'Failed to fetch incident');
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}