import mongoose from 'mongoose';
import { Incident } from '../models/Incident.js';
import { verifyChain } from '../utils/cryptoChain.js';
import { HttpError } from '../utils/httpError.js';

/**
 * Load -> mutate -> save, retrying if someone else saved in between
 * (optimistic concurrency). Prevents two simultaneous appends from forking the chain.
 */
export async function mutateIncident(id, mutate) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const incident = await Incident.findById(id);
    if (!incident) throw new HttpError(404, 'Incident not found');
    const result = await mutate(incident);
    try {
      await incident.save();
      return { incident, result };
    } catch (err) {
      if (err instanceof mongoose.Error.VersionError && attempt < 2) continue;
      throw err;
    }
  }
}

export async function findIncident(id) {
  const incident = await Incident.findById(id);
  if (!incident) throw new HttpError(404, 'Incident not found');
  return incident;
}

// Decorators registered by other modules (clock engine, report) to enrich API output.
const decorators = [];
export function registerDecorator(fn) {
  decorators.push(fn);
}

/** The JSON the UI receives: the stored incident plus live integrity and derived views. */
export function serializeIncident(incident) {
  const data = incident.toObject({ flattenMaps: true });
  data.integrity = verifyChain(data.timeline);
  for (const decorate of decorators) decorate(data);
  return data;
}
