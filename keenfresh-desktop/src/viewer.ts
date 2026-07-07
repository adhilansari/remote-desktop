import { io, Socket } from 'socket.io-client';
import os from 'os';
import { ClientToServerEvents, ServerToClientEvents } from 'keenfresh-shared';

const urlParams = new URLSearchParams(window.location.search);
const pin = urlParams.get('pin');
const hostPin = urlParams.get('hostPin');

const statusText = document.getElementById('status-text');
const overlay = document.getElementById('overlay');
const video = document.getElementById('remote-video') as HTMLVideoElement;

if (!pin) {
  if (statusText) statusText.innerText = "Error: No pairing code provided.";
} else {
  const RELAY_SERVER_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'wss://relay.keenfresh.com';
  
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(RELAY_SERVER_URL, {
    transports: ['websocket']
  });

  let pc: RTCPeerConnection | null = null;
  let dc: RTCDataChannel | null = null;

  socket.on('connect', () => {
    if (statusText) statusText.innerText = 'Connected to relay, joining room...';
    
    socket.emit('join-room', { 
      pin, 
      clientType: 'mobile', // Impersonate mobile so host sends connection-request
      deviceName: os.hostname() + ' (Desktop)',
      hostPin: hostPin || undefined
    });
  });

  socket.on('connection-pending', (data) => {
    if (statusText) statusText.innerText = data.message;
  });

  socket.on('connection-rejected', (data) => {
    if (statusText) statusText.innerText = "Connection Rejected: " + data.reason;
  });

  socket.on('connection-accepted', () => {
    if (statusText) statusText.innerText = "Connection accepted, starting stream...";
    socket.emit('finalize-join');
  });

  socket.on('webrtc-signal', async (data: any) => {
    if (!pc) {
      pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
          { urls: 'stun:stun.cloudflare.com:3478' }
        ]
      });

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('webrtc-signal', { type: 'candidate', candidate: e.candidate });
        }
      };

      pc.ontrack = (e) => {
        video.srcObject = e.streams[0];
        if (overlay) overlay.style.display = 'none';
      };

      pc.ondatachannel = (e) => {
        dc = e.channel;
      };
    }

    if (data.type === 'offer') {
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-signal', { type: 'answer', answer });
    } else if (data.type === 'candidate' && data.candidate) {
      if (data.candidate.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(e => console.error('ICE', e));
      }
    }
  });

  const sendInput = (type: string, data: any) => {
    if (dc && dc.readyState === 'open') {
      dc.send(JSON.stringify({ type, data }));
    }
  };

  // Map mouse/keyboard events
  video.addEventListener('mousemove', (e) => {
    const rect = video.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;
    sendInput('mouse-absolute', { x: xPct, y: yPct });
  });

  video.addEventListener('mousedown', (e) => {
    sendInput('mouse-down', { button: e.button === 2 ? 'right' : 'left' });
  });

  video.addEventListener('mouseup', (e) => {
    sendInput('mouse-up', { button: e.button === 2 ? 'right' : 'left' });
  });

  video.addEventListener('contextmenu', e => e.preventDefault());

  video.addEventListener('wheel', (e) => {
    sendInput('mouse-scroll', { direction: e.deltaY > 0 ? 'down' : 'up', amount: Math.abs(e.deltaY) / 10 });
  });

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    sendInput('key-event', { action: 'down', key });
    if (e.ctrlKey || e.metaKey || e.altKey) e.preventDefault();
  });

  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    sendInput('key-event', { action: 'up', key });
  });
}
