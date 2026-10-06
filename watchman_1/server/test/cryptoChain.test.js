import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.CHAIN_SECRET = 'test-secret';
const { appendEvent, verifyChain, canonicalize, GENESIS_HASH } = await import('../src/utils/cryptoChain.js');

function buildIncident(n = 4) {
  const inc = { timeline: [] };
  for (let i = 0; i < n; i++) {
    appendEvent(inc, { type: 'NOTE', action: `event ${i}`, phase: 'DETECTION_ANALYSIS', actor: 'alice', details: { i } });
  }
  return inc;
}

test('canonical JSON ignores key order', () => {
  assert.equal(canonicalize({ b: 1, a: { d: 2, c: 3 } }), canonicalize({ a: { c: 3, d: 2 }, b: 1 }));
});

test('a fresh chain verifies and links back to genesis', () => {
  const inc = buildIncident();
  const r = verifyChain(inc.timeline);
  assert.equal(r.valid, true);
  assert.equal(r.totalEvents, 4);
  assert.equal(inc.timeline[0].previousHash, GENESIS_HASH);
  assert.equal(r.headHash, inc.timeline[3].currentHash);
});

test('editing any sealed field (even phase) is detected at that index', () => {
  for (const mutate of [
    (e) => { e.action = 'forged'; },
    (e) => { e.phase = 'POST_INCIDENT'; },
    (e) => { e.details = { i: 99 }; },
    (e) => { e.timestamp = new Date(0); },
    (e) => { e.actor = 'mallory'; },
  ]) {
    const inc = buildIncident();
    mutate(inc.timeline[1]);
    const r = verifyChain(inc.timeline);
    assert.equal(r.valid, false);
    assert.equal(r.firstBrokenIndex, 1);
    assert.deepEqual(r.events.map((e) => e.status), ['ok', 'tampered', 'untrusted', 'untrusted']);
  }
});

test('deleting an event is detected', () => {
  const inc = buildIncident();
  inc.timeline.splice(2, 1);
  const r = verifyChain(inc.timeline);
  assert.equal(r.valid, false);
  assert.equal(r.firstBrokenIndex, 2);
});

test('an attacker without the secret cannot re-seal an edited event', () => {
  const inc = buildIncident();
  const ev = inc.timeline[1];
  ev.action = 'forged';
  // Attacker recomputes a plain SHA-256 (no key) and patches the link:
  ev.currentHash = crypto.createHash('sha256').update(JSON.stringify(ev)).digest('hex');
  inc.timeline[2].previousHash = ev.currentHash;
  assert.equal(verifyChain(inc.timeline).valid, false);
});
