import { Incident } from '../models/Incident.js';
import { generateIncidentPlaybook } from '../services/aiService.js';
import { generateEventHash, GENESIS_HASH } from '../utils/cryptoChain.js';

export async function generatePlaybook(req, res) {
  try {
    const { id } = req.params;
    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const aiResult = await generateIncidentPlaybook({
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
    });

    incident.suggestedSteps = aiResult.suggestedSteps.map((step) => ({
      phase: step.phase,
      task: step.task,
      completed: false,
    }));
    incident.mitreTechniques = aiResult.mitreTechniques;

    if (aiResult.isLikelyRegulatoryBreach && !incident.regulatoryClock.triggered) {
      const now = new Date();
      incident.regulatoryClock = {
        triggered: true,
        dataBreachConfirmed: true,
        startedAt: now,
        deadline: new Date(now.getTime() + 72 * 60 * 60 * 1000),
      };
    }

    const lastEvent = incident.timeline[incident.timeline.length - 1];
    const previousHash = lastEvent ? lastEvent.currentHash : GENESIS_HASH;
    const timestamp = new Date();

    const currentHash = generateEventHash({
      previousHash,
      action: 'AI Playbook & MITRE Mapping Generated',
      responder: 'AI NIST Engine',
      details: { techniques: aiResult.mitreTechniques.map((t) => t.techniqueId) },
      timestamp,
    });

    incident.timeline.push({
      timestamp,
      action: 'AI Playbook & MITRE Mapping Generated',
      phase: 'DETECTION_ANALYSIS',
      responder: 'AI NIST Engine',
      details: { techniques: aiResult.mitreTechniques.map((t) => t.techniqueId) },
      previousHash,
      currentHash,
    });

    await incident.save();
    req.log.info({ incidentId: id }, 'Playbook generated and linked to incident');

    return res.status(200).json({
      success: true,
      summary: aiResult.summary,
      mitreTechniques: incident.mitreTechniques,
      suggestedSteps: incident.suggestedSteps,
      regulatoryClock: incident.regulatoryClock,
    });
  } catch (error) {
    req.log.error({ error }, 'Failed to generate incident playbook');
    return res.status(500).json({ error: 'AI Playbook generation failed', details: error.message });
  }
}