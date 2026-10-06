import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unsupportedFigures, buildCompleteness } from '../src/services/reportService.js';

const payload = JSON.stringify({ approxRecords: 50214, approxPeople: 48900, description: '1,840 requests between 23:05 and 02:10 UTC' });

test('figures not in the confirmed facts are caught, digits or words', () => {
  assert.deepEqual(unsupportedFigures('Over half-a-million details were compromised.', payload), ['half-a-million']);
  assert.deepEqual(unsupportedFigures('About 60,000 records leaked.', payload), ['60,000']);
  assert.deepEqual(unsupportedFigures('50214 records of 48900 people; 1,840 requests.', payload), []);
  assert.deepEqual(unsupportedFigures('Thousands of customers', payload), ['Thousands']);
  assert.deepEqual(unsupportedFigures('50,214 records', payload), [], 'thousands separators are fine');
});

test('completeness counts AI drafts as incomplete until a human approves', () => {
  const data = {
    integrity: { valid: true },
    facts: { personal_data_breach: { value: true, awareAt: '2026-10-06T10:00:00Z', seq: 2, actor: 'a' } },
    obligations: [{ stageId: 'GDPR_33', regulationId: 'GDPR', label: 'Notify', status: 'running', deadline: 'x' }],
    report: { fields: { nature_of_breach: { value: 'draft text', source: 'ai_draft' }, dpo_contact: { value: 'dpo@contoso.example', source: 'human' } } },
  };
  const r = buildCompleteness(data);
  const s = r.sections[0];
  assert.equal(s.total, 8);
  assert.equal(s.done, 2); // dpo_contact + awareness time (system)
  assert.equal(s.items.find((i) => i.key === 'nature_of_breach').pendingAiDraft, true);
  assert.equal(r.canFinalize, false);
});

test('a broken audit chain blocks finalisation', () => {
  const r = buildCompleteness({ integrity: { valid: false }, obligations: [], report: { fields: {} } });
  assert.ok(r.blockers.includes('Audit chain integrity is broken'));
});
