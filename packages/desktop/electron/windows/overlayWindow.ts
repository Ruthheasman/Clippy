import { BrowserWindow, screen } from 'electron';
import path from 'path';

export function createOverlayWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;

  const win = new BrowserWindow({
    x: 0,
    y: 0,
    width,
    height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Click-through: mouse events pass to windows below
  win.setIgnoreMouseEvents(true);

  // Keep overlay above everything including fullscreen
  win.setAlwaysOnTop(true, 'screen-saver');

  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    win.loadURL('http://localhost:5173/overlay/index.html');
  } else {
    win.loadFile(path.join(__dirname, '../dist/overlay/index.html'));
  }

  return win;
}
