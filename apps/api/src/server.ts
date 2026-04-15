import 'dotenv/config'; // Must be first — loads .env before any other module reads process.env
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { routes } from './routes';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma';

import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

const app = express();
// Trust proxy is required for express-rate-limit on cloud platforms like Railway
app.set('trust proxy', 1);

const server = createServer(app);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
});

const io = new Server(server, {
  cors: {
    origin: process.env.WEB_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(helmet());
app.use(limiter);
app.use(cors({
  origin: '*' // Allow all origins for the MVP deployment to prevent CORS failures
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
  try {
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

    const email = 'admin@mam.ba.gov.br';
    const passwordHash = await bcrypt.hash('PUL_$0=CL', 12);
    
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash },
      create: {
        email,
        passwordHash,
        name: 'Administrador MAM',
        role: 'GESTOR',
        museumId: museum.id
      }
    });
    console.log('✅ Default admin ensured and password reset to PUL_$0=CL');
  } catch (err) {
    console.error('❌ Failed to ensure default admin:', err);
  }
}

server.listen(PORT, async () => {
  console.log(`HTTP and WebSocket server running on port ${PORT}`);
  await ensureAdmin();
});

export { io };
