import { Incident } from '../models/Incident.js';
import { calculateClockStatus, dispatchNotification } from '../services/alertService.js';
import { generateEventHash, GENESIS_HASH } from '../utils/cryptoChain.js';

export async function triggerRegulatoryClock(req, res) {
  try {
    const { id } = req.params;
    const { confirmedBy = 'Incident Commander', breachReason } = req.body;

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    if (incident.regulatoryClock.triggered) {
      return res.status(400).json({ error: 'Clock already active' });
    }

    const now = new Date();
    const deadline = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    incident.regulatoryClock = {
      triggered: true,
      dataBreachConfirmed: true,
      startedAt: now,
      deadline,
    };

    const lastEvent = incident.timeline[incident.timeline.length - 1];
    const previousHash = lastEvent ? lastEvent.currentHash : GENESIS_HASH;

    const currentHash = generateEventHash({
      previousHash,
      action: '72-Hour Regulatory Breach Clock Triggered',
      responder: confirmedBy,
      details: { reason: breachReason },
      timestamp: now,
    });

    incident.timeline.push({
      timestamp: now,
      action: '72-Hour Regulatory Breach Clock Triggered',
      phase: 'DETECTION_ANALYSIS',
      responder: confirmedBy,
      details: { reason: breachReason },
      previousHash,
      currentHash,
    });

    await incident.save();
    await dispatchNotification({ incidentId: incident._id, alertTier: 'CLOCK_STARTED', hoursRemaining: 72 });
    req.log.warn({ incidentId: id }, 'Regulatory 72-hour clock triggered');

    return res.status(200).json({
      success: true,
      regulatoryClock: incident.regulatoryClock,
      clockStatus: calculateClockStatus(incident.regulatoryClock),
    });
  } catch (error) {
    req.log.error({ error }, 'Error triggering regulatory clock');
    return res.status(500).json({ error: 'Failed to trigger clock' });
  }
}

export async function getClockStatus(req, res) {
  try {
    const incident = await Incident.findById(req.params.id).lean();
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const status = calculateClockStatus(incident.regulatoryClock);
    return res.status(200).json(status);
  } catch (error) {
    req.log.error({ error }, 'Failed to get clock status');
    return res.status(500).json({ error: 'Failed to retrieve clock status' });
  }
}

export async function simulateClockOffset(req, res) {
  try {
    const { id } = req.params;
    const { hoursToAdvance = 49 } = req.body;

    const incident = await Incident.findById(id);
    if (!incident || !incident.regulatoryClock.triggered) {
      return res.status(400).json({ error: 'Incident not found or clock inactive' });
    }

    incident.regulatoryClock.startedAt = new Date(
      incident.regulatoryClock.startedAt.getTime() - hoursToAdvance * 60 * 60 * 1000
    );

    await incident.save();
    const status = calculateClockStatus(incident.regulatoryClock);
    await dispatchNotification({ incidentId: incident._id, alertTier: status.alertTier, hoursRemaining: status.hoursRemaining });

    return res.status(200).json({ message: `Clock advanced ${hoursToAdvance}h`, status });
  } catch (error) {
    req.log.error({ error }, 'Simulation error');
    return res.status(500).json({ error: 'Simulation failed' });
  }
}