// Env config validates required secrets and exits the process if any are missing.
// Must be the first import so other modules see a validated environment.
import { env } from './config/env';

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { routes } from './routes';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma';
import { initSocket } from './lib/socket';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import './middlewares/limiters';

const app = express();
app.set('trust proxy', 1);

const server = createServer(app);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait and try again.' },
});

const ALLOWED_ORIGINS = [
  ...env.ALLOWED_ORIGINS,
  ...(env.WEB_URL ? [env.WEB_URL] : []),
];

const io = initSocket(server, ALLOWED_ORIGINS);

// Default CORP "same-origin" blocks the web (:5174) from loading images served
// by the API (:3399). Allow cross-origin embedding for static resources.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(globalLimiter);
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));
// 8MB body limit covers the largest cover image (5MB raw → ~6.7MB base64)
// stored inline as a data URL on the Exhibition row. Without this, saving an
// exhibition with a cover hit the default 100KB cap and threw PayloadTooLargeError.
app.use(express.json({ limit: '8mb' }));
app.use(routes);

app.get('/', (_req, res) => {
  return res.json({ message: 'Pulso Cultural API is running!' });
});

io.on('connection', (socket) => {
  console.log(`[socket] connection: ${socket.id}`);
});

/**
 * Idempotent bootstrap: ensure the museum row + admin user exist.
 * Only writes when missing — never updates an existing admin's password
 * (a rolling deploy used to silently revert manual password changes).
 *
 * If admin doesn't exist yet, ADMIN_PASSWORD env is required to create it.
 * On subsequent boots, ADMIN_PASSWORD is ignored.
 */
async function ensureAdmin() {
  const museum = await prisma.museum.upsert({
    where: { slug: env.PILOT_MUSEUM_SLUG },
    update: {},
    create: {
      name: 'Museu de Arte Moderna da Bahia',
      slug: env.PILOT_MUSEUM_SLUG,
      address: 'Av. Lafayete Coutinho, s/n - Comércio',
      city: 'Salvador',
      state: 'BA',
      openingHours: { tue_sun: '10:00-18:00', mon: 'Closed' },
    },
  });

  const existing = await prisma.user.findUnique({ where: { email: env.ADMIN_EMAIL } });
  if (existing) {
    console.log(`[bootstrap] Admin already exists (${existing.email}). Password untouched.`);
    return;
  }

  if (!env.ADMIN_PASSWORD) {
    throw new Error(
      `[bootstrap] No admin user found AND ADMIN_PASSWORD env is not set.\n` +
      `Set ADMIN_PASSWORD once for the first deploy to create the admin user.\n` +
      `After that, change the password via the API and remove the env var.`
    );
  }

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  const admin = await prisma.user.create({
    data: {
      email: env.ADMIN_EMAIL,
      passwordHash,
      name: 'Administrador MAM',
      role: 'GESTOR',
      museumId: museum.id,
    },
  });
  console.log(`[bootstrap] Admin created: ${admin.email}`);
}

server.listen(env.PORT, async () => {
  console.log(`[http] listening on :${env.PORT}`);
  try {
    await ensureAdmin();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
