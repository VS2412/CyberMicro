import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateObligations, addBusinessDays } from '../src/services/clockEngine.js';

const T0 = '2026-10-05T10:00:00.000Z'; // a Monday
let seq = 0;
const fact = (key, value, awareAt, timestamp = awareAt) =>
  ({ seq: seq++, type: 'FACT', timestamp, actor: 'tester', role: 'INCIDENT_COMMANDER', details: { key, value, awareAt } });
const plusH = (iso, h) => new Date(new Date(iso).getTime() + h * 3600e3).toISOString();
const find = (r, id) => r.obligations.find((o) => o.stageId === id);

test('no facts -> no clocks running (an alert alone starts nothing)', () => {
  const r = evaluateObligations({ timeline: [], now: T0 });
  assert.equal(r.summary.running, 0);
  assert.ok(r.obligations.every((o) => o.status === 'not_triggered'));
});

test('GDPR 72h starts at awareness, not at incident creation', () => {
  const aware = plusH(T0, 5);
  const r = evaluateObligations({ timeline: [fact('personal_data_breach', true, aware), fact('eu_data_subjects', true, T0)], now: plusH(T0, 6) });
  const g = find(r, 'GDPR_33');
  assert.equal(g.status, 'running');
  assert.equal(g.startedAt, aware);
  assert.equal(g.deadline, plusH(aware, 72));
  assert.equal(g.citation, 'GDPR Art. 33(1)');
});

test('GDPR does not apply without EU data subjects', () => {
  const r = evaluateObligations({ timeline: [fact('personal_data_breach', true, T0)], now: T0 });
  assert.equal(find(r, 'GDPR_33').status, 'not_triggered');
  assert.deepEqual(find(r, 'GDPR_33').missingFacts.map((m) => m.key), ['eu_data_subjects']);
});

test('CERT-In and RBI: 6 hours from detection', () => {
  const r = evaluateObligations({ timeline: [fact('cyber_incident_detected', true, T0)], now: T0 });
  assert.equal(find(r, 'CERTIN_6H').deadline, plusH(T0, 6));
  assert.equal(find(r, 'RBI_6H').deadline, plusH(T0, 6));
});

test('DORA initial = earliest of (classification + 4h, detection + 24h)', () => {
  // classified 22h after detection -> 24h outer limit wins
  const late = evaluateObligations({ timeline: [fact('cyber_incident_detected', true, T0), fact('major_ict_incident', true, plusH(T0, 22))], now: T0 });
  assert.equal(find(late, 'DORA_INITIAL').deadline, plusH(T0, 24));
  // classified 1h after detection -> 4h after classification wins
  const early = evaluateObligations({ timeline: [fact('cyber_incident_detected', true, T0), fact('major_ict_incident', true, plusH(T0, 1))], now: T0 });
  assert.equal(find(early, 'DORA_INITIAL').deadline, plusH(T0, 5));
  // intermediate waits for initial submission
  assert.equal(find(early, 'DORA_INTERMEDIATE').status, 'waiting');
});

test('DORA intermediate starts 72h from initial submission; final 1 month after intermediate', () => {
  const sub = (stageId, at) => ({ seq: seq++, type: 'NOTIFICATION_SUBMITTED', timestamp: at, actor: 'x', details: { stageId } });
  const tl = [fact('cyber_incident_detected', true, T0), fact('major_ict_incident', true, T0), sub('DORA_INITIAL', plusH(T0, 3)), sub('DORA_INTERMEDIATE', plusH(T0, 50))];
  const r = evaluateObligations({ timeline: tl, now: plusH(T0, 51) });
  assert.equal(find(r, 'DORA_INITIAL').status, 'submitted');
  assert.equal(find(r, 'DORA_INITIAL').onTime, true);
  assert.equal(find(r, 'DORA_INTERMEDIATE').onTime, true);
  assert.equal(find(r, 'DORA_FINAL').deadline, '2026-11-07T12:00:00.000Z');
});

test('SEC 8-K counts business days and skips the weekend', () => {
  // Determined Thursday 2026-10-08 -> Fri(1), Mon(2), Tue(3), Wed(4) = 2026-10-14
  const thu = '2026-10-08T15:00:00.000Z';
  assert.equal(addBusinessDays(thu, 4).toISOString(), '2026-10-14T23:59:59.999Z');
  const r = evaluateObligations({ timeline: [fact('material_incident', true, thu)], now: thu });
  assert.equal(find(r, 'SEC_8K').deadline, '2026-10-14T23:59:59.999Z');
});

test('retracting a fact stops the clock (and the retraction is itself a timeline event)', () => {
  const r = evaluateObligations({ timeline: [fact('cyber_incident_detected', true, T0), fact('cyber_incident_detected', false, plusH(T0, 1))], now: T0 });
  assert.equal(find(r, 'CERTIN_6H').status, 'not_triggered');
});

test('escalation tiers and overdue', () => {
  const tl = [fact('cyber_incident_detected', true, T0)];
  assert.equal(find(evaluateObligations({ timeline: tl, now: plusH(T0, 1) }), 'CERTIN_6H').tier, 'ok');
  assert.equal(find(evaluateObligations({ timeline: tl, now: plusH(T0, 4) }), 'CERTIN_6H').tier, 'warning');
  assert.equal(find(evaluateObligations({ timeline: tl, now: plusH(T0, 5.5) }), 'CERTIN_6H').tier, 'urgent');
  const over = evaluateObligations({ timeline: tl, now: plusH(T0, 7) });
  assert.equal(find(over, 'CERTIN_6H').tier, 'overdue');
  assert.equal(over.summary.overdue, 2); // CERT-In + RBI
});

test('GDPR Art. 34 has no fixed hours and needs the high-risk fact', () => {
  const tl = [fact('personal_data_breach', true, T0), fact('eu_data_subjects', true, T0)];
  assert.equal(find(evaluateObligations({ timeline: tl, now: T0 }), 'GDPR_34').status, 'not_triggered');
  tl.push(fact('high_risk_to_individuals', true, T0));
  const g34 = find(evaluateObligations({ timeline: tl, now: T0 }), 'GDPR_34');
  assert.equal(g34.status, 'asap');
});

test('a documented waiver closes the obligation', () => {
  const tl = [fact('personal_data_breach', true, T0), fact('eu_data_subjects', true, T0),
    { seq: seq++, type: 'OBLIGATION_WAIVED', timestamp: T0, actor: 'dpo', role: 'DPO', details: { stageId: 'GDPR_33', justification: 'Encrypted, key not compromised' } }];
  const g = find(evaluateObligations({ timeline: tl, now: T0 }), 'GDPR_33');
  assert.equal(g.status, 'waived');
  assert.equal(g.waiver.justification, 'Encrypted, key not compromised');
});
