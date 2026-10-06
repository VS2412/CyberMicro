import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTechnique, validateTechniques } from '../src/services/attackService.js';

test('valid technique gets its official name', () => {
  const v = validateTechnique('t1190', 'ai');
  assert.equal(v.status, 'valid');
  assert.equal(v.name, 'Exploit Public-Facing Application');
});

test('revoked T1086 is remapped to T1059.001', () => {
  const v = validateTechnique('T1086', 'analyst');
  assert.equal(v.status, 'remapped');
  assert.equal(v.id, 'T1059.001');
});

test('invented and malformed IDs are rejected', () => {
  assert.equal(validateTechnique('T1999', 'ai').status, 'rejected');
  assert.equal(validateTechnique('Phishing', 'ai').status, 'rejected');
});

test('duplicates collapse (T1086 and T1059.001 are the same technique)', () => {
  assert.equal(validateTechniques(['T1059.001', 'T1086', 'T1059/001'], 'ai').length, 1);
});
