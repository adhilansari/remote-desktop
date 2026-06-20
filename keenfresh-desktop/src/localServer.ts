import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { ClientToServerEvents, ServerToClientEvents, RoomPayload, RoomJoinSchema } from 'flaro-shared';
import {
  MouseMoveSchema,
  MouseClickSchema,
  MouseScrollSchema,
  KeyEventSchema,
  SettingsSyncSchema,
  WebRTCSignalSchema,
} from 'flaro-shared';

function handleSocketEvents(socket: Socket, room: string) {
  socket.on('mouse-move', (data) => {
    try {
      const validated = MouseMoveSchema.parse(data);
      socket.to(room).emit('mouse-move', validated);
    } catch (e) { }
  });
  socket.on('mouse-click', (data) => {
    try {
      const validated = MouseClickSchema.parse(data);
      socket.to(room).emit('mouse-click', validated);
    } catch (e) { }
  });
  socket.on('mouse-scroll', (data) => {
    try {
      const validated = MouseScrollSchema.parse(data);
      socket.to(room).emit('mouse-scroll', validated);
    } catch (e) { }
  });
  socket.on('key-event', (data) => {
    try {
      const validated = KeyEventSchema.parse(data);
      socket.to(room).emit('key-event', validated);
    } catch (e) { }
  });
  socket.on('frame-stream', (data) => {
    socket.to(room).emit('frame-stream', data);
  });
  socket.on('settings-sync', (data) => {
    try {
      const validated = SettingsSyncSchema.parse(data);
      socket.to(room).emit('settings-sync', validated);
    } catch (e) { }
  });
  socket.on('webrtc-signal', (data) => {
    socket.to(room).emit('webrtc-signal', data);
  });
  socket.on('remote-input', (data) => {
    socket.to(room).emit('remote-input', data);
  });
  socket.on('ping', () => {
    socket.emit('pong');
  });
}

export function startLocalServer() {
  const app = express();
  app.use(cors());

  // Serve the compiled mobile web application directly from the Desktop App!
  // This totally bypasses Windows Firewall because Electron is already whitelisted by the user!
  const webDistPath = path.join(__dirname, '../../flaro-web/dist');
  app.use(express.static(webDistPath));

  const server = http.createServer(app);

  const io = new Server<ClientToServerEvents, ServerToClientEvents, any, any>(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket: Socket) => {
    socket.on('join-room', (data: RoomPayload) => {
      try {
        const validatedData = RoomJoinSchema.parse(data);
        const room = validatedData.pin || 'default-room';
        const role = validatedData.clientType;

        socket.join(room);
        (socket as any).room = room;
        (socket as any).role = role;

        const clientsInRoom = io.sockets.adapter.rooms.get(room);
        const clientIds = clientsInRoom ? Array.from(clientsInRoom) : [];

        socket.emit('room-joined', { room, role, otherClientIds: clientIds.filter(id => id !== socket.id) });
        socket.to(room).emit('client-joined', { clientId: socket.id, clientType: role });

        handleSocketEvents(socket, room);
      } catch (e) {}
    });

    socket.on('disconnect', () => {
      const room = (socket as any).room;
      if (room) {
        const clientsInRoom = io.sockets.adapter.rooms.get(room);
        const count = clientsInRoom ? clientsInRoom.size : 0;
        socket.to(room).emit('client-left', { clientId: socket.id, totalClients: Math.max(0, count - 1) });
      }
    });
  });

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  server.listen(PORT, '0.0.0.0', async () => {
    console.log(`Local Relay Server started internally by Flaro Desktop on port ${PORT}`);
    
    // Bypass all Windows Firewall issues by generating a public URL tunnel!
    try {
      const localtunnel = require('localtunnel');
      const tunnel = await localtunnel({ port: PORT });
      console.log(`🌍 PUBLIC TUNNEL ACTIVE: ${tunnel.url}`);
      (global as any).tunnelUrl = tunnel.url;

      tunnel.on('close', () => {
        console.log('Public tunnel closed.');
      });
    } catch (err) {
      console.error('Failed to start public tunnel:', err);
    }
  });
}
