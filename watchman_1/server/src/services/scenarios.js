// Self-written incident scenarios, shaped like Microsoft Sentinel / Defender XDR incidents.
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../data/scenarios/', import.meta.url);
export const SCENARIOS = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, dir))));

export const findScenario = (id) => SCENARIOS.find((s) => s.id === id);

const SEVERITY = { informational: 'LOW', low: 'LOW', medium: 'MEDIUM', high: 'HIGH', critical: 'CRITICAL' };

/**
 * Map a pasted Microsoft Sentinel / Defender XDR incident (ARM resource, API object,
 * or our simplified shape) to an incident. Pure field mapping: no AI involved.
 */
export function fromSentinel(raw) {
  const p = raw?.properties || raw || {};
  const title = p.title || p.incidentName || p.displayName;
  const entities = (raw.entities || p.entities || [])
    .map((e) => e.address || e.hostName || e.accountName || e.url || e.name || e.properties?.friendlyName)
    .filter(Boolean);
  const tactics = p.additionalData?.tactics || p.tactics || [];
  const description = [
    p.description,
    tactics.length ? `Tactics: ${tactics.join(', ')}.` : null,
    entities.length ? `Entities: ${entities.join(', ')}.` : null,
    p.firstActivityTimeUtc ? `Activity ${p.firstActivityTimeUtc} to ${p.lastActivityTimeUtc || '?'}.` : null,
  ].filter(Boolean).join(' ');
  return {
    title: title ? String(title).slice(0, 200) : null,
    description: description.slice(0, 5000) || null,
    severity: SEVERITY[String(p.severity || '').toLowerCase()] || 'MEDIUM',
    alert: {
      providerName: p.providerName || p.provider || 'Microsoft Sentinel',
      incidentNumber: p.incidentNumber ?? p.incidentId ?? null,
      title, severity: p.severity, status: p.status, tactics,
      firstActivityTimeUtc: p.firstActivityTimeUtc, lastActivityTimeUtc: p.lastActivityTimeUtc,
    },
  };
}
