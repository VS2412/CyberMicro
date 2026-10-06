// Evidence register with chain of custody. Files are hashed in the browser (SHA-256);
// only the fingerprint and custody metadata are recorded, and every registration,
// hand-over and re-verification is sealed into the timeline.
import { appendEvent } from '../utils/cryptoChain.js';
import { mutateIncident, serializeIncident, registerDecorator } from '../services/incidentStore.js';
import { HttpError, actorFrom } from '../utils/httpError.js';

const SHA256 = /^[a-f0-9]{64}$/;
const clean = (v, n = 200) => (v == null ? undefined : String(v).trim().slice(0, n) || undefined);

// Cross-check each evidence record against its sealed registration event:
// a direct database edit of a fingerprint is caught even if the timeline is untouched.
registerDecorator((data) => {
  for (const e of data.evidence || []) {
    const reg = data.timeline.find((ev) => ev.type === 'EVIDENCE_REGISTERED' && ev.details?.evidenceId === String(e._id));
    e.registryMatchesChain = Boolean(reg && reg.details.sha256 === e.sha256);
  }
});

export async function registerEvidence(req, res) {
  const { actor, role } = actorFrom(req);
  const b = req.body || {};
  const sha256 = String(b.sha256 || '').toLowerCase();
  if (!SHA256.test(sha256)) throw new HttpError(400, 'sha256 must be a 64-character hex SHA-256 digest');
  if (!clean(b.name)) throw new HttpError(400, 'name is required');

  const { incident } = await mutateIncident(req.params.id, (inc) => {
    if (inc.evidence.some((e) => e.sha256 === sha256)) throw new HttpError(409, 'This exact file is already registered');
    inc.evidence.push({
      name: clean(b.name),
      sha256,
      size: Number.isFinite(Number(b.size)) ? Number(b.size) : undefined,
      mime: clean(b.mime, 80),
      description: clean(b.description, 500),
      sourceHost: clean(b.sourceHost, 120),
      storageLocation: clean(b.storageLocation, 200) || 'Evidence vault (WORM storage)',
      collectedBy: actor,
      collectedAt: new Date(),
      custodian: actor,
      transfers: [],
    });
    const e = inc.evidence[inc.evidence.length - 1];
    appendEvent(inc, {
      type: 'EVIDENCE_REGISTERED',
      action: `Evidence registered: ${e.name} (SHA-256 ${sha256.slice(0, 12)}…)`,
      phase: 'CONTAINMENT_ERADICATION_RECOVERY',
      actor,
      role,
      details: { evidenceId: String(e._id), name: e.name, sha256, size: e.size, sourceHost: e.sourceHost, storageLocation: e.storageLocation, custodian: actor },
    });
  });
  res.status(201).json(serializeIncident(incident));
}

export async function transferEvidence(req, res) {
  const { actor, role } = actorFrom(req);
  const to = clean(req.body?.to, 120);
  const reason = clean(req.body?.reason, 300);
  if (!to || !reason) throw new HttpError(400, 'Both "to" (receiving custodian) and "reason" are required');

  const { incident } = await mutateIncident(req.params.id, (inc) => {
    const e = inc.evidence.id(req.params.eid);
    if (!e) throw new HttpError(404, 'Evidence not found');
    if (e.custodian !== actor && role !== 'INCIDENT_COMMANDER') {
      throw new HttpError(403, `Only the current custodian (${e.custodian}) or the Incident Commander can hand over this evidence`);
    }
    if (to === e.custodian) throw new HttpError(400, `${to} already holds this evidence`);
    const from = e.custodian;
    e.transfers.push({ from, to, reason, at: new Date(), by: actor });
    e.custodian = to;
    appendEvent(inc, {
      type: 'EVIDENCE_TRANSFER',
      action: `Custody of ${e.name} transferred: ${from} → ${to}`,
      phase: 'CONTAINMENT_ERADICATION_RECOVERY',
      actor,
      role,
      details: { evidenceId: String(e._id), sha256: e.sha256, from, to, reason },
    });
  });
  res.json(serializeIncident(incident));
}

export async function verifyEvidence(req, res) {
  const { actor, role } = actorFrom(req);
  const sha256 = String(req.body?.sha256 || '').toLowerCase();
  if (!SHA256.test(sha256)) throw new HttpError(400, 'sha256 must be a 64-character hex SHA-256 digest');
  let match;
  const { incident } = await mutateIncident(req.params.id, (inc) => {
    const e = inc.evidence.id(req.params.eid);
    if (!e) throw new HttpError(404, 'Evidence not found');
    match = e.sha256 === sha256;
    e.lastVerified = { at: new Date(), by: actor, match };
    appendEvent(inc, {
      type: 'EVIDENCE_VERIFIED',
      action: match ? `Evidence re-verified intact: ${e.name}` : `EVIDENCE MISMATCH: ${e.name} no longer matches its registered fingerprint`,
      phase: 'CONTAINMENT_ERADICATION_RECOVERY',
      actor,
      role,
      details: { evidenceId: String(e._id), expected: e.sha256, presented: sha256, match },
    });
  });
  res.json({ match, incident: serializeIncident(incident) });
}
