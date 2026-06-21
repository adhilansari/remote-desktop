import { z } from 'zod';

export const MouseMoveSchema = z.object({
  dx: z.number(),
  dy: z.number(),
  speed: z.number(),
});

export const MouseClickSchema = z.object({
  button: z.enum(['left', 'right']),
  action: z.enum(['down', 'up']),
});

export const MouseScrollSchema = z.object({
  direction: z.enum(['up', 'down']),
  amount: z.number(),
});

export const KeyEventSchema = z.object({
  key: z.string(),
  modifiers: z.array(z.string()),
  action: z.enum(['down', 'up']),
});

export const SettingsSyncSchema = z.object({
  key: z.string(),
  value: z.any(),
});

export const RoomJoinSchema = z.object({
  pin: z.string().optional(),
  clientType: z.enum(['desktop', 'mobile']),
  hostname: z.string().optional(),
});

// Since WebRTC SDPs and ICE candidates are complex objects handled by simple-peer / react-native-webrtc,
// we just enforce that they are objects.
export const WebRTCSignalSchema = z.any();
