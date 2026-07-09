import { mouse, keyboard, screen, Point, Button, Key } from '@nut-tree-fork/nut-js';
import { Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from 'keenfresh-shared';
import { exec } from 'child_process';

  // Remove native artificial delay to ensure buttery smooth mouse movements
  mouse.config.autoDelayMs = 0;

/**
 * Translates relative percentage coordinates from the web app (0.0 to 1.0)
 * into absolute pixel coordinates and moves the system cursor instantly.
 * 
 * @param {Object} data - Contains x and y percentages (e.g. {x: 0.5, y: 0.5} for screen center).
 */
export async function handleAbsoluteMove(data: { x: number, y: number }) {
  try {
    const width = await screen.width();
    const height = await screen.height();
    const targetX = Math.floor(data.x * width);
    const targetY = Math.floor(data.y * height);
    await mouse.setPosition(new Point(targetX, targetY));
  } catch (e) {
    console.error('absolute-move error', e);
  }
}

/**
 * Simulates a native double-click for the specified mouse button.
 * 
 * @param {Object} data - Specifies which button to double-click ('left' or 'right').
 */
export async function handleDoubleClick(data: { button: 'left' | 'right' }) {
  try {
    const btn = data.button === 'left' ? Button.LEFT : Button.RIGHT;
    await mouse.doubleClick(btn);
  } catch (e) {
    console.error('double-click error', e);
  }
}

let virtualMousePos: { x: number, y: number } | null = null;
let lastMoveTime = 0;

let isMoving = false;
let pendingDx = 0;
let pendingDy = 0;

/**
 * Handles continuous delta (dx, dy) trackpad movements from the mobile client.
 * Employs a buffering strategy to prevent event flooding and ensure buttery smooth movement.
 * 
 * @param {Object} data - Contains the pixel delta (dx, dy) to move the cursor.
 */
export async function handleMouseMove(data: any) {
  try {
    pendingDx += data.dx;
    pendingDy += data.dy;

    if (isMoving) return;
    isMoving = true;

    while (Math.abs(pendingDx) > 0 || Math.abs(pendingDy) > 0) {
      const now = Date.now();
      if (!virtualMousePos || now - lastMoveTime > 500) {
        const currentPos = await mouse.getPosition();
        virtualMousePos = { x: currentPos.x, y: currentPos.y };
      }
      
      const toMoveX = pendingDx;
      const toMoveY = pendingDy;
      pendingDx = 0;
      pendingDy = 0;

      virtualMousePos.x += toMoveX;
      virtualMousePos.y += toMoveY;
      lastMoveTime = now;

      const newPos = new Point(Math.round(virtualMousePos.x), Math.round(virtualMousePos.y));
      await mouse.setPosition(newPos);
    }
  } catch (e) {
    console.error('mouse-move error', e);
  } finally {
    isMoving = false;
  }
}

export async function handleMouseClick(data: any) {
  try {
    const btn = data.button === 'right' ? Button.RIGHT : data.button === 'middle' ? Button.MIDDLE : Button.LEFT;
    if (data.action === 'down') {
      await mouse.pressButton(btn);
    } else if (data.action === 'up') {
      await mouse.releaseButton(btn);
    } else {
      await mouse.click(btn);
    }
  } catch (e) {
    console.error('mouse-click error', e);
  }
}

export async function handleMouseDown(data: { button: 'left' | 'right' | 'middle' }) {
  try {
    const btn = data.button === 'right' ? Button.RIGHT : data.button === 'middle' ? Button.MIDDLE : Button.LEFT;
    await mouse.pressButton(btn);
  } catch (e) {
    console.error('mouse-down error', e);
  }
}

export async function handleMouseUp(data: { button: 'left' | 'right' | 'middle' }) {
  try {
    const btn = data.button === 'right' ? Button.RIGHT : data.button === 'middle' ? Button.MIDDLE : Button.LEFT;
    await mouse.releaseButton(btn);
  } catch (e) {
    console.error('mouse-up error', e);
  }
}

export async function handleMouseScroll(data: any) {
  try {
    if (data.direction === 'up') {
      await mouse.scrollUp(data.amount);
    } else {
      await mouse.scrollDown(data.amount);
    }
  } catch (e) {
    console.error('mouse-scroll error', e);
  }
}

const modifierMap: Record<string, Key> = {
  'control': Key.LeftControl,
  'alt': Key.LeftAlt,
  'shift': Key.LeftShift,
  'super': Key.LeftSuper,
  'escape': Key.Escape,
  'delete': Key.Delete
};

export async function handleKeyEvent(data: any) {
  try {
    const nutKey = modifierMap[data.key];
    
    if (data.action === 'down') {
      if (nutKey) {
        await keyboard.pressKey(nutKey);
      } else if (data.key === 'backspace') {
        await keyboard.pressKey(Key.Backspace);
      } else if (data.key === 'enter') {
        await keyboard.pressKey(Key.Enter);
      } else if (data.key.length === 1) {
        await keyboard.type(data.key);
      }
    } else if (data.action === 'up') {
      if (nutKey) {
        await keyboard.releaseKey(nutKey);
      } else if (data.key === 'backspace') {
        await keyboard.releaseKey(Key.Backspace);
      } else if (data.key === 'enter') {
        await keyboard.releaseKey(Key.Enter);
      }
    }
  } catch (e) {
    console.error('key-event error', e);
  }
}

export async function handleTypeText(data: { text: string }) {
  try {
    await keyboard.type(data.text);
  } catch (e) {
    console.error('type-text error', e);
  }
}

export async function handleSystemAction(data: { type: 'lock' | 'sleep' }) {
  try {
    if (data.type === 'lock') {
      exec('rundll32.exe user32.dll,LockWorkStation');
    } else if (data.type === 'sleep') {
      exec('rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
    }
  } catch (e) {
    console.error('system-action error', e);
  }
}

export async function handleUnlock(data: { password: string }) {
  try {
    // 1. Press Space to wake up the screen and dismiss the lock screen cover
    await keyboard.pressKey(Key.Space);
    await keyboard.releaseKey(Key.Space);
    
    // 2. Wait 1 second for the password field to appear and gain focus
    await new Promise(r => setTimeout(r, 1000));
    
    // 3. Type the password
    await keyboard.type(data.password);
    
    // 4. Press Enter to submit
    await keyboard.pressKey(Key.Enter);
    await keyboard.releaseKey(Key.Enter);
  } catch (e) {
    console.error('unlock error', e);
  }
}

export async function releaseAllModifiers() {
  try {
    await keyboard.releaseKey(
      Key.LeftControl, Key.RightControl,
      Key.LeftAlt, Key.RightAlt,
      Key.LeftShift, Key.RightShift,
      Key.LeftSuper, Key.RightSuper
    );
  } catch (e) {
    console.error('release-modifiers error', e);
  }
}

export async function handleShortcut(data: { keys: string[] }) {
  try {
    const nutKeys = data.keys.map(k => {
      if (k === 'super') return Key.LeftSuper;
      if (k === 'tab') return Key.Tab;
      if (k === 'alt') return Key.LeftAlt;
      return null;
    }).filter(k => k !== null) as Key[];
    
    if (nutKeys.length > 0) {
      await keyboard.pressKey(...nutKeys);
      await keyboard.releaseKey(...nutKeys.reverse());
    }
  } catch (e) {
    console.error('shortcut error', e);
  }
}
