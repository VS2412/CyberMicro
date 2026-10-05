import { Incident } from '../models/Incident.js';
import { generateEventHash, verifyChainIntegrity, GENESIS_HASH } from '../utils/cryptoChain.js';
import { generateIncidentPlaybook } from '../services/aiService.js';

export async function generatePlaybook(req, res) {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid incident ID format' });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Call the AI model
    const aiResult = await generateIncidentPlaybook({
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
    });

    // Populate suggested steps & MITRE techniques
    incident.suggestedSteps = aiResult.suggestedSteps.map((step) => ({
      phase: step.phase,
      task: step.task,
      completed: false,
    }));

    incident.mitreTechniques = aiResult.mitreTechniques;

    // If AI flags a likely breach and the clock hasn't been triggered yet, trigger it
    if (aiResult.isLikelyRegulatoryBreach && !incident.regulatoryClock.triggered) {
      const now = new Date();
      incident.regulatoryClock.triggered = true;
      incident.regulatoryClock.startedAt = now;
      incident.regulatoryClock.deadline = new Date(now.getTime() + 72 * 60 * 60 * 1000);
      incident.regulatoryClock.dataBreachConfirmed = true;
    }

    // Append AI generation event into the hash chain
    const lastEvent = incident.timeline[incident.timeline.length - 1];
    const previousHash = lastEvent ? lastEvent.currentHash : GENESIS_HASH;
    const timestamp = new Date();

    const currentHash = generateEventHash({
      previousHash,
      action: 'AI Playbook & MITRE Mapping Generated',
      responder: 'AI-Assistant (NIST SP 800-61 Engine)',
      details: { 
        techniquesCount: aiResult.mitreTechniques.length,
        stepsCount: aiResult.suggestedSteps.length 
      },
      timestamp,
    });

    incident.timeline.push({
      timestamp,
      action: 'AI Playbook & MITRE Mapping Generated',
      phase: 'DETECTION_ANALYSIS',
      responder: 'AI-Assistant (NIST SP 800-61 Engine)',
      details: {
        techniques: aiResult.mitreTechniques.map((t) => t.techniqueId),
      },
      previousHash,
      currentHash,
    });

    await incident.save();

    return res.status(200).json({
      success: true,
      summary: aiResult.summary,
      mitreTechniques: incident.mitreTechniques,
      suggestedSteps: incident.suggestedSteps,
      regulatoryClock: incident.regulatoryClock,
    });
  } catch (error) {
    req.log.error(error, 'Failed to generate incident playbook');
    return res.status(500).json({ error: 'AI Playbook generation failed', details: error.message });
  }
}