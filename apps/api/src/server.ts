import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { routes } from './routes';

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

server.listen(PORT, () => {
  console.log(`HTTP and WebSocket server running on port ${PORT}`);
});

export { io };
