// Creates watchman_1/.env from .env.example (if it doesn't exist yet) with a fresh random CHAIN_SECRET.
// Usage (from watchman_1/server):  npm run setup
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const example = new URL('../../.env.example', import.meta.url);
const target = new URL('../../.env', import.meta.url);

if (existsSync(target)) {
  console.log('watchman_1/.env already exists. Leaving it untouched.');
} else {
  const text = readFileSync(example, 'utf8').replace(/^CHAIN_SECRET=.*$/m, `CHAIN_SECRET=${randomBytes(32).toString('hex')}`);
  writeFileSync(target, text);
  console.log('Created watchman_1/.env with a new random CHAIN_SECRET.');
}
