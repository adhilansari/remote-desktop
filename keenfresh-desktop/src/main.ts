import { app, BrowserWindow, ipcMain, desktopCapturer, clipboard, Notification, screen as electronScreen, powerMonitor, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { io, Socket } from 'socket.io-client';
import { handleMouseMove, handleMouseClick, handleMouseScroll, handleKeyEvent, handleAbsoluteMove, handleDoubleClick, handleMouseDown, handleMouseUp, handleShortcut, releaseAllModifiers, handleTypeText, handleSystemAction, handleUnlock } from './automation';
import { ClientToServerEvents, ServerToClientEvents } from 'keenfresh-shared';
import { screen, mouse } from '@nut-tree-fork/nut-js';
import { exec } from 'child_process';

let globalPin = '';

let hiddenWindow: BrowserWindow | null = null;
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let isLocked = false;

let previousBrightness = 100;
let isPrivacyActive = false;

function showPrivacyOverlay() {
  if (process.platform === 'win32' && !isPrivacyActive) {
    isPrivacyActive = true;
    // Read the current brightness first
    exec('powershell (Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness).CurrentBrightness', (error, stdout) => {
      if (!error && stdout) {
        const parsed = parseInt(stdout.trim(), 10);
        if (!isNaN(parsed) && parsed > 0) { // Don't save 0 if it was already dimmed
          previousBrightness = parsed;
        }
      }
      // Dim the physical laptop screen to 0% brightness for privacy
      exec('powershell (Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1,0)');
    });
  }
}

function hidePrivacyOverlay() {
  if (process.platform === 'win32' && isPrivacyActive) {
    isPrivacyActive = false;
    // Restore brightness to previous state
    exec(`powershell (Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1,${previousBrightness})`);
  }
}



// Catch all unhandled errors silently so the app doesn't show default Electron error dialogs
process.on('uncaughtException', (err) => {
  console.error('Caught unhandled exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Caught unhandled rejection:', reason);
});

function createHiddenWindow() {
  Menu.setApplicationMenu(null); // Remove default File/Edit/View menu

  hiddenWindow = new BrowserWindow({
    width: 850,
    height: 600,
    minWidth: 850,
    minHeight: 600,
    center: true,
    show: true, // Set to false in production
    autoHideMenuBar: true, // Hides the menu bar
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  hiddenWindow.loadFile(path.join(__dirname, 'index.html'));
  
  hiddenWindow.on('closed', () => {
    hiddenWindow = null;
  });
}

app.whenReady().then(() => {
  const pinPath = path.join(app.getPath('userData'), 'keenfresh_pin.txt');
  try {
    if (fs.existsSync(pinPath)) {
      globalPin = fs.readFileSync(pinPath, 'utf8').trim();
    } else {
      globalPin = Math.floor(100000 + Math.random() * 900000).toString();
      fs.writeFileSync(pinPath, globalPin, 'utf8');
    }
  } catch (err) {
    globalPin = Math.floor(100000 + Math.random() * 900000).toString();
  }

  createHiddenWindow();
  
  hiddenWindow?.webContents.on('did-finish-load', () => {
    connectToRelay();
  });

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
      hiddenWindow?.webContents.on('did-finish-load', () => {
        connectToRelay();
      });
    }
  });

  // Handle IPC for pairing code
  ipcMain.handle('get-pairing-code', () => {
    return globalPin;
  });

});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const RELAY_SERVER_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'wss://relay.keenfresh.com';

function connectToRelay() {
  // Desktop is trusted internally, bypass token by passing role early
  socket = io(RELAY_SERVER_URL, {
    auth: { clientType: 'desktop' }
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
      } else {
        await handleSystemAction(data);
      }
    }
    else if (type === 'unlock') await handleUnlock(data);
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

  ipcMain.on('log', (event, msg) => {
    console.log('[RENDERER LOG]:', msg);
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
