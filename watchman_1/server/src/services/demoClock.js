// Demo "time machine". It shifts what the app considers NOW, so we can show
// a clock 60 hours later. It never rewrites stored records: rewriting
// recorded times to simulate the future would be falsifying evidence.
let offsetMs = 0;

export function effectiveNow() {
  return new Date(Date.now() + offsetMs);
}

export function getOffsetHours() {
  return offsetMs / 3600e3;
}

export function setOffsetHours(hours) {
  const h = Number(hours);
  if (!Number.isFinite(h) || h < 0 || h > 24 * 60) throw new Error('offsetHours must be between 0 and 1440');
  offsetMs = h * 3600e3;
  return getOffsetHours();
}

/** Recorded on events created while time-travel is on, for full transparency. */
export function demoStamp() {
  return offsetMs ? { demoOffsetHours: getOffsetHours() } : {};
}
