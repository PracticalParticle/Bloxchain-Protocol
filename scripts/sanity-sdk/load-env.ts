/**
 * Load .env from project root before any other sanity-sdk code runs.
 * Matches scripts/sanity behavior where each base-test.cjs does
 * require('dotenv').config({ path: path.join(__dirname, '../../../.env') })
 * at the top so connection (RPC_URL / REMOTE_*) comes only from .env.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load from cwd (project root when run via npm scripts). Allow override via SANITY_ENV_FILE.
const envFile = process.env.SANITY_ENV_FILE?.trim() || '.env';
const envPath = path.join(process.cwd(), envFile);
dotenv.config({ path: envPath, override: true, quiet: true });
