import { Incident } from '../models/Incident.js';
import { generateEventHash, verifyChainIntegrity, GENESIS_HASH } from '../utils/cryptoChain.js';

export async function addTimelineAction(req, res) {
  try {
    const { id } = req.params;
    const { action, phase, responder, details } = req.body;

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const timestamp = new Date();
    const lastEvent = incident.timeline[incident.timeline.length - 1];
    const previousHash = lastEvent ? lastEvent.currentHash : GENESIS_HASH;

    const currentHash = generateEventHash({
      previousHash,
      action,
      responder,
      details,
      timestamp,
    });

    incident.timeline.push({
      timestamp,
      action,
      phase,
      responder,
      details,
      previousHash,
      currentHash,
    });

    await incident.save();
    req.log.info({ incidentId: id, hash: currentHash }, 'Timeline action appended');
    return res.status(200).json({ success: true, timeline: incident.timeline });
  } catch (error) {
    req.log.error({ error }, 'Failed to append timeline event');
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function verifyAuditChain(req, res) {
  try {
    const { id } = req.params;
    const incident = await Incident.findById(id).lean();
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const verificationResult = verifyChainIntegrity(incident.timeline);
    req.log.info({ incidentId: id, valid: verificationResult.valid }, 'Chain integrity checked');
    return res.status(200).json(verificationResult);
  } catch (error) {
    req.log.error({ error }, 'Verification execution failed');
    return res.status(500).json({ error: 'Verification failed', details: error.message });
  }
}