// Loads watchman_1/.env no matter which folder the server is started from.
// Imported first in server.js so every other module sees the variables.
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../../.env'), quiet: true });
