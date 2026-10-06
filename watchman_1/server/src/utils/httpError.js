// Errors with an HTTP status and a message that is safe to show the user.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.expose = true;
  }
}

// Wrap async route handlers so thrown errors reach the Express error handler.
export const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Who is acting: the UI sends { actor, role } with every write.
export function actorFrom(req) {
  const actor = String(req.body?.actor || '').trim().slice(0, 80) || 'Unknown responder';
  const role = String(req.body?.role || 'ANALYST').toUpperCase();
  return { actor, role };
}
