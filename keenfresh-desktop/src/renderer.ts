import { ipcRenderer } from 'electron';
import os from 'os';
import QRCode from 'qrcode';

ipcRenderer.send('log', 'Renderer script loaded!');

// Global Tab Switching Logic
(window as any).switchTab = function(tabId: string, event: Event) {
  // Update buttons
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  if (event && event.currentTarget) {
    (event.currentTarget as HTMLElement).classList.add('active');
  }

  // Update content
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  const target = document.getElementById('tab-' + tabId);
  if (target) {
    target.classList.add('active');
  }
};

// Global Error Handler
window.onerror = function(message, source, lineno, colno, error) {
  const errDiv = document.getElementById('error-overlay');
  if (errDiv) {
    errDiv.style.display = 'block';
    errDiv.innerHTML += 'ERROR: ' + message + ' at ' + source + ':' + lineno + '<br>';
  }
  try {
    ipcRenderer.send('log', 'FATAL RENDERER ERROR: ' + message + ' at ' + source + ':' + lineno);
  } catch (e) {}
};

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

    const videoConstraints = {
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
    };

    let newStream: MediaStream;
    try {
      // First try to capture Audio + Video
      newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop'
          }
        } as any,
        video: videoConstraints as any
      });
      ipcRenderer.send('log', 'Successfully captured Audio + Video');
    } catch (e: any) {
      ipcRenderer.send('log', 'Audio + Video capture failed (' + e.message + '), falling back to Video Only...');
      // Fallback: Video Only
      newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: videoConstraints as any
      });
      ipcRenderer.send('log', 'Successfully captured Video Only');
    }

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

// Security: PIN Masking Auto-Hide
let pinHideTimeout: NodeJS.Timeout | null = null;
const pinOverlay = document.getElementById('pin-blur-overlay');

function hidePin() {
  if (pinOverlay) {
    pinOverlay.style.opacity = '1';
    pinOverlay.style.pointerEvents = 'auto';
  }
}

pinOverlay?.addEventListener('click', () => {
  pinOverlay.style.opacity = '0';
  pinOverlay.style.pointerEvents = 'none';
  
  if (pinHideTimeout) clearTimeout(pinHideTimeout);
  pinHideTimeout = setTimeout(() => {
    hidePin();
  }, 60000); // Re-hide after 60 seconds
});

// Host PIN Logic
const hostPinInput = document.getElementById('host-pin-input') as HTMLInputElement;
const savePinBtn = document.getElementById('save-host-pin-btn');
const pinStatus = document.getElementById('host-pin-status');

// Load existing
const savedPin = localStorage.getItem('host-pin');
if (savedPin && hostPinInput) {
  hostPinInput.value = savedPin;
  ipcRenderer.send('set-host-pin', savedPin);
}

savePinBtn?.addEventListener('click', () => {
  if (hostPinInput) {
    const pin = hostPinInput.value.trim();
    if (pin.length === 6) {
      localStorage.setItem('host-pin', pin);
      ipcRenderer.send('set-host-pin', pin);
      if (pinStatus) {
        pinStatus.style.display = 'block';
        setTimeout(() => pinStatus.style.display = 'none', 3000);
      }
    } else {
      alert("PIN must be exactly 6 digits.");
    }
  }
});

// Desktop-to-Desktop Viewer Logic
const connectRemoteBtn = document.getElementById('connect-remote-btn');
const remotePinInput = document.getElementById('remote-pin-input') as HTMLInputElement;
const remoteHostPinInput = document.getElementById('remote-host-pin-input') as HTMLInputElement;

connectRemoteBtn?.addEventListener('click', () => {
  if (remotePinInput) {
    const pin = remotePinInput.value.trim().toUpperCase();
    if (pin.length === 9) {
      const hostPin = remoteHostPinInput ? remoteHostPinInput.value.trim() : '';
      ipcRenderer.send('open-remote-viewer', { pin, hostPin });
    } else {
      alert('Please enter a valid 9-digit pairing code (e.g. ABCD-1234).');
    }
  }
});

// Trusted Devices Logic
const trustedDevicesList = document.getElementById('trusted-devices-list');

function renderTrustedDevices(devices: { deviceId: string, deviceName: string, dateAdded: number }[]) {
  if (!trustedDevicesList) return;
  trustedDevicesList.innerHTML = '';
  
  if (devices.length === 0) {
    trustedDevicesList.innerHTML = '<div style="color: #64748b; font-size: 13px; font-style: italic;">No trusted devices yet.</div>';
    return;
  }
  
  devices.forEach(device => {
    const el = document.createElement('div');
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'space-between';
    el.style.background = 'rgba(0,0,0,0.3)';
    el.style.padding = '12px 15px';
    el.style.borderRadius = '12px';
    
    const date = new Date(device.dateAdded).toLocaleDateString();
    
    el.innerHTML = `
      <div>
        <div style="color: white; font-weight: 600; font-size: 14px;">${device.deviceName}</div>
        <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Added on ${date}</div>
      </div>
      <button class="remove-trusted-btn" data-id="${device.deviceId}" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; color: #f87171; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;">Remove</button>
    `;
    trustedDevicesList.appendChild(el);
  });

  document.querySelectorAll('.remove-trusted-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const deviceId = target.getAttribute('data-id');
      if (deviceId) {
        // We prompt for host PIN to confirm removal for security
        const pin = prompt("Enter your 6-digit Host PIN to remove this device:");
        const storedPin = localStorage.getItem('host-pin');
        if (pin === storedPin) {
          ipcRenderer.send('remove-trusted-device', deviceId);
        } else if (pin) {
          alert("Incorrect Host PIN.");
        }
      }
    });
  });
}

ipcRenderer.on('trusted-devices-updated', (event, devices) => {
  renderTrustedDevices(devices);
});

ipcRenderer.invoke('get-trusted-devices').then(devices => {
  renderTrustedDevices(devices);
});

// App Close Security Overlay Logic
const closeSecurityOverlay = document.getElementById('close-security-overlay');
const closePinInput = document.getElementById('close-pin-input') as HTMLInputElement;
const cancelCloseBtn = document.getElementById('cancel-close-btn');
const confirmCloseBtn = document.getElementById('confirm-close-btn');
const closePinErrorMsg = document.getElementById('close-pin-error-msg');

ipcRenderer.on('prompt-close-pin', () => {
  if (closeSecurityOverlay) closeSecurityOverlay.style.display = 'flex';
  if (closePinInput) {
    closePinInput.value = '';
    closePinInput.focus();
  }
  if (closePinErrorMsg) closePinErrorMsg.style.display = 'none';
});

cancelCloseBtn?.addEventListener('click', () => {
  if (closeSecurityOverlay) closeSecurityOverlay.style.display = 'none';
});

confirmCloseBtn?.addEventListener('click', () => {
  if (closePinInput) {
    ipcRenderer.send('confirm-close-pin', closePinInput.value);
  }
});

ipcRenderer.on('close-pin-error', (event, msg) => {
  if (closePinErrorMsg) {
    closePinErrorMsg.innerText = msg;
    closePinErrorMsg.style.display = 'block';
  }
});

// Authentication UI Logic
const authOverlay = document.getElementById('auth-overlay');
const authEmail = document.getElementById('auth-email') as HTMLInputElement;
const authPassword = document.getElementById('auth-password') as HTMLInputElement;
const authConfirmPassword = document.getElementById('auth-confirm-password') as HTMLInputElement;
const authError = document.getElementById('auth-error');
const authSuccess = document.getElementById('auth-success');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnForgot = document.getElementById('btn-forgot');
const btnSkipLogin = document.getElementById('btn-skip-login');
const btnSignOut = document.getElementById('btn-sign-out');

if (btnSkipLogin) {
  btnSkipLogin.addEventListener('click', () => {
    if (authOverlay) authOverlay.style.display = 'none';
    ipcRenderer.send('user-logged-in', ''); // Connect without token
  });
}

if (btnSignOut) {
  btnSignOut.addEventListener('click', () => {
    localStorage.removeItem('keenfresh-jwt');
    window.location.reload(); // Reload the app to reset state and show login screen
  });
}

let relayUrl = '';
ipcRenderer.invoke('get-relay-url').then(url => {
  relayUrl = url;
});

function checkAuth() {
  const token = localStorage.getItem('keenfresh-jwt');
  const email = localStorage.getItem('keenfresh-email');
  
  const offlinePinView = document.getElementById('offline-pin-view');
  const syncedEmailView = document.getElementById('synced-email-view');
  const loggedInEmail = document.getElementById('logged-in-email');
  
  if (token) {
    if (authOverlay) authOverlay.style.display = 'none';
    ipcRenderer.send('user-logged-in', token);
    
    if (offlinePinView) offlinePinView.style.display = 'none';
    if (syncedEmailView) syncedEmailView.style.display = 'block';
    if (loggedInEmail) loggedInEmail.innerText = email || 'Authenticated User';
  } else {
    if (offlinePinView) offlinePinView.style.display = 'block';
    if (syncedEmailView) syncedEmailView.style.display = 'none';
  }
}

checkAuth();

let authMode: 'login' | 'register' | 'forgot' = 'login';

function resetAuthUI() {
  if (!authError || !authSuccess || !authConfirmPassword || !authPassword || !btnLogin || !btnRegister || !btnForgot) return;
  authError.style.display = 'none';
  authSuccess.style.display = 'none';
  
  if (authMode === 'login') {
    authConfirmPassword.style.display = 'none';
    authPassword.style.display = 'block';
    btnLogin.innerText = 'Log In';
    btnLogin.style.display = 'block';
    btnRegister.innerText = 'Create an Account';
    btnRegister.style.display = 'block';
    btnForgot.style.display = 'block';
  } else if (authMode === 'register') {
    authConfirmPassword.style.display = 'block';
    authPassword.style.display = 'block';
    btnLogin.innerText = 'Register';
    btnLogin.style.display = 'block';
    btnRegister.innerText = 'Already have an account? Log in';
    btnRegister.style.display = 'block';
    btnForgot.style.display = 'none';
  } else if (authMode === 'forgot') {
    authConfirmPassword.style.display = 'none';
    authPassword.style.display = 'none';
    btnLogin.innerText = 'Send Reset Link';
    btnLogin.style.display = 'block';
    btnRegister.innerText = 'Back to Login';
    btnRegister.style.display = 'block';
    btnForgot.style.display = 'none';
  }
}

btnRegister?.addEventListener('click', () => {
  if (authMode === 'login') authMode = 'register';
  else if (authMode === 'register') authMode = 'login';
  else if (authMode === 'forgot') authMode = 'login';
  resetAuthUI();
});

btnForgot?.addEventListener('click', () => {
  authMode = 'forgot';
  resetAuthUI();
});

async function handleAuthRequest() {
  if (!authEmail || !authPassword || !authError || !authSuccess || !authConfirmPassword) return;
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();
  const confirmPassword = authConfirmPassword.value.trim();

  authError.style.display = 'none';
  authSuccess.style.display = 'none';

  if (authMode === 'forgot') {
    if (!email) {
      authError.innerText = 'Please enter your email';
      authError.style.display = 'block';
      return;
    }
  } else {
    if (!email || !password) {
      authError.innerText = 'Please enter both email and password';
      authError.style.display = 'block';
      return;
    }
    if (authMode === 'register' && password !== confirmPassword) {
      authError.innerText = 'Passwords do not match';
      authError.style.display = 'block';
      return;
    }
  }

  // Disable button while loading
  if (btnLogin) {
    btnLogin.setAttribute('disabled', 'true');
    btnLogin.innerText = 'Loading...';
  }

  try {
    const fetchedRelayUrl = await ipcRenderer.invoke('get-relay-url');
    const endpoint = authMode === 'register' ? '/auth/register' : authMode === 'forgot' ? '/auth/forgot-password' : '/auth/login';
    const baseUrl = fetchedRelayUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (btnLogin) {
      btnLogin.removeAttribute('disabled');
      resetAuthUI(); // Resets the button text appropriately
    }

    if (res.ok) {
      if (authMode === 'forgot') {
        authSuccess.innerText = data.message;
        authSuccess.style.display = 'block';
      } else if (data.token) {
        localStorage.setItem('keenfresh-jwt', data.token);
        localStorage.setItem('keenfresh-email', data.email || email);
        authError.style.display = 'none';
        checkAuth();
      }
    } else {
      authError.innerText = data.error || 'Authentication failed';
      authError.style.display = 'block';
    }
  } catch (e: any) {
    if (btnLogin) {
      btnLogin.removeAttribute('disabled');
      resetAuthUI();
    }
    authError.innerText = 'Network error connecting to relay';
    authError.style.display = 'block';
  }
}

btnLogin?.addEventListener('click', () => handleAuthRequest());

// Auto-Start System Logic
const autostartToggle = document.getElementById('autostart-toggle') as HTMLInputElement;
if (autostartToggle) {
  ipcRenderer.invoke('get-autostart-status').then((isEnabled: boolean) => {
    autostartToggle.checked = isEnabled;
    autostartToggle.style.background = isEnabled ? '#10b981' : 'rgba(0,0,0,0.5)';
  });

  autostartToggle.addEventListener('change', (e) => {
    const isEnabled = (e.target as HTMLInputElement).checked;
    ipcRenderer.send('set-autostart', isEnabled);
  });
}

// PIN Visibility Toggle
const togglePinVisibility = document.getElementById('toggle-pin-visibility');
if (togglePinVisibility && hostPinInput) {
  togglePinVisibility.addEventListener('click', () => {
    if (hostPinInput.type === 'password') {
      hostPinInput.type = 'text';
      togglePinVisibility.style.opacity = '1';
    } else {
      hostPinInput.type = 'password';
      togglePinVisibility.style.opacity = '0.6';
    }
  });
}
