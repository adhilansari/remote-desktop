# KeenFresh - Remote Desktop Control over WebRTC

![Version](https://img.shields.io/badge/version-1.8.50%20LTS-blue.svg)
![Status](https://img.shields.io/badge/status-Long_Term_Support-success.svg)

KeenFresh is an advanced, ultra-low latency remote desktop control application built using WebRTC, React, and Electron. It allows users to control their desktop PC seamlessly from their mobile device with pixel-perfect touch mapping, gesture support, and dynamic zoom features.

**🎉 Version 1.8.50 has been officially declared as a Long Term Support (LTS) release!**

## 🏗 Global Matchmaking Architecture

KeenFresh consists of three primary components that communicate via a global matchmaking architecture:

1. **KeenFresh Relay (`keenfresh-relay`)**: A neutral Node.js/Socket.io server that acts as a matchmaking lobby. It routes WebRTC handshake signals (`offer`, `answer`, `ice-candidates`) between the desktop and mobile client using a secure 6-digit PIN.
2. **KeenFresh Desktop (`keenfresh-desktop`)**: An Electron app running on the host PC. It generates a secure PIN, connects to the Relay, captures the desktop screen, and executes simulated mouse/keyboard events via `nut-js`.
3. **KeenFresh Web (`keenfresh-web`)**: A React web application served to the mobile device. Users enter the PIN to join the Relay room, which establishes a direct Peer-to-Peer WebRTC tunnel. It displays the live video feed and captures touch inputs.
4. **KeenFresh Shared (`keenfresh-shared`)**: A shared library containing common TypeScript types and Zod schemas used across all projects.

---

## 🚀 How to Run the Project Locally

We have created an automated starter script that spins up all three components concurrently and perfectly routes the logs into a single terminal.

To launch the entire KeenFresh ecosystem on your local machine for development and testing, simply run:

```bash
node start-all.js
```

*(This will automatically boot `keenfresh-relay` on port 3000, `keenfresh-web` on port 5173, and subsequently launch the KeenFresh Electron Desktop Application).*

When the UI pops up on the Desktop, scan the QR code to open the Web App on your phone!

---

## 📦 How to Build for Production

We have a unified, automated release script that handles version bumping, compilation, and executable generation for the entire monorepo.

To create a new release, simply open a terminal in the root `remote-desktop` directory and run:

```bash
node release.js
```

**What the script does:**
1. Automatically increments the version number across all 4 `package.json` files.
2. Runs the TypeScript compiler for all projects.
3. Packages `keenfresh-desktop` into a standalone Windows `.exe` using `electron-builder`.
4. Creates a new versioned folder (e.g., `releases/v1.8.4/`).
5. Safely archives the compiled output and `.exe` into this folder without overwriting older versions.

---

## ✨ Key Features

### 1. Ultra-Low Latency WebRTC Video & Data
- **Video Stream**: Uses WebRTC to stream the desktop screen directly to the mobile browser.
- **DataChannel**: Translates multi-touch inputs into JSON payloads and transmits them to the desktop via the WebRTC DataChannel for instant execution.
- **Dynamic Quality Control**: Users can hot-swap the video stream quality (1080p60, 720p30, 480p15) on the fly to save bandwidth without dropping the connection.
- **Multi-Monitor Support**: Users can seamlessly switch between multiple monitors connected to the host PC.

### 2. Intelligent Touch & Gesture Heuristics
- **Trackpad Mode**: Acts like a laptop trackpad. Features smooth relative mouse movement, 2-finger scrolling, 2-finger right-click, 3-finger middle-click, and double-tap-to-drag.
- **Direct Touch Mode**: Absolute pixel mapping. Maps a physical screen tap to an exact `(X, Y)` coordinate on the desktop monitor.
- **Touch Ripples**: Instant visual feedback on the mobile screen where your fingers make contact.

### 3. Smart Auto-Focus & Zoom Engine
- **Auto-Zoom & Pan**: The mobile client can zoom into the screen (2.5x scale) and automatically pan the camera viewport to follow the desktop cursor as it moves.
- **Edge Clamping**: When zoomed in, the pan mathematical algorithm prevents the user from panning into the black letterbox margins.

### 4. Advanced System Integrations
- **Clipboard Sync**: Instantly bidirectional clipboard syncing between the mobile phone and desktop PC.
- **Virtual Keyboard**: Mobile overlay keyboard that simulates physical keystrokes on the host.
- **Modifier Ribbon**: Toggleable `Ctrl`, `Alt`, `Shift`, `Win`, `Esc`, `Del` keys to perform complex shortcuts. Includes a failsafe `Clear` routine to un-stick simulated modifier keys.
