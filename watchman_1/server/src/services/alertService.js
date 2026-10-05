import { logger } from '../config/logger.js';

export const SLA_THRESHOLDS = {
  STAGE_1_WARNING: 24, // 24 hours elapsed (48 hours remaining)
  STAGE_2_URGENT: 48,  // 48 hours elapsed (24 hours remaining)
  STAGE_3_CRITICAL: 60 // 60 hours elapsed (12 hours remaining)
};

/**
 * Calculates current clock status against the 72-hour regulatory window.
 */
export function calculateClockStatus(regulatoryClock) {
  if (!regulatoryClock || !regulatoryClock.triggered || !regulatoryClock.startedAt) {
    return {
      active: false,
      message: '72-Hour regulatory clock has not been triggered for this incident.',
      hoursRemaining: null,
      percentElapsed: 0,
      isExpired: false
    };
  }

  const now = Date.now();
  const start = new Date(regulatoryClock.startedAt).getTime();
  const deadline = new Date(regulatoryClock.deadline).getTime();

  const totalDuration = 72 * 60 * 60 * 1000;
  const elapsedMs = Math.max(0, now - start);
  const remainingMs = Math.max(0, deadline - now);

  const hoursElapsed = elapsedMs / (1000 * 60 * 60);
  const hoursRemaining = remainingMs / (1000 * 60 * 60);
  const percentElapsed = Math.min(100, (elapsedMs / totalDuration) * 100);
  const isExpired = now >= deadline;

  // Determine alert level
  let alertTier = 'NOMINAL';
  if (isExpired) {
    alertTier = 'BREACH_MISSED_REGULATORY_VIOLATION';
  } else if (hoursElapsed >= SLA_THRESHOLDS.STAGE_3_CRITICAL) {
    alertTier = 'CRITICAL_12H_LEFT';
  } else if (hoursElapsed >= SLA_THRESHOLDS.STAGE_2_URGENT) {
    alertTier = 'URGENT_24H_LEFT';
  } else if (hoursElapsed >= SLA_THRESHOLDS.STAGE_1_WARNING) {
    alertTier = 'WARNING_48H_LEFT';
  }

  return {
    active: true,
    startedAt: regulatoryClock.startedAt,
    deadline: regulatoryClock.deadline,
    hoursElapsed: Number(hoursElapsed.toFixed(2)),
    hoursRemaining: Number(hoursRemaining.toFixed(2)),
    percentElapsed: Number(percentElapsed.toFixed(2)),
    isExpired,
    alertTier
  };
}

/**
 * Simulates enterprise alert dispatch (Console / Webhook / Notification)
 */
export async function dispatchNotification({ incidentId, alertTier, hoursRemaining }) {
  logger.warn(
    { incidentId, alertTier, hoursRemaining },
    `[REGULATORY CLOCK DISPATCH] Tier: ${alertTier} | ${hoursRemaining}h remaining until 72h GDPR/Banking deadline`
  );
  return { dispatched: true, tier: alertTier };
}