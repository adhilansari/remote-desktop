import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { ClientToServerEvents, ServerToClientEvents, RoomPayload, RoomJoinSchema } from 'keenfresh-shared';
import { handleSocketEvents } from './handlers/socketHandlers';

const app = express();
app.use(cors());

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

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join-room', (data: RoomPayload) => {
    try {
      const validatedData = RoomJoinSchema.parse(data);
      const room = validatedData.pin || 'default-room';
      const role = validatedData.clientType;

      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room} as ${role}`);

      // Optional: keep track of roles on the socket itself for handler access
      (socket as any).room = room;
      (socket as any).role = role;

      const clientsInRoom = io.sockets.adapter.rooms.get(room);
      const clientIds = clientsInRoom ? Array.from(clientsInRoom) : [];

      socket.emit('room-joined', { room, role, otherClientIds: clientIds.filter(id => id !== socket.id) });
      socket.to(room).emit('client-joined', { clientId: socket.id, clientType: role, hostname: validatedData.hostname });

      // Delegate the rest of the events
      handleSocketEvents(socket, room);

    } catch (e) {
      console.error('Invalid join-room payload', e);
      socket.emit('room-error', { message: 'Invalid join-room payload' });
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Relay server listening on port ${PORT}`);
});
