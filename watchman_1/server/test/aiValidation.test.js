import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateAnalysis, PLAYBOOKS, analyzeIncident } from '../src/services/aiService.js';
import { validateTechnique } from '../src/services/attackService.js';

const incident = {
  title: 'Customer records exfiltrated via unauthenticated export API',
  severity: 'HIGH',
  description: 'External IP 203.0.113.45 called /api/v2/accounts/export?includeAll=true and 50,214 customer records were returned. Customers are in Ireland, Germany and India. The source IP is a hosting provider.',
  source: {},
};

// The real (bad) output phi4-mini produced during development.
const badOutput = {
  summary: 'An API was exploited.',
  playbookIds: ['PB-EXFIL-D1', 'PB-EXFIL-C1'],
  stepNotes: [
    { stepId: 'PB-EXFIL-C1', note: 'Close the hole: disable the vulnerable endpoint or feature flag, and block attacker IPs at the WAF/perimeter.' },
    { stepId: 'PB-EXFIL-D1', note: 'Focus on requests from 203.0.113.45 between 23:05 and 02:10 UTC' },
    { stepId: 'PB-NOPE-1', note: 'x' },
  ],
  extraSteps: [{ phase: 'CONTAINMENT_ERADICATION_RECOVERY', text: 'Identify who turned the feature flag on', rationale: 'root cause' }],
  techniqueIds: ['T1220.001', 'T1220.002', 'T1086'],
  observables: [{ type: 'ip', value: 'hosting provider' }, { type: 'ip', value: '10.9.9.9' }],
  suggestedFacts: [{ key: 'personal_data_breach', rationale: 'records returned' }, { key: 'material_incident', rationale: 'big' }, { key: 'made_up', rationale: '' }],
};

test('every playbook step references only real ATT&CK techniques', () => {
  for (const p of PLAYBOOKS) {
    for (const id of [...p.attack, ...p.steps.flatMap((s) => s.attack || [])]) {
      assert.equal(validateTechnique(id, 'playbook').status, 'valid', `${p.id} references ${id}`);
    }
  }
});

test('hallucinations in model output are caught and reported', () => {
  const r = validateAnalysis(badOutput, incident);
  assert.deepEqual(r.playbookIds, ['PB-EXFIL']); // step ids mapped back to their playbook
  assert.ok(r.steps.some((s) => s.playbookId === 'PB-CORE'), 'core playbook always included');
  const c1 = r.steps.find((s) => s.stepId === 'PB-EXFIL-C1');
  assert.equal(c1.rationale, undefined, 'echoed note dropped');
  assert.match(r.steps.find((s) => s.stepId === 'PB-EXFIL-D1').rationale, /203\.0\.113\.45/);
  assert.equal(r.steps.filter((s) => s.source === 'ai').length, 1);
  assert.deepEqual(r.techniques.filter((t) => t.source === 'ai').map((t) => t.status), ['rejected', 'rejected', 'remapped']);
  assert.ok(r.techniques.some((t) => t.source === 'playbook' && t.id === 'T1190'), 'reference techniques added');
  assert.ok(!r.observables.some((o) => o.value === 'hosting provider' || o.value === '10.9.9.9'));
  assert.ok(r.observables.some((o) => o.value === '203.0.113.45'));
  assert.deepEqual(r.suggestedFacts.filter((f) => f.by === 'ai').map((f) => f.key), ['personal_data_breach']);
  assert.ok(r.suggestedFacts.some((f) => f.by === 'rules' && f.key === 'eu_data_subjects'), 'keyword rules add labelled suggestions');
  assert.ok(!r.suggestedFacts.some((f) => f.key === 'material_incident'));
  assert.ok(r.warnings.some((w) => /Blocked: AI may not suggest/.test(w)));
});

test('with no model at all, the deterministic fallback still produces a plan', async () => {
  process.env.AI_MODE = 'fallback';
  const r = await analyzeIncident({ ...incident, source: {} });
  delete process.env.AI_MODE;
  assert.equal(r.meta.mode, 'fallback');
  assert.ok(r.playbookIds.includes('PB-EXFIL'));
  assert.ok(r.suggestedFacts.some((f) => f.key === 'eu_data_subjects'));
  assert.ok(r.steps.length > 8);
});

test('fact catalogue: legal classifications are human-only', () => {
  const facts = JSON.parse(readFileSync(new URL('../src/rules/facts.json', import.meta.url)));
  for (const k of ['material_incident', 'ransom_paid', 'major_ict_incident', 'nydfs_reportable', 'high_risk_to_individuals']) {
    assert.equal(facts.find((f) => f.key === k).aiMaySuggest, false, k);
  }
});

test('a technique whose evidence quote is not in the incident text is rejected', () => {
  const r = validateAnalysis({
    playbookIds: ['PB-EXFIL', 'PB-RANSOM'],
    techniques: [
      { id: 'T1190', evidence: 'called /api/v2/accounts/export?includeAll=true' },
      { id: 'T1486', evidence: 'files were encrypted by ransomware' },
    ],
  }, incident);
  assert.deepEqual(r.techniques.filter((t) => t.source === 'ai').map((t) => t.id), ['T1190']);
  assert.ok(r.warnings.some((w) => /Rejected T1486: its evidence quote/.test(w)));
  assert.deepEqual(r.playbookIds, ['PB-EXFIL'], 'unsupported second playbook dropped');
});
