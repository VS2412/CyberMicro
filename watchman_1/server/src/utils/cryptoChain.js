// src/utils/cryptoChain.js
// Tamper-evident, hash-chained timeline.
//
// Every event's hash covers ALL of its meaningful fields plus the previous event's
// hash, so editing any past event (or deleting/reordering one) breaks every hash after it.
// Hashes are HMAC-SHA256 keyed with CHAIN_SECRET: someone with database access but
// without the server secret cannot quietly recompute a "valid" chain after editing it.
import crypto from 'node:crypto';

export const GENESIS_HASH = '0'.repeat(64);
export const CHAIN_ALGORITHM = 'HMAC-SHA256 over canonical JSON';

function chainSecret() {
  const secret = process.env.CHAIN_SECRET;
  if (!secret) throw new Error('CHAIN_SECRET is not set; refusing to build an unkeyed audit chain');
  return secret;
}

function toPlain(value) {
  if (value && typeof value.toObject === 'function') return value.toObject();
  if (value instanceof Map) return Object.fromEntries(value);
  return value;
}

/**
 * Deterministic JSON: object keys sorted recursively, Dates as ISO strings,
 * undefined dropped. Same logical content -> same bytes -> same hash,
 * regardless of key order or Mongoose wrappers.
 */
export function canonicalize(value) {
  value = toPlain(value);
  if (value === undefined) return undefined;
  if (value === null || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalize(v) ?? 'null').join(',')}]`;
  }
  if (typeof value === 'object') {
    if (value._bsontype === 'ObjectId' || value._bsontype === 'ObjectID') return JSON.stringify(String(value));
    const parts = Object.keys(value)
      .sort()
      .filter((k) => value[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`);
    return `{${parts.join(',')}}`;
  }
  return JSON.stringify(String(value));
}

/** The exact set of fields that are sealed into each event's hash. */
function sealedFields(event) {
  return {
    seq: event.seq,
    timestamp: new Date(event.timestamp).toISOString(),
    type: event.type,
    action: event.action,
    phase: event.phase ?? null,
    actor: event.actor,
    role: event.role ?? null,
    details: toPlain(event.details) ?? {},
    previousHash: event.previousHash,
  };
}

export function hashEvent(event) {
  return crypto.createHmac('sha256', chainSecret()).update(canonicalize(sealedFields(event))).digest('hex');
}

/**
 * Append a sealed event to an incident document's timeline (caller saves).
 * This is the ONLY way events should enter the timeline.
 */
export function appendEvent(incident, { type, action, phase, actor, role, details = {} }) {
  const last = incident.timeline[incident.timeline.length - 1];
  const event = {
    seq: incident.timeline.length,
    timestamp: new Date(),
    type,
    action,
    phase,
    actor: actor || 'system',
    role,
    details: JSON.parse(JSON.stringify(details ?? {})), // store exactly what we hash
    previousHash: last ? last.currentHash : GENESIS_HASH,
  };
  event.currentHash = hashEvent(event);
  incident.timeline.push(event);
  return incident.timeline[incident.timeline.length - 1];
}

/**
 * Re-derive every hash. Returns the first broken index (if any) plus a per-event
 * status so the UI can paint everything from the break onward red.
 */
export function verifyChain(rawTimeline = []) {
  const timeline = rawTimeline.map(toPlain);
  const events = [];
  let firstBrokenIndex = null;
  let reason = null;

  timeline.forEach((ev, i) => {
    if (firstBrokenIndex === null) {
      const expectedPrev = i === 0 ? GENESIS_HASH : timeline[i - 1].currentHash;
      if (ev.seq !== i) {
        firstBrokenIndex = i;
        reason = `Event #${i} is out of sequence (found seq ${ev.seq}): an event was deleted or reordered`;
      } else if (ev.previousHash !== expectedPrev) {
        firstBrokenIndex = i;
        reason = `Event #${i} does not link to event #${i - 1}: the chain was cut or reordered`;
      } else if (hashEvent(ev) !== ev.currentHash) {
        firstBrokenIndex = i;
        reason = `Event #${i} ("${ev.action}") was modified after it was recorded: its seal no longer matches`;
      }
    }
    events.push({ seq: i, status: firstBrokenIndex === null ? 'ok' : i === firstBrokenIndex ? 'tampered' : 'untrusted' });
  });

  return {
    valid: firstBrokenIndex === null,
    totalEvents: timeline.length,
    firstBrokenIndex,
    reason,
    headHash: timeline.length ? timeline[timeline.length - 1].currentHash : GENESIS_HASH,
    algorithm: CHAIN_ALGORITHM,
    events,
    checkedAt: new Date().toISOString(),
  };
}
