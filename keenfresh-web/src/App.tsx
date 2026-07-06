import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import './App.css';

type ControlMode = 'trackpad' | 'direct';



interface SavedDevice {
  pin: string;
  hostname: string;
}

function Dashboard({ onConnect }: { onConnect: (pin: string) => void }) {
  const [savedDevices, setSavedDevices] = useState<SavedDevice[]>([]);
  const [newPin, setNewPin] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const devices = JSON.parse(localStorage.getItem('keenfresh_devices') || '[]');
    setSavedDevices(devices);

    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
    if (pinParam && pinParam.length === 9) {
      setNewPin(pinParam);
      setShowAddForm(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handlePair = () => {
    if (newPin.length === 9) {
      // We don't know the hostname yet, it will be updated when connected
      const newDevice = { pin: newPin, hostname: 'Unknown Desktop' };
      const updated = [...savedDevices.filter(d => d.pin !== newPin), newDevice];
      localStorage.setItem('keenfresh_devices', JSON.stringify(updated));
      localStorage.setItem('keenfresh_pin', newPin);
      onConnect(newPin);
    }
  };

  const removeDevice = (pinToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedDevices.filter(d => d.pin !== pinToRemove);
    setSavedDevices(updated);
    localStorage.setItem('keenfresh_devices', JSON.stringify(updated));
  };

  return (
    <div className="gradient-bg" style={{ overflowY: 'auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '600px' }}>
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h1 className="text-gradient" style={{ fontSize: '36px', marginBottom: '8px' }}>KeenFresh</h1>
          <h2 style={{ fontSize: '18px', color: 'var(--text-main)', opacity: 0.8, fontWeight: 500 }}>Remote Desktop</h2>
        </div>
        
        {savedDevices.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '18px', color: 'var(--text-main)', marginBottom: '16px', fontWeight: 600 }}>Remote devices</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {savedDevices.map(device => (
                <div 
                  key={device.pin} 
                  className="glass-panel" 
                  style={{ display: 'flex', alignItems: 'center', padding: '20px', cursor: 'pointer', borderRadius: '16px' }}
                  onClick={() => {
                    localStorage.setItem('keenfresh_pin', device.pin);
                    onConnect(device.pin);
                  }}
                >
                  <div style={{ background: 'var(--primary-blue)', borderRadius: '12px', padding: '12px', marginRight: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '24px' }}>🖥️</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{device.hostname}</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Tap to connect</div>
                  </div>
                  <button 
                    onClick={(e) => removeDevice(device.pin, e)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', padding: '8px' }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 style={{ fontSize: '18px', color: 'var(--text-main)', marginBottom: '16px', fontWeight: 600 }}>Set up another device for remote access</h3>
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
            <ol style={{ paddingLeft: '20px', color: 'var(--text-muted)', lineHeight: '1.8', margin: '0 0 24px 0', fontSize: '15px' }}>
              <li style={{ marginBottom: '12px' }}>Go to the computer you want to remotely access (Windows 10+).</li>
              <li style={{ marginBottom: '12px' }}>Download and run the <b>KeenFresh Desktop Host</b>.</li>
              <li style={{ marginBottom: '12px' }}>Look for the 9-character pairing PIN on the desktop screen.</li>
            </ol>
            
            {!showAddForm ? (
              <button 
                onClick={() => setShowAddForm(true)} 
                className="btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '16px', borderRadius: '12px' }}
              >
                Enter Access PIN
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '12px', animation: 'fadeIn 0.3s ease' }}>
                <input 
                  type="text" 
                  value={newPin} 
                  onChange={e => {
                    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    if (val.length > 4) val = val.slice(0, 4) + '-' + val.slice(4, 8);
                    setNewPin(val);
                  }} 
                  placeholder="ABCD-1234" 
                  className="glass-input"
                  style={{ flex: 1, fontSize: '20px', padding: '12px', textAlign: 'center', letterSpacing: '8px' }} 
                  maxLength={9} 
                />
                <button 
                  onClick={handlePair} 
                  className="btn-primary"
                  style={{ padding: '0 24px', fontSize: '16px', borderRadius: '12px' }}
                >
                  Connect
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [pin, setPin] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [controlMode, setControlMode] = useState<ControlMode>('trackpad');
  const [activeModifiers, setActiveModifiers] = useState<string[]>([]);
  const [showUI, setShowUI] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('Establishing secure P2P connection');
  const [keyboardText, setKeyboardText] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Video transform states
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Display & Quality States
  const [desktopSources, setDesktopSources] = useState<{id: string, name: string}[]>([]);
  const [activeQualityMenu, setActiveQualityMenu] = useState(false);
  const [autoFillEnabled, setAutoFillEnabled] = useState(true);
  const [showDesktopSwitcher, setShowDesktopSwitcher] = useState(false);
  const [zoomMode, setZoomMode] = useState<'contain'|'cover'>('contain');

  // Network & Reconnection States
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [ping, setPing] = useState<number | null>(null);
  const [currentQuality, setCurrentQuality] = useState('1080p60');
  const [currentSourceId, setCurrentSourceId] = useState<string | null>(null);

  // Power Menu States
  const [showPowerMenu, setShowPowerMenu] = useState(false);
  const [powerMenuPassword, setPowerMenuPassword] = useState('');
  const [showPowerUnlockInput, setShowPowerUnlockInput] = useState(false);
  const [isPcLocked, setIsPcLocked] = useState(false);

  // PWA Install States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // Stats & File Transfer
  const [showNetworkStats, setShowNetworkStats] = useState(false);
  const [networkStats, setNetworkStats] = useState({ fps: 0, bitrate: 0, latency: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Network Stats Polling
  useEffect(() => {
    if (!showNetworkStats || !pcRef.current) return;
    let lastBytes = 0;
    let lastTime = Date.now();

    const interval = setInterval(async () => {
      if (!pcRef.current) return;
      try {
        const stats = await pcRef.current.getStats(null);
        let fps = 0, bitrate = 0, latency = 0;
        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            fps = report.framesPerSecond || 0;
            const bytes = report.bytesReceived;
            const now = Date.now();
            if (lastBytes > 0) {
              const bits = (bytes - lastBytes) * 8;
              bitrate = Math.round(bits / ((now - lastTime) / 1000) / 1000); // kbps
            }
            lastBytes = bytes;
            lastTime = now;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            latency = Math.round((report.currentRoundTripTime || 0) * 1000); // ms
          }
        });
        setNetworkStats({ fps, bitrate, latency });
      } catch (e) {
        // ignore
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [showNetworkStats]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert("File is too large! Maximum 15MB allowed.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      // Convert to base64
      let binary = '';
      const bytes = new Uint8Array(arrayBuffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = window.btoa(binary);
      
      const chunkSize = 16000;
      const totalChunks = Math.ceil(base64.length / chunkSize);
      
      sendInput('file-transfer-start', { name: file.name, size: file.size, totalChunks });
      
      // Send chunks slowly to avoid overflowing buffer
      let i = 0;
      const interval = setInterval(() => {
        if (i >= totalChunks) {
          clearInterval(interval);
          alert('File sent successfully!');
          return;
        }
        const chunk = base64.substr(i * chunkSize, chunkSize);
        sendInput('file-chunk', { index: i, total: totalChunks, chunk });
        i++;
      }, 5); // 5ms delay between chunks = ~3MB/s
    };
    reader.readAsArrayBuffer(file);
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  
  // High-performance Gesture Refs (No React State)
  const lastTouch = useRef({ x: 0, y: 0 });
  const touchStartPos = useRef({ x: 0, y: 0 });
  const touchStartTime = useRef(0);
  const maxTouchMoveDist = useRef(0);
  const initialPinchDist = useRef(0);
  const lastPanCenter = useRef({ x: 0, y: 0 });
  const tapTimer = useRef<number | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const tapCount = useRef(0);
  const isDragging = useRef(false);
  const maxTouches = useRef(0);
  const cursorPctRef = useRef({ x: 0.5, y: 0.5 });
  const screenshotBufferRef = useRef('');

  useEffect(() => {
    if (!pin) return;

    const origin = import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin;
    const socket = io(origin, {
      transports: ['websocket']
    });
    socketRef.current = socket;

    socket.on('connect_error', (err) => {
      if (err.message === 'unauthorized') {
        setPin(null);
        localStorage.removeItem('keenfresh_pin');
        alert("Session expired or revoked. Please pair again.");
      }
    });

    socket.on('connect', () => {
      setConnected(true);
      setIsReconnecting(false);
      function getDeviceName() {
      const ua = navigator.userAgent;
      if (/iPad|iPhone|iPod/.test(ua)) return "iPhone/iPad";
      if (/Android/.test(ua)) {
        const match = ua.match(/Android.*?; (.*?) Build/);
        return match && match[1] ? match[1] : "Android Device";
      }
      if (/Macintosh/.test(ua)) return "Mac";
      if (/Windows/.test(ua)) return "Windows PC";
      return "Trusted Device";
    }

    socket.emit('join-room', { 
      pin, 
      clientType: 'mobile',
      deviceName: getDeviceName() 
    });
    });

    socket.on('client-joined', (data: any) => {
      if (data.clientType === 'desktop' && data.hostname) {
        const devices = JSON.parse(localStorage.getItem('keenfresh_devices') || '[]');
        const updated = devices.map((d: any) => d.pin === pin ? { ...d, hostname: data.hostname } : d);
        localStorage.setItem('keenfresh_devices', JSON.stringify(updated));
      }
    });

    socket.on('connection-pending', (data: any) => {
      setConnectionMessage(data.message);
    });

    socket.on('connection-rejected', (data: any) => {
      alert(data.reason || "Connection rejected by desktop.");
      setPin(null);
      localStorage.removeItem('keenfresh_pin');
      socket.disconnect();
    });

    socket.on('connection-accepted', () => {
      setConnectionMessage('Connection accepted, starting stream...');
      socket.emit('finalize-join');
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      if (reason === "io server disconnect" || reason === "io client disconnect") {
        setStreamActive(false);
      } else {
        setIsReconnecting(true);
      }
    });

    socket.on('webrtc-signal', async (data: any) => {
      let pc = pcRef.current;
      if (!pc) {
        pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            { urls: 'stun:stun.cloudflare.com:3478' }
          ]
        });
        pcRef.current = pc;

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit('webrtc-signal', { type: 'candidate', candidate: e.candidate });
          }
        };

        pc.ontrack = (e) => {
          if (videoRef.current) {
            videoRef.current.srcObject = e.streams[0];
            setStreamActive(true);
          }
        };

        pc.ondatachannel = (e) => {
          dcRef.current = e.channel;
          e.channel.onmessage = (msgEvent) => {
            try {
              const msg = JSON.parse(msgEvent.data);
              if (msg.type === 'clipboard-sync' && msg.data?.text) {
                navigator.clipboard.writeText(msg.data.text).catch(err => console.error("Clipboard write failed", err));
                alert("Desktop clipboard synced to mobile!");
              } else if (msg.type === 'screenshot-chunk') {
                if (msg.data.index === 0) screenshotBufferRef.current = '';
                screenshotBufferRef.current += msg.data.chunk;
                if (msg.data.index === msg.data.total - 1) {
                  const link = document.createElement('a');
                  link.href = 'data:image/jpeg;base64,' + screenshotBufferRef.current;
                  link.download = `KeenFresh-${Date.now()}.jpg`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  screenshotBufferRef.current = '';
                }
              } else if (msg.type === 'desktop-sources') {
                setDesktopSources(msg.data);
                if (msg.data.length > 0) {
                  setCurrentSourceId(prev => prev || msg.data[0].id);
                }
              } else if (msg.type === 'system-status') {
                setIsPcLocked(msg.data.isLocked);
              } else if (msg.type === 'unlock-failed') {
                alert("Incorrect PIN! The device could not be unlocked.");
              } else if (msg.type === 'cursor-sync') {
                cursorPctRef.current = { x: msg.data.xPct, y: msg.data.yPct };
              }
            } catch (err) {
              console.error('Data channel parse error', err);
            }
          };

          e.channel.onopen = () => {
            if (e.channel.readyState === 'open') {
              e.channel.send(JSON.stringify({ type: 'request-system-status', data: {} }));
            }
          };
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

    return () => {
      sendInput('release-all-keys', {});
      socket.disconnect();
      pcRef.current?.close();
    };
  }, [pin]);

  // --- Network Health Polling ---
  useEffect(() => {
    let interval: any;
    if (streamActive) {
      interval = setInterval(async () => {
        if (!pcRef.current) return;
        try {
          const stats = await pcRef.current.getStats();
          let rtt = null;
          stats.forEach(stat => {
            if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
              if (stat.currentRoundTripTime !== undefined) {
                rtt = stat.currentRoundTripTime * 1000;
              }
            }
          });
          if (rtt !== null) setPing(Math.round(rtt));
        } catch(e) {}
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [streamActive]);

  // --- Auto-Focus Engine (Edge Detection) ---
  useEffect(() => {
    if (scale <= 1) return;
    
    let animationFrame: number;
    const updateFocus = () => {
      // Don't fight manual two-finger panning
      if (maxTouches.current >= 2) {
        animationFrame = requestAnimationFrame(updateFocus);
        return;
      }

      const video = videoRef.current;
      if (!video) {
        animationFrame = requestAnimationFrame(updateFocus);
        return;
      }
      
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      const videoRatio = video.videoWidth / video.videoHeight || 16/9;
      const elementRatio = screenW / screenH;
      
      let displayedWidth = screenW;
      let displayedHeight = screenH;
      let offsetX = 0;
      let offsetY = 0;

      if (videoRatio > elementRatio) {
        displayedHeight = screenW / videoRatio;
        offsetY = (screenH - displayedHeight) / 2;
      } else {
        displayedWidth = screenH * videoRatio;
        offsetX = (screenW - displayedWidth) / 2;
      }

      // Cursor's physical coordinate in unscaled screen space
      const cursorUnscaledX = offsetX + displayedWidth * cursorPctRef.current.x;
      const cursorUnscaledY = offsetY + displayedHeight * cursorPctRef.current.y;
      
      const cx = screenW / 2;
      const cy = screenH / 2;

      setPan(prev => {
        // Calculate the current screen position of the cursor with existing pan and scale
        const screenX = cx + (cursorUnscaledX - cx) * scale + prev.x;
        const screenY = cy + (cursorUnscaledY - cy) * scale + prev.y;

        // Define bounding box padding (15% of screen size)
        const padX = screenW * 0.15;
        const padY = screenH * 0.15;

        let targetPanX = prev.x;
        let targetPanY = prev.y;

        if (screenX < padX) {
          targetPanX = prev.x + (padX - screenX);
        } else if (screenX > screenW - padX) {
          targetPanX = prev.x - (screenX - (screenW - padX));
        }

        if (screenY < padY) {
          targetPanY = prev.y + (padY - screenY);
        } else if (screenY > screenH - padY) {
          targetPanY = prev.y - (screenY - (screenH - padY));
        }

        const diffX = targetPanX - prev.x;
        const diffY = targetPanY - prev.y;
        
        if (Math.abs(diffX) < 0.5 && Math.abs(diffY) < 0.5) return prev;
        
        // Smoothly lerp towards the target pan that keeps the cursor in bounds
        return {
          x: prev.x + diffX * 0.2,
          y: prev.y + diffY * 0.2
        };
      });
      
      animationFrame = requestAnimationFrame(updateFocus);
    };
    
    animationFrame = requestAnimationFrame(updateFocus);
    return () => cancelAnimationFrame(animationFrame);
  }, [scale]);

  const sendInput = (type: string, data?: any) => {
    if (dcRef.current && dcRef.current.readyState === 'open') {
      dcRef.current.send(JSON.stringify({ type, data }));
    }
  };

  const toggleModifier = (key: string) => {
    setActiveModifiers(prev => {
      if (prev.includes(key)) {
        sendInput('key-event', { action: 'up', key });
        return prev.filter(k => k !== key);
      } else {
        sendInput('key-event', { action: 'down', key });
        return [...prev, key];
      }
    });
  };

  const getDistance = (t1: React.Touch, t2: React.Touch) => {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  };

  const getCenter = (t1: React.Touch, t2: React.Touch) => {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    };
  };

  const applyAutoFill = () => {
    const video = videoRef.current;
    if (!video) return;
    const screenRatio = window.innerWidth / window.innerHeight;
    const videoRatio = video.videoWidth / video.videoHeight;
    if (!videoRatio) return;
    
    let coverScale = 1;
    if (screenRatio > videoRatio) {
      coverScale = screenRatio / videoRatio;
    } else {
      coverScale = videoRatio / screenRatio;
    }
    
    setScale(coverScale + 0.02);
    setPan({x: 0, y: 0});
  };

  useEffect(() => {
    const handleResize = () => {
      if (autoFillEnabled) applyAutoFill();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [autoFillEnabled]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // If they manually touch/zoom, disable auto fill so we don't clobber it on resize
    if (e.touches.length >= 2) {
      setAutoFillEnabled(false);
    }
    if (activeQualityMenu) setActiveQualityMenu(false);
    if (!hasInteracted) {
      setHasInteracted(true);
      setAudioEnabled(true);
    }

    // Spawn visual ripples for each touch point
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const ripple = document.createElement('div');
      ripple.className = 'touch-ripple';
      ripple.style.left = `${touch.clientX}px`;
      ripple.style.top = `${touch.clientY}px`;
      document.body.appendChild(ripple);
      setTimeout(() => ripple.remove(), 400);
    }

    const touchCount = e.touches.length;
    maxTouches.current = Math.max(maxTouches.current, touchCount);

    if (touchCount === 1) {
      touchStartTime.current = performance.now();
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      maxTouchMoveDist.current = 0;
      
      tapCount.current += 1;
      
      if (tapCount.current === 1) {
        if (tapTimer.current) clearTimeout(tapTimer.current);
        
        // Start long-press detection
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        longPressTimer.current = window.setTimeout(() => {
          if (maxTouchMoveDist.current < 10) {
            isDragging.current = true;
            sendInput('mouse-down', { button: 'left' });
            if (navigator.vibrate) navigator.vibrate(50);
          }
        }, 500);
      } else if (tapCount.current === 2) {
        if (tapTimer.current) clearTimeout(tapTimer.current);
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        isDragging.current = false;
      }
    } else if (touchCount === 2) {
      if (tapTimer.current) { clearTimeout(tapTimer.current); tapCount.current = 0; }
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      isDragging.current = false;
      touchStartPos.current = getCenter(e.touches[0], e.touches[1]);
      touchStartTime.current = performance.now();
      maxTouchMoveDist.current = 0;
      
      initialPinchDist.current = getDistance(e.touches[0], e.touches[1]);
      lastPanCenter.current = getCenter(e.touches[0], e.touches[1]);
    } else if (touchCount === 3) {
      if (tapTimer.current) { clearTimeout(tapTimer.current); tapCount.current = 0; }
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      isDragging.current = false;
      touchStartPos.current = getCenter(e.touches[0], e.touches[1]);
      touchStartTime.current = performance.now();
      maxTouchMoveDist.current = 0;
      lastPanCenter.current = getCenter(e.touches[0], e.touches[1]);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      
      const distFromStart = Math.hypot(e.touches[0].clientX - touchStartPos.current.x, e.touches[0].clientY - touchStartPos.current.y);
      maxTouchMoveDist.current = Math.max(maxTouchMoveDist.current, distFromStart);
      
      if (maxTouchMoveDist.current >= 10 && longPressTimer.current && !isDragging.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      if (controlMode === 'trackpad') {
        const distance = Math.hypot(dx, dy);
        const accel = 1 + (distance * 0.015); // gentle dynamic acceleration
        const finalDx = dx * accel * 1.5;
        const finalDy = dy * accel * 1.5;
        
        if (Math.abs(finalDx) > 0.5 || Math.abs(finalDy) > 0.5) {
          sendInput('mouse-move', { dx: finalDx, dy: finalDy });
        }
      } else if (controlMode === 'direct') {
        const video = videoRef.current;
        if (video) {
          const rect = video.getBoundingClientRect();
          const videoRatio = video.videoWidth / video.videoHeight || 16/9;
          const elementRatio = rect.width / rect.height;
          
          let displayedWidth = rect.width;
          let displayedHeight = rect.height;
          let offsetX = 0;
          let offsetY = 0;

          if (videoRatio > elementRatio) {
            displayedHeight = rect.width / videoRatio;
            offsetY = (rect.height - displayedHeight) / 2;
          } else {
            displayedWidth = rect.height * videoRatio;
            offsetX = (rect.width - displayedWidth) / 2;
          }

          let trueX = e.touches[0].clientX - rect.left - offsetX;
          let trueY = e.touches[0].clientY - rect.top - offsetY;

          trueX = Math.max(0, Math.min(displayedWidth, trueX));
          trueY = Math.max(0, Math.min(displayedHeight, trueY));

          const xPct = trueX / displayedWidth;
          const yPct = trueY / displayedHeight;

          sendInput('mouse-absolute', { x: xPct, y: yPct });
        }
      }
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } 
    else if (e.touches.length === 2) {
      const currentDist = getDistance(e.touches[0], e.touches[1]);
      const currentCenter = getCenter(e.touches[0], e.touches[1]);
      
      const distFromStart = Math.hypot(currentCenter.x - touchStartPos.current.x, currentCenter.y - touchStartPos.current.y);
      maxTouchMoveDist.current = Math.max(maxTouchMoveDist.current, distFromStart);

      const distDelta = Math.abs(currentDist - initialPinchDist.current);
      
      if (distDelta > 20) {
        // Pinch to Zoom
        const scaleFactor = currentDist / initialPinchDist.current;
        setScale(prev => Math.min(Math.max(1, prev * scaleFactor), 5));
        initialPinchDist.current = currentDist;
      } else {
        // Panning or Scrolling
        const dx = currentCenter.x - lastPanCenter.current.x;
        const dy = currentCenter.y - lastPanCenter.current.y;
        
        if (scale > 1) {
          setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        } else {
          // Scroll (Two-Finger Drag)
          // Scale down the pixel delta so the scroll feels natural and not extremely fast
          const scrollAmount = Math.max(1, Math.floor(Math.abs(dy) * 0.15));
          sendInput('mouse-scroll', { direction: dy > 0 ? 'up' : 'down', amount: scrollAmount });
        }
      }
      lastPanCenter.current = currentCenter;
    } else if (e.touches.length === 3) {
      // Three-Finger Pan or Swipe Down/Left/Right
      const currentCenter = getCenter(e.touches[0], e.touches[1]);
      const dx = currentCenter.x - lastPanCenter.current.x;
      const dy = currentCenter.y - lastPanCenter.current.y;
      
      const totalDy = currentCenter.y - touchStartPos.current.y;
      const totalDx = currentCenter.x - touchStartPos.current.x;

      if (totalDy > 50 && !showUI && Math.abs(totalDx) < 50) {
        setShowUI(true); // 3-finger swipe down to show UI
      } else if (Math.abs(totalDx) > 80) {
        // 3-finger horizontal swipe to switch monitors
        if (desktopSources.length > 1 && !isDragging.current) {
          isDragging.current = true; // debounce flag
          const currentIndex = desktopSources.findIndex(s => s.id === currentSourceId);
          let nextIndex = currentIndex;
          if (totalDx > 0) { // Swipe right (prev monitor)
            nextIndex = (currentIndex - 1 + desktopSources.length) % desktopSources.length;
          } else { // Swipe left (next monitor)
            nextIndex = (currentIndex + 1) % desktopSources.length;
          }
          const nextSource = desktopSources[nextIndex];
          if (nextSource) {
            setCurrentSourceId(nextSource.id);
            sendInput('switch-display', { sourceId: nextSource.id });
            if (navigator.vibrate) navigator.vibrate(50);
          }
        }
      } else if (scale > 1) {
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      }
      lastPanCenter.current = currentCenter;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    const isTap = maxTouchMoveDist.current < 10 && (performance.now() - touchStartTime.current) < 400;

    if (e.touches.length === 0) {
      // All fingers lifted
      const touchCount = maxTouches.current;
      maxTouches.current = 0; // reset for next gesture

      if (isDragging.current) {
        sendInput('mouse-up', { button: 'left' });
        isDragging.current = false;
        tapCount.current = 0;
        return;
      }

      if (touchCount === 1) {
        if (isTap) {
          if (controlMode === 'direct') {
            // Direct Touch Mode: Instant click, bypass queue
            const video = videoRef.current;
            if (video) {
              const rect = video.getBoundingClientRect();
              const videoRatio = video.videoWidth / video.videoHeight || 16/9;
              const elementRatio = rect.width / rect.height;
              
              let displayedWidth = rect.width;
              let displayedHeight = rect.height;
              let offsetX = 0;
              let offsetY = 0;

              if (videoRatio > elementRatio) {
                displayedHeight = rect.width / videoRatio;
                offsetY = (rect.height - displayedHeight) / 2;
              } else {
                displayedWidth = rect.height * videoRatio;
                offsetX = (rect.width - displayedWidth) / 2;
              }

              let trueX = e.changedTouches[0].clientX - rect.left - offsetX;
              let trueY = e.changedTouches[0].clientY - rect.top - offsetY;

              trueX = Math.max(0, Math.min(displayedWidth, trueX));
              trueY = Math.max(0, Math.min(displayedHeight, trueY));

              const xPct = trueX / displayedWidth;
              const yPct = trueY / displayedHeight;

              sendInput('mouse-absolute', { x: xPct, y: yPct });
            }
            sendInput('mouse-click', { button: 'left' });
            tapCount.current = 0;
            if (tapTimer.current) clearTimeout(tapTimer.current);
          } else {
            // Trackpad Mode: 300ms queue for Double Click detection
            if (tapCount.current === 1) {
              tapTimer.current = window.setTimeout(() => {
                sendInput('mouse-click', { button: 'left' });
                tapCount.current = 0;
              }, 300);
            } else if (tapCount.current === 2) {
              sendInput('mouse-double-click', { button: 'left' });
              tapCount.current = 0;
            }
          }
        } else {
          tapCount.current = 0;
        }
      } else if (touchCount === 2) {
        // Right Click (Two-Finger Tap)
        if (isTap) sendInput('mouse-click', { button: 'right' });
      } else if (touchCount === 3) {
        // 3-Finger Tap toggles UI
        if (isTap) setShowUI(prev => !prev);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      if (screen.orientation && (screen.orientation as any).lock) {
        (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } else {
      document.exitFullscreen().catch(() => {});
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const pwaInstallModal = showInstallPrompt && (
    <div className="pwa-install-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '20px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', textAlign: 'center', padding: '40px 30px', animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', borderRadius: '20px', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', boxShadow: '0 10px 20px rgba(236, 72, 153, 0.4)' }}>
          <span style={{ fontSize: '32px' }}>📱</span>
        </div>
        <h2 className="text-gradient" style={{ margin: '0 0 12px 0', fontSize: '26px' }}>Install App</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '25px', lineHeight: 1.5, fontSize: '15px' }}>
          Install KeenFresh to your home screen for a seamless, fullscreen native app experience!
        </p>
        <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
          <button onClick={() => setShowInstallPrompt(false)} className="btn-secondary" style={{ flex: 1, padding: '14px', borderRadius: '16px' }}>Not Now</button>
          <button onClick={handleInstallClick} className="btn-primary" style={{ flex: 1, padding: '14px', borderRadius: '16px' }}>Install</button>
        </div>
      </div>
    </div>
  );

  if (!pin || (!connected && !streamActive)) {
    return (
      <>
        <Dashboard onConnect={setPin} />
        {pwaInstallModal}
      </>
    );
  }

  return (
    <>
      {pwaInstallModal}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        style={{ display: 'none' }} 
      />
      <div className="app-container">
      <div className="video-container" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}>
        <video
          ref={videoRef}
          onLoadedMetadata={() => { if (autoFillEnabled) applyAutoFill(); }}
          autoPlay
          playsInline
          muted={!audioEnabled}
          className="stream-video"
          style={{ display: streamActive ? 'block' : 'none', objectFit: zoomMode }}
        />
      </div>
      
      {!streamActive && (
        <div className="gradient-bg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', position: 'absolute', zIndex: 50 }}>
          <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'pulse-glow 2s infinite', maxWidth: '90%', textAlign: 'center' }}>
            <div style={{ background: 'linear-gradient(135deg, #ff7e5f, #feb47b)', borderRadius: '50%', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 10px 20px rgba(255, 126, 95, 0.4)' }}>
              <span style={{ fontSize: '40px', color: 'white' }}>🖥️</span>
            </div>
            <h2 className="text-gradient" style={{ fontSize: '28px', marginBottom: '8px' }}>Connecting...</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '24px' }}>{connectionMessage}</p>
            <button 
              className="btn-secondary" 
              style={{ padding: '12px 30px', fontSize: '16px', borderRadius: '16px', width: '100%' }}
              onClick={() => {
                setPin(null);
                setConnected(false);
                socketRef.current?.disconnect();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Onboarding Overlay */}
      {streamActive && showOnboarding && (
        <div className="gradient-bg" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ padding: '40px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '400px', width: '100%', textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)', borderRadius: '50%', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', boxShadow: '0 10px 20px rgba(0, 242, 254, 0.3)' }}>
              <span style={{ fontSize: '32px' }}>✨</span>
            </div>
            <h2 className="text-gradient" style={{ margin: '0 0 12px 0', fontSize: '26px' }}>You're Connected!</h2>
            <div style={{ color: 'var(--text-main)', marginBottom: '30px', lineHeight: '1.8', fontSize: '15px', textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
              <div style={{ marginBottom: '8px' }}>👆 <b style={{ color: 'var(--primary-cyan)' }}>Tap</b> to Click</div>
              <div style={{ marginBottom: '8px' }}>✌️ <b style={{ color: 'var(--primary-cyan)' }}>Two-Finger Tap</b> to Right-Click</div>
              <div style={{ marginBottom: '8px' }}>🙌 <b style={{ color: 'var(--primary-cyan)' }}>Three-Finger Tap</b> for Menus</div>
              <div>👌 <b style={{ color: 'var(--primary-cyan)' }}>Pinch</b> to Zoom In/Out</div>
            </div>
            <button 
              className="btn-primary" 
              onClick={() => setShowOnboarding(false)}
              style={{ padding: '16px', fontSize: '16px', width: '100%' }}
            >
              Start Controlling
            </button>
          </div>
        </div>
      )}

      {/* Network Stats HUD */}
      {streamActive && showNetworkStats && (
        <div style={{
          position: 'absolute', top: '10px', left: '10px',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
          padding: '10px', borderRadius: '8px', color: '#fff', fontSize: '12px', zIndex: 50, fontFamily: 'monospace'
        }}>
          <div>FPS: <span style={{color: '#38bdf8'}}>{networkStats.fps}</span></div>
          <div>Bitrate: <span style={{color: '#38bdf8'}}>{networkStats.bitrate} kbps</span></div>
          <div>Ping: <span style={{color: '#38bdf8'}}>{networkStats.latency} ms</span></div>
        </div>
      )}

      {/* Lock Screen Overlay */}
      {streamActive && isPcLocked && (
        <div className="gradient-bg" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 60, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ padding: '40px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '400px', width: '100%', textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)', borderRadius: '50%', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', boxShadow: '0 10px 20px rgba(244, 63, 94, 0.4)' }}>
              <span style={{ fontSize: '32px' }}>🔒</span>
            </div>
            <h2 className="text-gradient" style={{ margin: '0 0 12px 0', fontSize: '26px' }}>PC is Locked</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5', fontSize: '15px' }}>
              Enter the 6-digit Access PIN to securely unlock the remote PC.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <input 
                type="password"
                className="glass-input"
                value={powerMenuPassword}
                onChange={(e) => setPowerMenuPassword(e.target.value)}
                placeholder="Access PIN"
                style={{ padding: '16px', fontSize: '16px', textAlign: 'center', letterSpacing: '2px' }}
              />
              <button 
                className="btn-primary"
                onClick={() => {
                  sendInput('unlock', { password: powerMenuPassword });
                  setPowerMenuPassword('');
                }}
                style={{ padding: '16px', fontSize: '16px', width: '100%' }}
              >
                Unlock PC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invisible Touch Area */}
      <div 
        className="joystick-area"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />

      {/* Top Toolbar */}
      <div className={`status-overlay ${(!connected && streamActive && !isReconnecting) ? '' : 'hidden'}`}>
        <div className="status-spinner"></div>
        <div>Connecting to remote...</div>
      </div>

      {/* Reconnecting Overlay */}
      <div className={`status-overlay ${isReconnecting ? '' : 'hidden'}`} style={{ zIndex: 100, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)' }}>
        <div className="status-spinner" style={{ borderColor: 'rgba(234, 179, 8, 0.2)', borderTopColor: '#eab308' }}></div>
        <div style={{ color: '#eab308', fontWeight: 600 }}>Connection dropped. Reconnecting...</div>
      </div>

      {/* Top Toolbar */}
      <div className={`top-toolbar-container ${showUI ? '' : 'hidden'}`}>
        <div className="top-toolbar">
          {/* Menu Toggle (More Options) */}
          <button 
            className="icon-btn"
            onClick={() => {
              setShowPowerMenu(!showPowerMenu);
              setActiveQualityMenu(false);
              setShowDesktopSwitcher(false);
            }}
            title="Menu"
          >
            ⋮
          </button>

          {/* Network Ping Indicator */}
          {ping !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '10px', color: '#fff', fontWeight: 600 }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ping < 80 ? '#22c55e' : ping < 150 ? '#eab308' : '#ef4444' }}></div>
              {ping}ms
            </div>
          )}

          {/* Trackpad / Touch Mode Toggle */}
          <button 
            className={`icon-btn ${controlMode === 'trackpad' ? 'active-icon' : ''}`}
            onClick={() => setControlMode(prev => prev === 'trackpad' ? 'direct' : 'trackpad')}
            title="Toggle Control Mode"
          >
            {controlMode === 'trackpad' ? '🖱️' : '👆'}
          </button>

          {/* Keyboard Toggle */}
          <button className="icon-btn" onClick={() => {
            setShowKeyboard(!showKeyboard);
            if (showKeyboard) {
              sendInput('release-all-keys', {});
              setActiveModifiers([]);
            }
          }} title="Toggle Keyboard">⌨️</button>

          {/* Fullscreen Toggle */}
          <button 
            className="icon-btn"
            onClick={toggleFullscreen}
          >⤢</button>
        </div>
        
        {/* Handle to pull down / push up */}
        <div className="toolbar-handle" onClick={() => setShowUI(!showUI)}>
        </div>
      </div>

      {/* More Options Menu Modal */}
      {showPowerMenu && (
        <div className="glass-menu">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>More Options</h3>
                <button className="icon-btn" style={{ width: '30px', height: '30px', fontSize: '14px' }} onClick={() => { setShowPowerMenu(false); setShowPowerUnlockInput(false); }}>✕</button>
              </div>

              {!showPowerUnlockInput ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* System & Power */}
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Power & System</div>
                  
                  <button 
                    className="glass-menu-item"
                    onClick={() => {
                      sendInput('system-action', { type: 'lock' });
                      setShowPowerMenu(false);
                    }}
                    style={{ padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <span>🔒</span> Lock PC
                  </button>
                  <button 
                    className="glass-menu-item"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to put the remote PC to sleep? You may not be able to wake it remotely unless Wake-on-LAN is configured.")) {
                        sendInput('system-action', { type: 'sleep' });
                        setShowPowerMenu(false);
                      }
                    }}
                    style={{ padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <span>🌙</span> Sleep PC
                  </button>
                  <button 
                    className="glass-menu-item"
                    onClick={() => {
                      setShowPowerUnlockInput(true);
                    }}
                    style={{ padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <span>🔓</span> Unlock PC
                  </button>
                  <button 
                    className="glass-menu-item"
                    onClick={() => {
                      sendInput('shortcut', { keys: ['super'] });
                      setShowPowerMenu(false);
                    }}
                    style={{ padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <span>⊞</span> Start Menu
                  </button>
                  <button 
                    className="glass-menu-item"
                    onClick={() => {
                      sendInput('shortcut', { keys: ['super', 'tab'] });
                      setShowPowerMenu(false);
                    }}
                    style={{ padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <span>🗂️</span> Task View
                  </button>

                  {/* Tools */}
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Tools & Displays</div>

                  <button 
                    className="glass-menu-item"
                    onClick={() => { setShowDesktopSwitcher(true); setShowPowerMenu(false); }}
                    style={{ padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <span>🖥️</span> Switch Displays
                  </button>
                  <button 
                    className="glass-menu-item"
                    onClick={() => { setActiveQualityMenu(true); setShowPowerMenu(false); }}
                    style={{ padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <span>⚙️</span> Stream Quality
                  </button>
                  <button 
                    className="glass-menu-item"
                    onClick={() => {
                      setAudioEnabled(!audioEnabled);
                      setHasInteracted(true);
                      setShowPowerMenu(false);
                    }}
                    style={{ padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <span>{audioEnabled ? '🔊' : '🔇'}</span> {audioEnabled ? 'Mute Audio' : 'Enable Audio'}
                  </button>
                  <button 
                    className="glass-menu-item"
                    onClick={() => {
                      const newState = !autoFillEnabled;
                      setAutoFillEnabled(newState);
                      if (newState) {
                        applyAutoFill();
                      } else {
                        setScale(1);
                        setPan({x:0, y:0});
                      }
                      setShowPowerMenu(false);
                    }}
                    style={{ padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <span>{autoFillEnabled ? '🔲' : '🔳'}</span> {autoFillEnabled ? 'Disable Fit Mode' : 'Enable Fit Mode'}
                  </button>
                  <button 
                    className="glass-menu-item"
                    onClick={() => {
                      setZoomMode(prev => prev === 'contain' ? 'cover' : 'contain');
                      setShowPowerMenu(false);
                    }}
                    style={{ padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <span>{zoomMode === 'contain' ? '🔍' : '🔎'}</span> Toggle Auto-Zoom
                  </button>
                  <button 
                    className="glass-menu-item"
                    onClick={() => {
                      sendInput('system-action', { action: 'screenshot' });
                      setShowPowerMenu(false);
                    }}
                    style={{ padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <span>📸</span> Take Screenshot
                  </button>
                  <button 
                    className="glass-menu-item"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.readText().then(text => {
                          sendInput('clipboard-sync', { text });
                        }).catch(() => alert("Failed to read mobile clipboard."));
                      }
                      setShowPowerMenu(false);
                    }}
                    style={{ padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <span>📋</span> Paste from phone
                  </button>

                  <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '10px 0' }}></div>
                  <button 
                    className="glass-menu-item"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to disconnect?')) {
                        if (socketRef.current) socketRef.current.disconnect();
                        if (pcRef.current) pcRef.current.close();
                        setPin(null);
                        localStorage.removeItem('keenfresh_pin');
                        setStreamActive(false);
                        setShowPowerMenu(false);
                      }
                    }}
                    style={{ padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', color: '#ff4444' }}
                  >
                    <span>🚪</span> Disconnect
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '12px', opacity: 0.8, lineHeight: 1.4 }}>
                    Enter the 6-digit Access PIN to securely unlock the remote PC.
                  </div>
                  <input 
                    type="password"
                    value={powerMenuPassword}
                    onChange={(e) => setPowerMenuPassword(e.target.value)}
                    placeholder="Access PIN"
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #38bdf8', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '16px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                    <button 
                      onClick={() => setShowPowerUnlockInput(false)}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer' }}
                    >Back</button>
                    <button 
                      onClick={() => {
                        sendInput('unlock', { password: powerMenuPassword });
                        setPowerMenuPassword('');
                        setShowPowerUnlockInput(false);
                        setShowPowerMenu(false);
                      }}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#38bdf8', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                    >Unlock</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quality & Settings Menu Modal */}
          {activeQualityMenu && (
            <div className="glass-menu">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Settings</h3>
                <button className="icon-btn" style={{ width: '30px', height: '30px', fontSize: '14px' }} onClick={() => setActiveQualityMenu(false)}>✕</button>
              </div>

              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>Stream Quality</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '15px' }}>
                {['1080p60', '720p30', '480p15'].map(q => (
                  <button 
                    key={q} 
                    className={`glass-menu-item ${currentQuality === q ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentQuality(q);
                      sendInput('change-quality', { quality: q });
                      setActiveQualityMenu(false);
                    }}
                    style={{ padding: '10px 5px', fontSize: '13px', textAlign: 'center' }}
                  >
                    {q === '1080p60' ? 'High' : q === '720p30' ? 'Balanced' : 'Data Saver'}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>Advanced</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                <button 
                  className={`glass-menu-item ${showNetworkStats ? 'active' : ''}`}
                  onClick={() => setShowNetworkStats(!showNetworkStats)}
                  style={{ padding: '10px 15px', fontSize: '14px', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}
                >
                  <span>Show Network Stats</span>
                  <span>{showNetworkStats ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Scroll Controls */}
          <div className="scroll-controls">
            <button className="icon-btn" style={{ fontSize: '18px', padding: '10px 14px', background: 'transparent' }} onClick={(e) => { e.stopPropagation(); sendInput('mouse-scroll', { direction: 'up', amount: 15 }); }}>▲</button>
            <button className="icon-btn" style={{ fontSize: '18px', padding: '10px 14px', background: 'transparent' }} onClick={(e) => { e.stopPropagation(); sendInput('mouse-scroll', { direction: 'down', amount: 15 }); }}>▼</button>
          </div>

          {/* Reset Zoom Button */}
          {scale > 1 && (
            <button 
              className="reset-zoom-btn"
              onClick={(e) => {
                e.stopPropagation();
                setScale(1); 
                setPan({x:0, y:0}); 
                // No setAutoFocus needed since engine is automatic
              }}
            >
              Reset Zoom
            </button>
          )}

          {/* Keyboard Overlay */}
          {showKeyboard && (
            <div className="keyboard-overlay" style={{ flexDirection: 'column', gap: '8px', padding: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', width: '100%', paddingBottom: '4px', scrollbarWidth: 'none', touchAction: 'pan-x', WebkitOverflowScrolling: 'touch' }}>
                {['control', 'alt', 'shift', 'super', 'escape', 'delete'].map(key => (
                  <button 
                    key={key}
                    className={`mod-btn ${activeModifiers.includes(key) ? 'active' : ''}`}
                    style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap', flexShrink: 0 }}
                    onClick={() => toggleModifier(key)}
                  >
                    {key === 'control' ? 'Ctrl' : key === 'super' ? 'Win' : key === 'escape' ? 'Esc' : key === 'delete' ? 'Del' : key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 4px', flexShrink: 0 }}></div>
                <button className="mod-btn" style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => sendInput('shortcut', { keys: ['control', 'c'] })}>Copy</button>
                <button className="mod-btn" style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => sendInput('shortcut', { keys: ['control', 'v'] })}>Paste</button>
                <button className="mod-btn" style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => sendInput('shortcut', { keys: ['control', 'z'] })}>Undo</button>
                <button className="mod-btn" style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => sendInput('shortcut', { keys: ['control', 'a'] })}>Select All</button>
                <button className="mod-btn" style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => sendInput('shortcut', { keys: ['control', 's'] })}>Save</button>
                <button className="mod-btn" style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => sendInput('shortcut', { keys: ['control', 'f'] })}>Find</button>
                <button className="mod-btn" style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap', flexShrink: 0, background: 'rgba(239, 68, 68, 0.4)' }} onClick={() => { sendInput('release-all-keys', {}); setActiveModifiers([]); setShowKeyboard(false); }}>Close</button>
              </div>
              <div style={{ display: 'flex', width: '100%', gap: '10px' }}>
                <input 
                  type="text" 
                  value={keyboardText}
                  onChange={(e) => setKeyboardText(e.target.value)}
                  placeholder="Type to send to desktop..."
                  className="keyboard-input"
                  style={{ flex: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (keyboardText) {
                        sendInput('type-text', { text: keyboardText });
                      }
                      sendInput('key-event', { action: 'down', key: 'enter' });
                      setTimeout(() => sendInput('key-event', { action: 'up', key: 'enter' }), 50);
                      setKeyboardText('');
                    }
                  }}
                />
                <button 
                  className="keyboard-send-btn"
                  onClick={() => {
                    if (keyboardText) {
                      sendInput('type-text', { text: keyboardText });
                    }
                    sendInput('key-event', { action: 'down', key: 'enter' });
                    setTimeout(() => sendInput('key-event', { action: 'up', key: 'enter' }), 50);
                    setKeyboardText('');
                  }}
                >Send</button>
              </div>
            </div>
          )}


          {/* Desktop Switcher Overlay */}
          {showDesktopSwitcher && (
            <div className="desktop-switcher-overlay">
              <button className="close-switcher-btn" onClick={() => setShowDesktopSwitcher(false)}>✕</button>
              <div className="desktop-switcher-title">Switch Desktop</div>
              
              <div className="desktop-cards-container">
                {desktopSources.length > 0 ? desktopSources.map(source => (
                  <div 
                    key={source.id} 
                    className={`desktop-card ${currentSourceId === source.id ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentSourceId(source.id);
                      sendInput('switch-display', { sourceId: source.id });
                      setShowDesktopSwitcher(false);
                    }}
                  >
                    <div className="desktop-card-icon">🖥️</div>
                    <div className="desktop-card-name">{source.name}</div>
                  </div>
                )) : <div style={{ color: '#aaa' }}>No additional displays found</div>}
              </div>

              <div className="virtual-desktop-controls">
                <button className="virtual-desktop-btn" onClick={() => {
                  sendInput('shortcut', { keys: ['super', 'control', 'left'] });
                  if (navigator.vibrate) navigator.vibrate(50);
                }}>
                  ← Prev Virtual Desktop
                </button>
                <button className="virtual-desktop-btn" onClick={() => {
                  sendInput('shortcut', { keys: ['super', 'control', 'right'] });
                  if (navigator.vibrate) navigator.vibrate(50);
                }}>
                  Next Virtual Desktop →
                </button>
              </div>
            </div>
          )}
    </div>
    </>
  );
}

export default App;
