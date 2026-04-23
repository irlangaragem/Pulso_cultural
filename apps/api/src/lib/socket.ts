import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';

// Singleton Socket.IO instance — initialised once by server.ts, then imported
// by controllers without creating a circular dependency on server.ts.
let _io: Server;

export function initSocket(httpServer: HttpServer, allowedOrigins: string[]): Server {
  _io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  return _io;
}

export function getIO(): Server {
  if (!_io) {
    throw new Error('Socket.IO has not been initialised. Call initSocket() first.');
  }
  return _io;
}

// Convenience re-export so controllers can do: import { io } from '../lib/socket'
export { _io as io };
