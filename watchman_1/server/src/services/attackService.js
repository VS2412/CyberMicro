// Validates ATT&CK technique IDs against MITRE's official dataset (built by scripts/build-attack.mjs).
// Names always come from the dataset, never from the AI, so a hallucinated name can't reach a report.
import { readFileSync } from 'node:fs';

export const ATTACK = JSON.parse(readFileSync(new URL('../data/attack.min.json', import.meta.url)));

const ID_RE = /^T\d{4}(\.\d{3})?$/;

/** "t1059/001", " T1059.001 " -> "T1059.001" */
export function normalizeId(raw) {
  return String(raw || '').trim().toUpperCase().replace('/', '.');
}

export function validateTechnique(raw, source) {
  const inputId = normalizeId(raw);
  const base = { inputId, source };
  if (!ID_RE.test(inputId)) {
    return { ...base, status: 'rejected', note: `"${String(raw).slice(0, 40)}" is not an ATT&CK technique ID (expected T#### or T####.###)` };
  }
  const t = ATTACK.techniques[inputId];
  if (!t) {
    return { ...base, status: 'rejected', note: `${inputId} does not exist in ATT&CK Enterprise (${ATTACK.version}). Likely hallucinated.` };
  }
  if (t.revoked) {
    const r = t.replacedBy && ATTACK.techniques[t.replacedBy];
    if (r) {
      return {
        ...base, status: 'remapped', id: t.replacedBy, name: r.name, tactics: r.tactics, url: r.url,
        note: `${inputId} ("${t.name}") was revoked by MITRE and replaced by ${t.replacedBy}`,
      };
    }
    return { ...base, status: 'rejected', note: `${inputId} was revoked by MITRE with no replacement` };
  }
  if (t.deprecated) {
    return { ...base, status: 'deprecated', id: inputId, name: t.name, tactics: t.tactics, url: t.url, note: `${inputId} is deprecated by MITRE; prefer a current technique` };
  }
  return { ...base, status: 'valid', id: inputId, name: t.name, tactics: t.tactics, url: t.url };
}

/** Validate many IDs, dropping duplicates of the same final technique. */
export function validateTechniques(ids, source, existing = []) {
  const seen = new Set(existing.filter((t) => t.id).map((t) => t.id));
  const seenInput = new Set(existing.map((t) => t.inputId));
  const out = [];
  for (const raw of ids || []) {
    const v = validateTechnique(raw, source);
    if (seenInput.has(v.inputId)) continue;
    seenInput.add(v.inputId);
    if (v.id && seen.has(v.id)) continue;
    if (v.id) seen.add(v.id);
    out.push(v);
  }
  return out;
}
