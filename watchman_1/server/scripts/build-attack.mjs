// One-time build step: compact MITRE's official ATT&CK Enterprise STIX bundle
// into src/data/attack.min.json (id -> name, tactics, revoked/deprecated, replacement).
// Usage: node scripts/build-attack.mjs /path/to/enterprise-attack.json
// Source: https://github.com/mitre/cti (enterprise-attack/enterprise-attack.json)
import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2];
if (!src) {
  console.error('usage: node scripts/build-attack.mjs <enterprise-attack.json>');
  process.exit(1);
}
const bundle = JSON.parse(readFileSync(src, 'utf8'));
const objects = bundle.objects;

const extId = (o) => o.external_references?.find((r) => r.source_name === 'mitre-attack')?.external_id;
const urlOf = (o) => o.external_references?.find((r) => r.source_name === 'mitre-attack')?.url;

const byStixId = new Map(objects.map((o) => [o.id, o]));
const revokedBy = new Map(
  objects
    .filter((o) => o.type === 'relationship' && o.relationship_type === 'revoked-by')
    .map((r) => [r.source_ref, r.target_ref])
);

const techniques = {};
for (const o of objects) {
  if (o.type !== 'attack-pattern') continue;
  const id = extId(o);
  if (!id) continue;
  const entry = {
    name: o.name,
    tactics: (o.kill_chain_phases || []).filter((k) => k.kill_chain_name === 'mitre-attack').map((k) => k.phase_name),
    url: urlOf(o),
  };
  if (o.revoked) {
    entry.revoked = true;
    const target = byStixId.get(revokedBy.get(o.id));
    if (target) entry.replacedBy = extId(target);
  }
  if (o.x_mitre_deprecated) entry.deprecated = true;
  techniques[id] = entry;
}

// The bundle carries no collection object; use the newest modification date as its version stamp.
const newest = objects.reduce((m, o) => (o.modified && o.modified > m ? o.modified : m), '');
const tactics = Object.fromEntries(
  objects.filter((o) => o.type === 'x-mitre-tactic' && !o.revoked && !o.x_mitre_deprecated).map((o) => [o.x_mitre_shortname, { id: extId(o), name: o.name }])
);
const out = {
  source: 'MITRE ATT&CK Enterprise (STIX 2.1, github.com/mitre/cti)',
  version: `data as of ${newest.slice(0, 10)}`,
  modified: newest,
  builtAt: new Date().toISOString(),
  tactics,
  techniques,
};
writeFileSync(new URL('../src/data/attack.min.json', import.meta.url), JSON.stringify(out));
const vals = Object.values(techniques);
console.log(`ATT&CK (${out.version}): ${vals.length} techniques (${vals.filter((t) => t.revoked).length} revoked, ${vals.filter((t) => t.deprecated).length} deprecated), ${Object.keys(tactics).length} tactics`);
