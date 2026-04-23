import 'dotenv/config'; // Must be first — loads .env before any other module reads process.env
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { routes } from './routes';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma';
import { initSocket } from './lib/socket';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import './middlewares/limiters'; // ensure limiters module is loaded

const app = express();
// Trust proxy is required for express-rate-limit on cloud platforms like Railway
app.set('trust proxy', 1);

const server = createServer(app);

// ── Global limiter (all routes) ──────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // generous global ceiling — per-route limits are tighter below
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait and try again.' },
});

// Limiters are defined in middlewares/limiters.ts to avoid circular imports.

// Shared origin list — HTTP CORS and Socket.IO must be identical
const ALLOWED_ORIGINS = [
  process.env.WEB_URL || 'http://localhost:5173',
  'https://pulsocultural.art',
  'http://localhost:5173',
];

const io = initSocket(server, ALLOWED_ORIGINS);

app.use(helmet());
app.use(globalLimiter);
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));
app.use(express.json());
app.use(routes);


const PORT = process.env.PORT || 3333;

app.get('/', (req, res) => {
  return res.json({ message: 'Pulso Cultural API is running!' });
});

io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);
});

async function ensureAdmin() {
  console.log('[ensureAdmin] Starting...');
  try {
    // Step 1: Museum
    const museum = await prisma.museum.upsert({
      where: { slug: 'mam-bahia' },
      update: {},
      create: {
        name: 'Museu de Arte Moderna da Bahia',
        slug: 'mam-bahia',
        address: 'Av. Lafayete Coutinho, s/n - Comércio',
        city: 'Salvador',
        state: 'BA',
        openingHours: { tue_sun: '10:00-18:00', mon: 'Closed' }
      }
    });
    console.log('[ensureAdmin] Museum OK — id:', museum.id);

    // Step 2: Admin user — always reset password hash on every startup
    const email = 'admin@mam.ba.gov.br';
    const rawPassword = process.env.ADMIN_PASSWORD || 'PUL_$0=CL';
    const passwordHash = await bcrypt.hash(rawPassword, 12);
    console.log('[ensureAdmin] Hash generated — length:', passwordHash.length);

    const admin = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, active: true },
      create: {
        email,
        passwordHash,
        name: 'Administrador MAM',
        role: 'GESTOR',
        museumId: museum.id
      }
    });
    console.log('[ensureAdmin] ✅ Admin ensured — id:', admin.id, '| email:', admin.email);
  } catch (err) {
    console.error('[ensureAdmin] ❌ FAILED:', err);
  }
}

server.listen(PORT, async () => {
  console.log(`HTTP and WebSocket server running on port ${PORT}`);
  await ensureAdmin();
});

// ── Emergency re-seed endpoint (protected by SEED_SECRET env var) ──────────
// POST /admin/reseed  { secret: process.env.SEED_SECRET }
// Use this if ensureAdmin failed silently and you need to reset the admin
// without access to Railway shell.
app.post('/admin/reseed', async (req: any, res: any) => {
  const expectedSecret = process.env.SEED_SECRET;
  if (!expectedSecret || req.body?.secret !== expectedSecret) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await ensureAdmin();
  return res.json({ ok: true, message: 'Admin re-seeded. Check server logs.' });
});

// io is exported from lib/socket.ts — import it from there to avoid circular deps.
