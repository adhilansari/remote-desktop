import { z } from 'zod';

// Shared Enums / Types
export type StreamQuality = '480p' | '720p' | '1080p';
export type JoystickSize = 'small' | 'medium' | 'large';
export type Theme = 'dark' | 'light';

export interface AppSettings {
  mouseSpeed: number;
  scrollSpeed: number;
  streamQuality: StreamQuality;
  frameRate: number;
  joystickSize: JoystickSize;
  clickVibration: boolean;
  connectionPin: string;
  theme: Theme;
  autoConnect: boolean;
}

export interface MouseMovePayload {
  dx: number;
  dy: number;
  speed: number;
}

export interface AbsoluteMovePayload {
  x: number;
  y: number;
}

export interface MouseClickPayload {
  button: 'left' | 'right';
  action: 'down' | 'up';
}

export interface DoubleClickPayload {
  button: 'left' | 'right';
}

export interface ClipboardPayload {
  text: string;
}

export interface MouseScrollPayload {
  direction: 'up' | 'down';
  amount: number;
}

export interface KeyEventPayload {
  key: string;
  modifiers: string[];
  action: 'down' | 'up';
}

export interface DesktopSource {
  id: string;
  name: string;
}

export interface SwitchDisplayPayload {
  sourceId: string;
}

export type QualityPreset = '1080p60' | '720p30' | '480p15';

export interface ChangeQualityPayload {
  quality: QualityPreset;
}

export interface SettingsSyncPayload {
  key: string;
  value: any;
}

export interface RoomPayload {
  pin?: string;
  clientType: 'desktop' | 'mobile';
  hostname?: string;
}

export interface SignalPayload {
  target: string;
  signal: any;
}

export interface ServerToClientEvents {
  'room-joined': (data: { room: string, role: string, otherClientIds: string[] }) => void;
  'room-error': (data: { message: string }) => void;
  'client-joined': (data: { clientId: string, clientType: string, hostname?: string }) => void;
  'client-left': (data: { clientId: string }) => void;
  
  // WebRTC Signaling
  'webrtc-signal': (data: SignalPayload) => void;

  // Forwarded events
  'desktop-sources': (data: DesktopSource[]) => void;
  'mouse-move': (data: MouseMovePayload) => void;
  'mouse-absolute': (data: AbsoluteMovePayload) => void;
  'mouse-click': (data: MouseClickPayload) => void;
  'mouse-double-click': (data: DoubleClickPayload) => void;
  'mouse-scroll': (data: MouseScrollPayload) => void;
  'key-event': (data: KeyEventPayload) => void;
  'clipboard-sync': (data: ClipboardPayload) => void;
  'stream-offer': (data: any) => void;
  'stream-answer': (data: any) => void;
  'ice-candidate': (data: any) => void;
  'frame-stream': (data: string) => void;
  'settings-sync': (data: SettingsSyncPayload) => void;
  'ping': () => void;
  'pong': () => void;
}

export interface ClientToServerEvents {
  'join-room': (data: RoomPayload) => void;
  
  // WebRTC Signaling
  'webrtc-signal': (data: SignalPayload) => void;

  'mouse-move': (data: MouseMovePayload) => void;
  'mouse-absolute': (data: AbsoluteMovePayload) => void;
  'mouse-click': (data: MouseClickPayload) => void;
  'mouse-double-click': (data: DoubleClickPayload) => void;
  'mouse-scroll': (data: MouseScrollPayload) => void;
  'key-event': (data: KeyEventPayload) => void;
  'clipboard-sync': (data: ClipboardPayload) => void;
  'clipboard-sync-request': () => void;
  'switch-display': (data: SwitchDisplayPayload) => void;
  'change-quality': (data: ChangeQualityPayload) => void;
  
  // WebRTC
  'stream-offer': (data: any) => void;
  'stream-answer': (data: any) => void;
  'ice-candidate': (data: any) => void;
  
  'settings-sync': (data: SettingsSyncPayload) => void;
  'ping': () => void;
  'frame-stream': (data: string) => void;
}
