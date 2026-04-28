/**
 * Centralized environment-variable loading.
 *
 * Strategy: prefer env, fall back to legacy defaults that production was already
 * running with. Logs a warning when falling back in production so we know what
 * to rotate later. No hard failures here — keep the boot path simple.
 */
import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `[env] Missing required environment variable: ${name}\n` +
      `Set it in your .env, docker-compose, or Railway settings before starting the server.`
    );
  }
  return value;
}

function withFallback(name: string, fallback: string): string {
  const value = process.env[name];
  if (value && value.trim() !== '') return value;
  if ((process.env.NODE_ENV || 'development') === 'production') {
    console.warn(`[env] ${name} not set — using legacy fallback. Rotate post-pilot.`);
  }
  return fallback;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : undefined;
}

const NODE_ENV = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
const isProd = NODE_ENV === 'production';

// Legacy hardcoded salt that production was using prior to SEC-04 hardening.
// Existing CPF/email hashes in the DB were computed with this value sliced to
// the first 16 bytes — see HashService for the matching slice on load.
const LEGACY_SALT = 'pulso-cultural-default-salt-16bytes';
const LEGACY_JWT  = 'change-me-in-production-please-32+chars';

export const env = {
  NODE_ENV,
  isProd,
  PORT: Number(process.env.PORT || 3333),

  // Database — Prisma reads DATABASE_URL on its own; we just validate presence.
  DATABASE_URL: required('DATABASE_URL'),

  // Auth secrets — fall back to legacy values to keep prod booting on existing infra.
  JWT_SECRET: withFallback('JWT_SECRET', LEGACY_JWT),
  CPF_SALT:   withFallback('CPF_SALT',   LEGACY_SALT),
  EMAIL_SALT: withFallback('EMAIL_SALT', LEGACY_SALT),

  // Bootstrap admin: required only when no admin row exists yet.
  // server.ts checks the DB and demands this env only on first boot.
  ADMIN_PASSWORD: optional('ADMIN_PASSWORD'),
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@mam.ba.gov.br',

  // CORS allowed origins (CSV).
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),

  WEB_URL: optional('WEB_URL'),

  // Optional camera ingest secret (kept off by default).
  CAMERA_SECRET: optional('CAMERA_SECRET'),

  // Pilot tenant slug (LOG-10): single source of truth.
  PILOT_MUSEUM_SLUG: process.env.PILOT_MUSEUM_SLUG || 'mam-bahia',

  // QA-only: allows synthetic CPFs in 999.999.999-9X range. Never in prod.
  ALLOW_FAKE_CPF: process.env.ALLOW_FAKE_CPF === '1',
};

if (env.ALLOW_FAKE_CPF && env.isProd) {
  throw new Error('[env] ALLOW_FAKE_CPF=1 is not allowed when NODE_ENV=production.');
}

// Friendly startup banner.
console.log(`[env] OK — NODE_ENV=${env.NODE_ENV}, museum=${env.PILOT_MUSEUM_SLUG}, port=${env.PORT}`);
