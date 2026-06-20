import { Socket } from 'socket.io';
import {
  MouseMoveSchema,
  MouseClickSchema,
  MouseScrollSchema,
  KeyEventSchema,
  SettingsSyncSchema,
  WebRTCSignalSchema,
} from 'keenfresh-shared';

export function handleSocketEvents(socket: Socket, room: string) {

  socket.on('mouse-move', (data) => {
    try {
      const validated = MouseMoveSchema.parse(data);
      socket.to(room).emit('mouse-move', validated);
    } catch (e) {
      console.warn('Invalid mouse-move data', e);
    }
  });

  socket.on('mouse-click', (data) => {
    try {
      const validated = MouseClickSchema.parse(data);
      socket.to(room).emit('mouse-click', validated);
    } catch (e) {
      console.warn('Invalid mouse-click data', e);
    }
  });

  socket.on('mouse-scroll', (data) => {
    try {
      const validated = MouseScrollSchema.parse(data);
      socket.to(room).emit('mouse-scroll', validated);
    } catch (e) {
      console.warn('Invalid mouse-scroll data', e);
    }
  });

  socket.on('key-event', (data) => {
    try {
      const validated = KeyEventSchema.parse(data);
      socket.to(room).emit('key-event', validated);
    } catch (e) {
      console.warn('Invalid key-event data', e);
    }
  });

  // MJPEG Frame Streaming
  socket.on('frame-stream', (data) => {
    // data is a string (base64 jpeg data URL)
    socket.to(room).emit('frame-stream', data);
  });

  socket.on('settings-sync', (data) => {
    try {
      const validated = SettingsSyncSchema.parse(data);
      socket.to(room).emit('settings-sync', validated);
    } catch (e) {
      console.warn('Invalid settings-sync data', e);
    }
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
