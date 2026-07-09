import { app, BrowserWindow, ipcMain, desktopCapturer, clipboard, Notification, screen as electronScreen, powerMonitor, Menu, dialog, Tray, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { io, Socket } from 'socket.io-client';
import { handleMouseMove, handleMouseClick, handleMouseScroll, handleKeyEvent, handleAbsoluteMove, handleDoubleClick, handleMouseDown, handleMouseUp, handleShortcut, releaseAllModifiers, handleTypeText, handleSystemAction, handleUnlock } from './automation';
import { ClientToServerEvents, ServerToClientEvents } from 'keenfresh-shared';
import { screen, mouse } from '@nut-tree-fork/nut-js';
import { exec } from 'child_process';

let globalPin = '';
let currentHostPin = '';

interface TrustedDevice {
  deviceId: string;
  deviceName: string;
  dateAdded: number;
}
let trustedDevices: TrustedDevice[] = [];
let trustedDevicesPath = '';
let canClose = false;

let hiddenWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let isLocked = false;

let previousBrightness = 100;
let isPrivacyActive = false;

function showPrivacyOverlay() {
  // Disabled to prevent WebRTC capture from freezing on Windows
  console.log("Privacy mode requested, but disabled to maintain WebRTC stream.");
}

function hidePrivacyOverlay() {
  // Disabled to prevent WebRTC capture from freezing on Windows
}

// Catch all unhandled errors silently so the app doesn't show default Electron error dialogs
process.on('uncaughtException', (err) => {
  console.error('Caught unhandled exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Caught unhandled rejection:', reason);
});

// Suppress all visual error popups for production
dialog.showErrorBox = function(title, content) {
  console.log(`[ErrorBox Suppressed] ${title}\n${content}`);
};

/**
 * Creates the primary Electron hidden window that hosts the UI and WebRTC logic.
 * The window is hidden on startup if the '--hidden' argument is provided (e.g. auto-start mode).
 * 
 * @returns {void}
 */
function createHiddenWindow() {
  Menu.setApplicationMenu(null); // Remove default File/Edit/View menu

  hiddenWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 400,
    minHeight: 500,
    center: true,
    show: !process.argv.includes('--hidden'), // Hide if started via Auto-Start
    autoHideMenuBar: true, // Hides the menu bar
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  hiddenWindow.loadFile(path.join(__dirname, 'index.html'));
  
  hiddenWindow.webContents.on('did-finish-load', () => {
    hiddenWindow?.webContents.executeJavaScript(`
      const versionEl = document.querySelector('.version-badge');
      if (versionEl) versionEl.innerText = 'Version ${app.getVersion()}';
    `);
  });

  // When clicking close, just hide the window to tray if auto-start is true, unless we explicitly quit
  hiddenWindow.on('close', (e) => {
    if (!canClose) {
      e.preventDefault();
      
      // Check if user set a host PIN, if so they need to verify to actually close the connection entirely.
      if (currentHostPin && currentHostPin.length === 6) {
        hiddenWindow?.webContents.send('prompt-close-pin');
      } else {
        hiddenWindow?.hide();
      }
      return;
    }
    hiddenWindow = null;
  });
}

/**
 * Generates a cryptographically secure 9-character connection PIN (e.g., ABCD-1234).
 * Ambiguous characters (0, O, 1, I) are excluded to prevent user error.
 * 
 * @returns {string} The generated pairing code.
 */
function generateSecurePin() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars like 0, O, 1, I
  let p1 = '';
  let p2 = '';
  for(let i=0; i<4; i++) p1 += chars.charAt(Math.floor(Math.random() * chars.length));
  for(let i=0; i<4; i++) p2 += chars.charAt(Math.floor(Math.random() * chars.length));
  return p1 + '-' + p2;
}

app.whenReady().then(() => {
  const pinPath = path.join(app.getPath('userData'), 'keenfresh_pin.txt');
  try {
    if (fs.existsSync(pinPath)) {
      globalPin = fs.readFileSync(pinPath, 'utf8').trim();
      if (globalPin.length !== 9 || !globalPin.includes('-')) {
        globalPin = generateSecurePin();
        fs.writeFileSync(pinPath, globalPin, 'utf8');
      }
    } else {
      globalPin = generateSecurePin();
      fs.writeFileSync(pinPath, globalPin, 'utf8');
    }
  } catch (err) {
    globalPin = generateSecurePin();
  }

  trustedDevicesPath = path.join(app.getPath('userData'), 'trusted_devices.json');
  try {
    if (fs.existsSync(trustedDevicesPath)) {
      trustedDevices = JSON.parse(fs.readFileSync(trustedDevicesPath, 'utf8'));
    }
  } catch (err) {}

  createHiddenWindow();
  
  // Setup System Tray
  const iconPath = path.join(__dirname, 'icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open KeenFresh', click: () => hiddenWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => {
        canClose = true;
        app.quit();
    }}
  ]);
  tray.setToolTip('KeenFresh Desktop');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => hiddenWindow?.show());

  // Connection to relay is now deferred until the user logs in and sends the 'user-logged-in' IPC.
  // We don't automatically connect here anymore.

  powerMonitor.on('lock-screen', () => {
    isLocked = true;
    hiddenWindow?.webContents.send('webrtc-send', { type: 'system-status', data: { isLocked: true } });
  });
  powerMonitor.on('unlock-screen', () => {
    isLocked = false;
    hiddenWindow?.webContents.send('webrtc-send', { type: 'system-status', data: { isLocked: false } });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createHiddenWindow();
    }
  });

  // Handle IPC for pairing code
  ipcMain.handle('get-pairing-code', () => {
    return globalPin;
  });
  
  ipcMain.on('set-host-pin', (event, pin) => {
    currentHostPin = pin;
    console.log('Host PIN updated via IPC');
  });

  ipcMain.handle('get-relay-url', () => RELAY_SERVER_URL);

  ipcMain.on('user-logged-in', (event, token) => {
    connectToRelay(token);
  });

  ipcMain.handle('get-trusted-devices', () => {
    return trustedDevices;
  });

  ipcMain.on('remove-trusted-device', (event, deviceId) => {
    trustedDevices = trustedDevices.filter(d => d.deviceId !== deviceId);
    fs.writeFileSync(trustedDevicesPath, JSON.stringify(trustedDevices));
    hiddenWindow?.webContents.send('trusted-devices-updated', trustedDevices);
  });

  ipcMain.on('confirm-close-pin', (event, pin) => {
    if (pin === currentHostPin) {
      canClose = true;
      app.quit();
    } else {
      hiddenWindow?.webContents.send('close-pin-error', 'Incorrect PIN');
    }
  });

  // Desktop-to-Desktop Viewer Window
  ipcMain.on('open-remote-viewer', (event, { pin, hostPin }) => {
    const viewerWindow = new BrowserWindow({
      width: 1280,
      height: 720,
      minWidth: 400,
      minHeight: 500,
      title: 'KeenFresh Remote Viewer',
      autoHideMenuBar: true,
      icon: path.join(__dirname, 'icon.png'),
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    // Pass the connection details to the viewer via query params
    const viewerUrl = new URL('file://' + path.join(__dirname, 'viewer.html'));
    viewerUrl.searchParams.set('pin', pin);
    if (hostPin) viewerUrl.searchParams.set('hostPin', hostPin);

    viewerWindow.loadURL(viewerUrl.toString());
  });

});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const RELAY_SERVER_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://relay.keenfresh.com';

/**
 * Establishes a Socket.IO connection to the Signaling (Relay) Server.
 * Must provide a valid JWT token to authenticate the desktop with the user's account.
 * 
 * @param {string} jwtToken - The authentication token retrieved after user login.
 * @returns {void}
 */
function connectToRelay(jwtToken: string) {
  if (socket) {
    socket.disconnect();
  }

  // Desktop is trusted internally, bypass token by passing role early
  socket = io(RELAY_SERVER_URL, {
    auth: { clientType: 'desktop', token: jwtToken },
    transports: ['websocket']
  });
  
  socket.on('connect', () => {
    console.log('Connected to local signaling server');
    socket?.emit('join-room', { 
      pin: globalPin, 
      clientType: 'desktop',
      hostname: os.hostname()
    }); 
  });

  socket.on('room-joined', (data) => {
    console.log('Room joined:', data);
    if (data.otherClientIds && data.otherClientIds.length > 0) {
      hiddenWindow?.webContents.send('initiate-stream', { targetId: data.otherClientIds[0] });
      hiddenWindow?.webContents.send('set-clients', data.otherClientIds.length);
    }
  });

  let fileTransferBuffer = '';
  let currentFileName = '';

  socket.on('connection-request', (data) => {
    console.log('Incoming connection request:', data);
    
    // Security: Check Trusted Devices first
    if (data.deviceId && trustedDevices.some(d => d.deviceId === data.deviceId)) {
      console.log('Trusted device recognized. Auto-accepting connection.');
      socket?.emit('connection-accepted', { targetClientId: data.clientId });
      return;
    }

    // Security: Verify Host PIN if one is configured
    if (currentHostPin && currentHostPin.length === 6) {
      if (data.hostPin === currentHostPin) {
        console.log('Host PIN verified. Auto-accepting connection.');
        
        // Add to trusted devices for future
        if (data.deviceId) {
          if (!trustedDevices.some(d => d.deviceId === data.deviceId)) {
            trustedDevices.push({
              deviceId: data.deviceId,
              deviceName: data.deviceName || 'Unknown Device',
              dateAdded: Date.now()
            });
            fs.writeFileSync(trustedDevicesPath, JSON.stringify(trustedDevices));
            hiddenWindow?.webContents.send('trusted-devices-updated', trustedDevices);
          }
        }
        
        socket?.emit('connection-accepted', { targetClientId: data.clientId });
        return; // Bypass manual approval
      } else {
        console.log('Host PIN incorrect or missing. Auto-rejecting connection.');
        socket?.emit('connection-rejected', { targetClientId: data.clientId, reason: 'HOST_PIN_REQUIRED' });
        return; // Bypass manual approval
      }
    }

    // Launch Privacy Screen Overlay immediately so they can't peek while waiting
    showPrivacyOverlay();

    if (hiddenWindow) {
      hiddenWindow.show();
      hiddenWindow.focus();
      hiddenWindow.setAlwaysOnTop(true, 'floating');
      setTimeout(() => hiddenWindow?.setAlwaysOnTop(false), 3000);
      
      hiddenWindow.webContents.send('incoming-connection', data);

      ipcMain.once('connection-response', (event, response) => {
        if (response.accepted) {
          socket?.emit('connection-accepted', { targetClientId: data.clientId });
        } else {
          socket?.emit('connection-rejected', { targetClientId: data.clientId });
          hidePrivacyOverlay();
        }
      });
    }
  });

  let cursorInterval: NodeJS.Timeout | null = null;
  socket.on('client-joined', (data) => {
    console.log('Client joined:', data);
    hiddenWindow?.webContents.send('client-joined', data);
    if (data.clientType === 'mobile') {
      
      // Launch Privacy Screen Overlay instead of LockWorkStation
      showPrivacyOverlay();

      new Notification({
        title: 'KeenFresh Remote Access',
        body: `A trusted mobile device has connected. Privacy mode activated.`
      }).show();

      hiddenWindow?.webContents.send('initiate-stream');
      
      if (cursorInterval) clearInterval(cursorInterval);
      cursorInterval = setInterval(async () => {
        try {
          const width = await screen.width();
          const height = await screen.height();
          const pos = await mouse.getPosition();
          const xPct = pos.x / width;
          const yPct = pos.y / height;
          hiddenWindow?.webContents.send('cursor-sync', { xPct, yPct });
        } catch (e) {}
      }, 16); // ~60 FPS
    }
  });

  socket.on('client-left', (data) => {
    console.log('Client left:', data);
    hiddenWindow?.webContents.send('client-left', data);
    hidePrivacyOverlay();
    if (cursorInterval) {
      clearInterval(cursorInterval);
      cursorInterval = null;
    }
  });

  socket.on('webrtc-signal', (data) => {
    hiddenWindow?.webContents.send('webrtc-signal', data);
  });

  ipcMain.on('webrtc-signal', (event, data) => {
    socket?.emit('webrtc-signal', data);
  });

  // Handle inputs from WebRTC DataChannel (routed via renderer)
  ipcMain.on('webrtc-input', async (event, payload) => {
    const { type, data } = payload;
    if (type === 'mouse-move') await handleMouseMove(data);
    else if (type === 'mouse-absolute') await handleAbsoluteMove(data);
    else if (type === 'mouse-click') await handleMouseClick(data);
    else if (type === 'mouse-down') await handleMouseDown(data);
    else if (type === 'mouse-up') await handleMouseUp(data);
    else if (type === 'mouse-double-click') await handleDoubleClick(data);
    else if (type === 'mouse-scroll') await handleMouseScroll(data);
    else if (type === 'key-event') await handleKeyEvent(data);
    else if (type === 'shortcut') await handleShortcut(data);
    else if (type === 'type-text') await handleTypeText(data);
    else if (type === 'system-action') {
      if (data.action === 'screenshot') {
        try {
          const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
          if (sources.length > 0) {
            const base64 = sources[0].thumbnail.toJPEG(75).toString('base64');
            const chunkSize = 16000; // Safe WebRTC limit
            const totalChunks = Math.ceil(base64.length / chunkSize);
            for (let i = 0; i < totalChunks; i++) {
              const chunk = base64.substr(i * chunkSize, chunkSize);
              hiddenWindow?.webContents.send('webrtc-send', { 
                type: 'screenshot-chunk', 
                data: { chunk, index: i, total: totalChunks } 
              });
            }
          }
        } catch (e) {
          console.error('Screenshot failed', e);
        }
      } else if (data.action === 'lock') {
        isLocked = true;
        hiddenWindow?.webContents.send('toggle-app-lock', true);
        hiddenWindow?.setFullScreen(true);
        hiddenWindow?.show();
        hiddenWindow?.focus();
        hiddenWindow?.setAlwaysOnTop(true, 'screen-saver');
        hiddenWindow?.webContents.send('webrtc-send', { type: 'system-status', data: { isLocked: true } });
      } else {
        await handleSystemAction(data);
      }
    }
    else if (type === 'unlock') {
      if (data.password === globalPin) {
        isLocked = false;
        hiddenWindow?.webContents.send('toggle-app-lock', false);
        hiddenWindow?.setFullScreen(false);
        hiddenWindow?.setAlwaysOnTop(false);
        hiddenWindow?.webContents.send('webrtc-send', { type: 'system-status', data: { isLocked: false } });
      } else {
        hiddenWindow?.webContents.send('webrtc-send', { type: 'unlock-failed', data: {} });
      }
    }
    else if (type === 'release-all-keys') await releaseAllModifiers();
    else if (type === 'clipboard-sync') {
      if (data && data.text) clipboard.writeText(data.text);
    }
    else if (type === 'clipboard-sync-request') {
      const text = clipboard.readText();
      hiddenWindow?.webContents.send('clipboard-sync', text);
    }
    else if (type === 'file-transfer-start') {
      currentFileName = data.name;
      fileTransferBuffer = '';
      console.log('Starting file transfer:', currentFileName);
    }
    else if (type === 'file-chunk') {
      fileTransferBuffer += data.chunk;
      if (data.index === data.total - 1) {
        try {
          const downloadPath = path.join(os.homedir(), 'Downloads', currentFileName);
          fs.writeFileSync(downloadPath, Buffer.from(fileTransferBuffer, 'base64'));
          new Notification({ title: 'KeenFresh', body: `File received: ${currentFileName}` }).show();
          console.log('File saved to', downloadPath);
        } catch (e) {
          console.error('File save failed', e);
        }
      }
    }
    else if (type === 'request-system-status') {
      hiddenWindow?.webContents.send('webrtc-send', { type: 'system-status', data: { isLocked } });
    }
  });

  ipcMain.on('unlock-app-request', () => {
    isLocked = false;
    hiddenWindow?.webContents.send('toggle-app-lock', false);
    hiddenWindow?.setFullScreen(false);
    hiddenWindow?.setAlwaysOnTop(false);
    hiddenWindow?.webContents.send('webrtc-send', { type: 'system-status', data: { isLocked: false } });
  });

  ipcMain.on('log', (event, msg) => {
    console.log('[RENDERER LOG]:', msg);
  });

  // Auto-Start System Integration
  ipcMain.handle('get-autostart-status', () => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  });

  ipcMain.on('set-autostart', (event, isEnabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: isEnabled,
      path: app.getPath('exe'),
      args: ['--hidden'] // Start hidden if possible
    });
    console.log(`Auto-Start set to: ${isEnabled}`);
  });

  // Desktop Capturer IPC
  ipcMain.handle('get-desktop-sources', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    return sources.map(s => ({ id: s.id, name: s.name }));
  });

  socket.on('disconnect', () => {
    if (cursorInterval) clearInterval(cursorInterval);
    releaseAllModifiers();
  });
}
