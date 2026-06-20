import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import { appStore } from './store';
import {
  MouseMoveSchema,
  MouseClickSchema,
  MouseScrollSchema,
  KeyEventSchema,
  SettingsSyncSchema,
  RoomJoinSchema,
  RoomPayload
} from 'flaro-shared';

let currentPairingCode: string | null = null;
let pairingCodeExpiresAt: number = 0;

export function getPairingCode(): string {
  if (currentPairingCode && Date.now() < pairingCodeExpiresAt) {
    return currentPairingCode;
  }
  currentPairingCode = crypto.randomInt(100000, 999999).toString();
  pairingCodeExpiresAt = Date.now() + 60 * 1000 * 5; // 5 minutes
  return currentPairingCode;
}

export function startSignalingServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Serve the flaro-web dist folder which is bundled into dist/web
  const webAppPath = path.join(__dirname, 'web');
  app.use(express.static(webAppPath));

  app.post('/pair/confirm', (req, res) => {
    const { code, deviceId } = req.body;
    if (!code || !deviceId) {
      return res.status(400).json({ error: 'Missing code or deviceId' });
    }
    if (code !== currentPairingCode || Date.now() > pairingCodeExpiresAt) {
      return res.status(401).json({ error: 'Invalid or expired code' });
    }

    // Code is valid. Issue token and invalidate code
    currentPairingCode = null;
    const token = appStore.addTrustedDevice(deviceId);
    
    return res.json({ token });
  });

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (socket.handshake.auth.clientType === 'desktop') {
      // Desktop agent is trusted internally
      return next();
    }
    
    if (!token || !appStore.isTokenValid(token)) {
      return next(new Error('unauthorized'));
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Since we now authenticate via tokens, the "room" concept is just a secure channel 
    // between the authenticated mobile and the desktop. We'll use a static room name for the session.
    const secureRoom = 'flaro-secure-session';

    socket.on('join-room', (data: any) => {
      try {
        const role = data.clientType || socket.handshake.auth.clientType;
        
        socket.join(secureRoom);
        console.log(`Socket ${socket.id} joined secure session as ${role}`);

        (socket as any).room = secureRoom;
        (socket as any).role = role;

        const clientsInRoom = io.sockets.adapter.rooms.get(secureRoom);
        const clientIds = clientsInRoom ? Array.from(clientsInRoom) : [];

        socket.emit('room-joined', { room: secureRoom, role, otherClientIds: clientIds.filter(id => id !== socket.id) });
        socket.to(secureRoom).emit('client-joined', { clientId: socket.id, clientType: role });

        // Signaling handlers
        socket.on('webrtc-signal', (payload) => {
          socket.to(secureRoom).emit('webrtc-signal', payload);
        });

      } catch (e) {
        console.error('Invalid join-room payload', e);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      const room = (socket as any).room;
      if (room) {
        socket.to(room).emit('client-left', { clientId: socket.id });
      }
    });
  });

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Local Web & Signaling Server listening on http://0.0.0.0:${PORT}`);
  });

  return io;
}
