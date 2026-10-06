import { Incident } from '../models/Incident.js';
import { findIncident, serializeIncident } from '../services/incidentStore.js';
import { HttpError } from '../utils/httpError.js';
import { effectiveNow, getOffsetHours, setOffsetHours } from '../services/demoClock.js';

export function demoEnabled() {
  return process.env.DEMO_MODE === '1';
}

export function requireDemo(req, res, next) {
  if (!demoEnabled()) return next(new HttpError(403, 'Demo controls are disabled (set DEMO_MODE=1)'));
  next();
}

/**
 * Simulates a rogue insider editing the database directly, bypassing the app
 * entirely (raw MongoDB update, no hashing). The most damaging realistic edit is
 * pushing the "we became aware of the breach" time later, to hide a missed
 * notification deadline. If no such event exists we alter the latest action text.
 */
export async function tamperWithTimeline(req, res) {
  const incident = await findIncident(req.params.id);
  const timeline = incident.timeline;
  if (timeline.length < 2) throw new HttpError(400, 'Need at least 2 timeline events to demonstrate tampering');

  const isFact = (e) => e.type === 'FACT' && e.details?.value === true && e.details?.awareAt;
  let index = timeline.findLastIndex((e) => isFact(e) && e.details.key === 'personal_data_breach');
  if (index < 0) index = timeline.findLastIndex(isFact);
  let update;
  let story;
  if (index >= 0) {
    const original = new Date(timeline[index].details.awareAt);
    const forged = new Date(original.getTime() + 30 * 3600 * 1000).toISOString();
    update = { [`timeline.${index}.details.awareAt`]: forged };
    story = `Moved the "${timeline[index].details.key}" awareness time in event #${index} 30 hours later (${original.toISOString()} → ${forged}) to make a missed deadline look on-time`;
  } else {
    index = timeline.length - 1;
    update = { [`timeline.${index}.action`]: `${timeline[index].action} (edited)` };
    story = `Silently rewrote the text of event #${index}`;
  }

  // Raw driver call: no Mongoose middleware, no re-hashing, exactly like a DBA with direct access.
  await Incident.collection.updateOne({ _id: incident._id }, { $set: update });
  req.log.warn({ incidentId: req.params.id, index }, 'DEMO: simulated insider tampering');

  res.json({ tamperedIndex: index, story, incident: serializeIncident(await findIncident(req.params.id)) });
}

export function getDemoClock(req, res) {
  res.json({ offsetHours: getOffsetHours(), now: effectiveNow().toISOString() });
}

export function setDemoClock(req, res) {
  try {
    const offsetHours = setOffsetHours(req.body?.offsetHours ?? 0);
    req.log.warn({ offsetHours }, 'DEMO: time machine set');
    res.json({ offsetHours, now: effectiveNow().toISOString() });
  } catch (err) {
    throw new HttpError(400, err.message);
  }
}
