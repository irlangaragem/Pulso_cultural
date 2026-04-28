/**
 * Centralized environment-variable validation.
 * Loaded eagerly at startup (see server.ts). If any required secret is missing
 * or too weak, the process exits with a clear message — fail-fast principle.
 *
 * No fallbacks for credentials: ever. (SEC-01..04)
 */
import 'dotenv/config';

const MIN_SECRET_LENGTH = 32;

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

function requiredSecret(name: string, minLength = MIN_SECRET_LENGTH): string {
  const value = required(name);
  if (value.length < minLength) {
    throw new Error(
      `[env] ${name} is too short (${value.length} chars). Minimum: ${minLength}.\n` +
      `Generate a strong secret with: openssl rand -base64 ${minLength}`
    );
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : undefined;
}

const NODE_ENV = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
const isProd = NODE_ENV === 'production';

export const env = {
  NODE_ENV,
  isProd,
  PORT: Number(process.env.PORT || 3333),

  // Database — Prisma reads DATABASE_URL on its own; we just validate presence.
  DATABASE_URL: required('DATABASE_URL'),

  // Auth secrets — no fallbacks.
  JWT_SECRET: requiredSecret('JWT_SECRET'),
  CPF_SALT: requiredSecret('CPF_SALT', 16),
  EMAIL_SALT: requiredSecret('EMAIL_SALT', 16),

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
