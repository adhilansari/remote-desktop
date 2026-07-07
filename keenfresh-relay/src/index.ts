import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { ClientToServerEvents, ServerToClientEvents, RoomPayload, RoomJoinSchema } from 'keenfresh-shared';
import { handleSocketEvents } from './handlers/socketHandlers';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

import authRouter, { verifyToken } from './auth';

const app = express();
app.use(cors());
app.use(express.json()); // Parse JSON body

app.use('/auth', authRouter); // Mount auth routes

// Serve the compiled mobile web application directly from the Relay on Port 3000
const webDistPath = path.join(__dirname, '../../keenfresh-web/dist');
app.use(express.static(webDistPath));

const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, any, any>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Setup Redis Adapter for PM2 Cluster Mode scaling
const pubClient = new Redis({
  retryStrategy(times) {
    console.warn(`Retrying Redis connection... attempt ${times}`);
    return Math.min(times * 50, 2000);
  }
});
const subClient = pubClient.duplicate();

pubClient.on('error', (err) => console.error('Redis pubClient Error', err));
subClient.on('error', (err) => console.error('Redis subClient Error', err));

io.adapter(createAdapter(pubClient, subClient));

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Store active desktops by socket ID
export const activeDesktops = new Map<string, { userId: number, email: string, deviceName: string, room: string, isLocked: boolean }>();

app.get('/api/desktops', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Invalid token' });

  const userDesktops: any[] = [];
  activeDesktops.forEach((info, socketId) => {
    if (info.userId === decoded.userId) {
      userDesktops.push({
        deviceId: socketId,
        deviceName: info.deviceName,
        room: info.room,
        isLocked: info.isLocked
      });
    }
  });
  res.json(userDesktops);
});

io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join-room', async (data: RoomPayload) => {
    try {
      // Basic IP Rate Limiting for brute force protection (max 10 attempts per minute)
      const ip = socket.handshake.address;
      const rateLimitKey = `ratelimit:${ip}`;
      const attempts = await pubClient.incr(rateLimitKey);
      if (attempts === 1) {
        await pubClient.expire(rateLimitKey, 60);
      }
      if (attempts > 10) {
        socket.emit('room-error', { message: 'Too many attempts. Please try again later.' });
        return;
      }

      const validatedData = RoomJoinSchema.parse(data);
      const room = validatedData.pin || 'default-room';
      const role = validatedData.clientType;

      // Extract token if provided
      const token = socket.handshake.auth?.token;
      let user = null;
      if (token) {
        user = verifyToken(token);
      }

      if (role === 'desktop') {
        // Desktop joins immediately and creates the room
        socket.join(room);
        console.log(`Desktop ${socket.id} joined room ${room}`);
        (socket as any).room = room;
        (socket as any).role = role;
        
        if (user) {
          activeDesktops.set(socket.id, {
            userId: user.userId,
            email: user.email,
            deviceName: validatedData.hostname || 'My Computer',
            room: room,
            isLocked: false // Initially assumed false, can be updated via events later
          });
          console.log(`Desktop mapped to user ${user.email}`);
        }

        const clientsInRoom = io.sockets.adapter.rooms.get(room);
        const clientIds = clientsInRoom ? Array.from(clientsInRoom) : [];
        
        socket.emit('room-joined', { room, role, otherClientIds: clientIds.filter(id => id !== socket.id) });
        handleSocketEvents(socket, room);
      } else {
        // Mobile device requests consent
        (socket as any).pendingRoom = room;
        (socket as any).pendingRole = role;
        (socket as any).pendingHostname = validatedData.hostname;
        
        const deviceName = validatedData.deviceName || 'Unknown Mobile Device';
        socket.to(room).emit('connection-request', { 
          clientId: socket.id, 
          deviceName,
          hostPin: validatedData.hostPin
        });
        socket.emit('connection-pending', { message: 'Waiting for desktop approval...' });
      }

    } catch (e) {
      console.error('Invalid join-room payload', e);
      socket.emit('room-error', { message: 'Invalid join-room payload' });
    }
  });

  socket.on('connection-accepted', (data: { targetClientId: string }) => {
    io.to(data.targetClientId).emit('connection-accepted', { room: (socket as any).room });
  });

  socket.on('connection-rejected', (data: { targetClientId: string, reason?: string }) => {
    io.to(data.targetClientId).emit('connection-rejected', { reason: data.reason || 'Connection declined by desktop' });
  });

  socket.on('finalize-join', () => {
    const room = (socket as any).pendingRoom;
    const role = (socket as any).pendingRole;
    if (room && role) {
      socket.join(room);
      (socket as any).room = room;
      (socket as any).role = role;

      const clientsInRoom = io.sockets.adapter.rooms.get(room);
      const clientIds = clientsInRoom ? Array.from(clientsInRoom) : [];

      socket.emit('room-joined', { room, role, otherClientIds: clientIds.filter(id => id !== socket.id) });
      socket.to(room).emit('client-joined', { clientId: socket.id, clientType: role, hostname: (socket as any).pendingHostname });
      handleSocketEvents(socket, room);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    const room = (socket as any).room;
    if (room) {
      socket.to(room).emit('client-left', { clientId: socket.id });
    }
    if ((socket as any).role === 'desktop') {
      activeDesktops.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Relay server listening on port ${PORT}`);
});
