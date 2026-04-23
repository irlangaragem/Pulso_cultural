import { rateLimit } from 'express-rate-limit';

// ── Visitor identity/registration — strict (prevents enumeration & abuse) ─
export const visitorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120, // ~8 visitors/min per IP — realistic for a museum tablet
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please wait.' },
});

// ── Checkin batch sync — generous (kiosk syncing queue) ──────────────────
export const checkinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Auth — tight (brute-force prevention) ─────────────────────────────────
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
});
