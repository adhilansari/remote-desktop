import { ipcRenderer } from 'electron';
import os from 'os';
import QRCode from 'qrcode';

ipcRenderer.send('log', 'Renderer script loaded!');

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    // Skip virtual, docker, and WSL adapters which confuse mobile devices
    const lowerName = name.toLowerCase();
    if (lowerName.includes('virtual') || lowerName.includes('vbox') || lowerName.includes('vmware') || lowerName.includes('vethernet') || lowerName.includes('wsl')) {
      continue;
    }
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

async function initUI() {
  const ip = getLocalIp();
  let url = 'https://app.keenfresh.com';
  
  try {
    const code = await ipcRenderer.invoke('get-pairing-code');
    const pairingEl = document.getElementById('pairing-code');
    if (pairingEl) pairingEl.innerText = code;
    url = `https://app.keenfresh.com/?pin=${code}`;
    const urlText = document.getElementById('url-text');
    if (urlText) urlText.innerText = url;
  } catch (e) {
    console.error('Failed to fetch pairing code', e);
  }

  const canvas = document.getElementById('qr-canvas');
  if (canvas) {
    QRCode.toCanvas(canvas, url, {
      width: 150,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }, (error) => {
      if (error) console.error(error);
      ipcRenderer.send('log', 'QR Code generated for ' + url);
    });
  }
}

// Initialize UI immediately
initUI();

let localStream: MediaStream | null = null;
let peerConnection: RTCPeerConnection | null = null;
let dataChannel: RTCDataChannel | null = null;

let currentSourceId: string | null = null;
let currentQuality: '1080p60' | '720p30' | '480p15' = '1080p60';

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ]
};

async function requestMedia(isSwap: boolean = false) {
  try {
    let width = 1920; let height = 1080;
    if (currentQuality === '720p30') { width = 1280; height = 720; }
    else if (currentQuality === '480p15') { width = 854; height = 480; }

    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'desktop'
        }
      } as any,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: currentSourceId,
          minWidth: width,
          maxWidth: width,
          minHeight: height,
          maxHeight: height,
          minFrameRate: currentQuality === '1080p60' ? 60 : currentQuality === '720p30' ? 30 : 15,
          maxFrameRate: currentQuality === '1080p60' ? 60 : currentQuality === '720p30' ? 30 : 15
        }
      } as any
    });

    if (isSwap && localStream && peerConnection) {
      // Stop old tracks
      localStream.getTracks().forEach(t => t.stop());
      
      localStream = newStream;
      const videoEl = document.getElementById('localVideo') as HTMLVideoElement;
      if (videoEl) videoEl.srcObject = localStream;
      
      const newVideoTrack = localStream.getVideoTracks()[0];
      const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(newVideoTrack).then(() => {
          ipcRenderer.send('log', 'Successfully hot-swapped track!');
        }).catch(err => {
          ipcRenderer.send('log', 'Failed to replace track: ' + err);
        });
      }
    } else {
      localStream = newStream;
      const videoEl = document.getElementById('localVideo') as HTMLVideoElement;
      if (videoEl) {
        videoEl.srcObject = localStream;
        videoEl.play();
      }
      initiateWebRTC();
    }
  } catch(e: any) {
    ipcRenderer.send('log', 'Error requesting media: ' + e.message);
  }
}

async function startScreenShare() {
  ipcRenderer.send('log', 'startScreenShare called');
  try {
    const sources = await ipcRenderer.invoke('get-desktop-sources');
    if (sources.length === 0) {
      ipcRenderer.send('log', 'ERROR: No desktop sources found');
      return;
    }
    currentSourceId = sources[0].id;
    await requestMedia(false);
  } catch (e: any) {
    console.error('Error starting screen share', e);
    ipcRenderer.send('log', 'Error starting screen share: ' + e.message);
  }
}

async function initiateWebRTC() {
  if (peerConnection) {
    peerConnection.close();
  }

  peerConnection = new RTCPeerConnection(rtcConfig);

  // Setup DataChannel for inputs
  dataChannel = peerConnection.createDataChannel('input', { ordered: true });
  dataChannel.onopen = async () => {
    ipcRenderer.send('log', 'DataChannel OPEN');
    try {
      const sources = await ipcRenderer.invoke('get-desktop-sources');
      if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({ type: 'desktop-sources', data: sources }));
      }
    } catch (e) {}
  };
  
  dataChannel.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === 'switch-display') {
        currentSourceId = payload.data.sourceId;
        ipcRenderer.send('log', 'Switching display to: ' + currentSourceId);
        requestMedia(true);
      } else if (payload.type === 'change-quality') {
        currentQuality = payload.data.quality;
        ipcRenderer.send('log', 'Changing quality to: ' + currentQuality);
        requestMedia(true);
      } else {
        ipcRenderer.send('webrtc-input', payload);
      }
    } catch (e) {
      console.error('Failed to parse datachannel message', e);
    }
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      ipcRenderer.send('webrtc-signal', { type: 'candidate', candidate: event.candidate });
    }
  };

  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection!.addTrack(track, localStream!);
    });
  }

  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    ipcRenderer.send('webrtc-signal', { type: 'offer', offer });
  } catch (e: any) {
    ipcRenderer.send('log', 'Error creating offer: ' + e.message);
  }
}

ipcRenderer.on('webrtc-signal', async (event, data) => {
  if (!peerConnection) return;
  try {
    if (data.type === 'answer' && data.answer) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.type === 'candidate' && data.candidate) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } else if (data.type === 'offer') {
      // If mobile somehow sends an offer, we can answer, but usually Desktop offers.
    }
  } catch (e: any) {
    ipcRenderer.send('log', 'Error handling webrtc-signal: ' + e.message);
  }
});

ipcRenderer.on('initiate-stream', () => {
  ipcRenderer.send('log', 'Received initiate-stream');
  if (!localStream) {
    startScreenShare();
  } else {
    initiateWebRTC();
  }
});

ipcRenderer.on('clipboard-sync', (event, text) => {
  if (dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(JSON.stringify({ type: 'clipboard-sync', data: { text } }));
  }
});

ipcRenderer.on('cursor-sync', (event, data) => {
  if (dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(JSON.stringify({ type: 'cursor-sync', data }));
  }
});

ipcRenderer.on('webrtc-send', (event, msg) => {
  if (dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(JSON.stringify(msg));
  }
});

let connectedClients = 0;

function updateStatusUI() {
  const statusEl = document.querySelector('.status-text') as HTMLElement;
  const pulseEl = document.querySelector('.pulse') as HTMLElement;
  const connectedPanel = document.getElementById('connected-devices-panel');
  const connectionStatusContainer = document.getElementById('connection-status-container');
  
  if (statusEl && pulseEl) {
    if (connectedClients > 0) {
      statusEl.textContent = `${connectedClients} Device(s) Connected`;
      statusEl.style.color = '#38bdf8'; // Blue
      pulseEl.style.backgroundColor = '#38bdf8';
      
      if (connectedPanel) connectedPanel.style.display = 'block';
      if (connectionStatusContainer) connectionStatusContainer.style.display = 'none';
    } else {
      statusEl.textContent = `Relay Active & Listening`;
      statusEl.style.color = '#34d399'; // Green
      pulseEl.style.backgroundColor = '#10b981';
      
      if (connectedPanel) connectedPanel.style.display = 'none';
      if (connectionStatusContainer) connectionStatusContainer.style.display = 'flex';
    }
  }
}

ipcRenderer.on('set-clients', (event, count) => {
  connectedClients = count;
  updateStatusUI();
});

ipcRenderer.on('client-joined', (event, data) => {
  connectedClients++;
  updateStatusUI();
  
  if (data && data.deviceName) {
    const nameEl = document.getElementById('connected-device-name');
    if (nameEl) nameEl.textContent = data.deviceName + ' Connected';
  } else {
    const nameEl = document.getElementById('connected-device-name');
    if (nameEl) nameEl.textContent = 'Mobile Session Active';
  }
});

ipcRenderer.on('client-left', (event, data) => {
  if (data && data.totalClients !== undefined) {
    connectedClients = data.totalClients;
  } else {
    connectedClients = 0; // Fallback reset
  }
  updateStatusUI();
});

let currentAppPin = '';
ipcRenderer.invoke('get-pairing-code').then(code => currentAppPin = code);

ipcRenderer.on('toggle-app-lock', (event, locked) => {
  const lockScreen = document.getElementById('simulated-lock-screen');
  const errorMsg = document.getElementById('lock-error-msg');
  const pinInput = document.getElementById('lock-pin-input') as HTMLInputElement;
  
  if (lockScreen) {
    lockScreen.style.display = locked ? 'flex' : 'none';
    if (locked && pinInput) {
      pinInput.value = '';
      if (errorMsg) errorMsg.style.display = 'none';
      pinInput.focus();
    }
  }
});

document.getElementById('unlock-btn')?.addEventListener('click', () => {
  const pinInput = document.getElementById('lock-pin-input') as HTMLInputElement;
  const errorMsg = document.getElementById('lock-error-msg');
  
  if (pinInput.value === currentAppPin) {
    if (errorMsg) errorMsg.style.display = 'none';
    ipcRenderer.send('unlock-app-request');
  } else {
    if (errorMsg) errorMsg.style.display = 'block';
  }
});

// Custom UI Approval Logic
ipcRenderer.on('incoming-connection', (event, data) => {
  const overlay = document.getElementById('connection-approval-overlay');
  const nameEl = document.getElementById('request-device-name');
  if (overlay && nameEl) {
    nameEl.textContent = data.deviceName || 'Unknown Device';
    overlay.style.display = 'flex';
  }
});

document.getElementById('accept-btn')?.addEventListener('click', () => {
  const overlay = document.getElementById('connection-approval-overlay');
  if (overlay) overlay.style.display = 'none';
  ipcRenderer.send('connection-response', { accepted: true });
});

document.getElementById('reject-btn')?.addEventListener('click', () => {
  const overlay = document.getElementById('connection-approval-overlay');
  if (overlay) overlay.style.display = 'none';
  ipcRenderer.send('connection-response', { accepted: false });
});
