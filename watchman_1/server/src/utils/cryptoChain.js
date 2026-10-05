// src/utils/cryptoChain.js
import crypto from 'node:crypto';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Normalizes input so hashing is consistent regardless of Mongoose wrappers
 */
export function generateEventHash({ previousHash, action, responder, details, timestamp }) {
  // Ensure details is a clean plain object
  let cleanDetails = details;
  if (details && typeof details.toObject === 'function') {
    cleanDetails = details.toObject();
  } else if (!details || typeof details !== 'object') {
    cleanDetails = {};
  }

  const normalizedPayload = JSON.stringify({
    previousHash: previousHash || GENESIS_HASH,
    action: String(action || '').trim(),
    responder: String(responder || '').trim(),
    details: cleanDetails,
    timestamp: new Date(timestamp).toISOString(),
  });

  return crypto.createHash('sha256').update(normalizedPayload).digest('hex');
}

/**
 * Validates the full chain of custody across an incident's timeline
 */
export function verifyChainIntegrity(rawTimeline) {
  if (!rawTimeline || rawTimeline.length === 0) {
    return { valid: true, message: 'Timeline is empty' };
  }

  // Convert Mongoose subdocs to plain JS objects if needed
  const timeline = rawTimeline.map((item) =>
    typeof item.toObject === 'function' ? item.toObject() : item
  );

  for (let i = 0; i < timeline.length; i++) {
    const current = timeline[i];
    const expectedPreviousHash = i === 0 ? GENESIS_HASH : timeline[i - 1].currentHash;

    // 1. Verify link to previous event
    if (current.previousHash !== expectedPreviousHash) {
      return {
        valid: false,
        error: `Broken chain link at index ${i}`,
        expectedPreviousHash,
        actualPreviousHash: current.previousHash,
      };
    }

    // 2. Verify current event integrity
    const recalculatedHash = generateEventHash({
      previousHash: current.previousHash,
      action: current.action,
      responder: current.responder,
      details: current.details,
      timestamp: current.timestamp,
    });

    if (recalculatedHash !== current.currentHash) {
      return {
        valid: false,
        error: `Data tampering detected at index ${i}: hash signature mismatch`,
        storedHash: current.currentHash,
        recalculatedHash,
      };
    }
  }

  return { valid: true, totalEventsVerified: timeline.length };
}