const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Tue 06 Oct 14:35 UTC". Incident response runs on UTC to avoid timezone confusion. */
export function fmtUtc(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${DAYS[d.getUTCDay()]} ${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

export function fmtUtcSeconds(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`;
}

/** Countdown text: "71h 59m 12s", or "OVERDUE 3h 12m" when negative. */
export function fmtCountdown(ms) {
  const neg = ms < 0;
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600e3);
  const m = Math.floor((abs % 3600e3) / 60e3);
  const s = Math.floor((abs % 60e3) / 1000);
  const body = h >= 48 ? `${Math.floor(h / 24)}d ${h % 24}h ${pad(m)}m` : `${h}h ${pad(m)}m ${pad(s)}s`;
  return neg ? `OVERDUE ${body}` : body;
}

export const ROLE_LABEL = {
  ANALYST: 'Analyst',
  INCIDENT_COMMANDER: 'Incident Commander',
  DPO: 'Data Protection Officer',
  LEGAL: 'Legal Counsel',
};

export const PHASE_LABEL = {
  PREPARATION: 'Preparation',
  DETECTION_ANALYSIS: 'Detection & Analysis',
  CONTAINMENT_ERADICATION_RECOVERY: 'Containment, Eradication & Recovery',
  POST_INCIDENT: 'Post-Incident Activity',
};

export const shortHash = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : '—');
