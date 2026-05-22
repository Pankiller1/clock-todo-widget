const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let win;
let tray;
let isQuitting = false;
let isAlwaysOnTop = true;
let currentTheme = 'dark'; // 'dark' | 'black' | 'white'

function createTrayIcon() {
  const size = 16;
  // BGRA format on Windows
  const buf = Buffer.alloc(size * size * 4, 0);

  function set(x, y, r, g, b, a) {
    const i = (y * size + x) * 4;
    buf[i] = b;     // B
    buf[i + 1] = g; // G
    buf[i + 2] = r; // R
    buf[i + 3] = a; // A
  }

  const cx = 8, cy = 8, outerR = 7.2, innerR = 5.8;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) - cx;
      const dy = (y + 0.5) - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // outer ring
      if (dist <= outerR && dist >= innerR) {
        set(x, y, 255, 255, 255, 255);
      }
      // hour hand pointing roughly 10 o'clock
      if (
        dist <= 4 &&
        Math.abs((dx * -0.5 + dy * 0.866)) < 0.85 &&
        (dx * 0.866 + dy * 0.5) > -1 &&
        (dx * 0.866 + dy * 0.5) < 4
      ) {
        set(x, y, 255, 255, 255, 255);
      }
      // minute hand pointing roughly 2 o'clock
      if (
        dist <= 5.5 &&
        Math.abs((dx * 0.866 - dy * -0.5)) < 0.75 &&
        (dx * 0.5 + dy * 0.866) > -1 &&
        (dx * 0.5 + dy * 0.866) < 5.5
      ) {
        set(x, y, 255, 255, 255, 255);
      }
      // center dot
      if (dist < 0.9) {
        set(x, y, 255, 255, 255, 255);
      }
    }
  }

  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

function createWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width: 320,
    height: 440,
    x: sw - 340,
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.setVisibleOnAllWorkspaces(true);
  win.loadFile('index.html');

  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });
}

function toggleWindow() {
  if (win.isVisible()) {
    win.hide();
  } else {
    win.show();
    win.focus();
  }
}

function setTheme(theme) {
  currentTheme = theme;
  if (win && win.webContents) {
    win.webContents.send('theme-changed', theme);
  }
}

function buildTrayMenu() {
  const autoLaunch = app.getLoginItemSettings().openAtLogin;

  return Menu.buildFromTemplate([
    {
      label: win?.isVisible() ? '隐藏窗口' : '显示窗口',
      click: toggleWindow,
    },
    { type: 'separator' },
    {
      label: '主题',
      submenu: [
        {
          label: '深蓝',
          type: 'radio',
          checked: currentTheme === 'dark',
          click: () => setTheme('dark'),
        },
        {
          label: '纯黑',
          type: 'radio',
          checked: currentTheme === 'black',
          click: () => setTheme('black'),
        },
        {
          label: '纯白',
          type: 'radio',
          checked: currentTheme === 'white',
          click: () => setTheme('white'),
        },
      ],
    },
    { type: 'separator' },
    {
      label: '窗口置顶',
      type: 'checkbox',
      checked: isAlwaysOnTop,
      click: (item) => {
        isAlwaysOnTop = item.checked;
        win.setAlwaysOnTop(isAlwaysOnTop);
        win.webContents.send('always-on-top-changed', isAlwaysOnTop);
      },
    },
    { type: 'separator' },
    {
      label: '开机自启',
      type: 'checkbox',
      checked: autoLaunch,
      click: (item) => {
        app.setLoginItemSettings({ openAtLogin: item.checked });
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function setupTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('时钟 & 待办');
  tray.setContextMenu(buildTrayMenu());

  tray.on('click', toggleWindow);

  tray.on('right-click', () => {
    tray.setContextMenu(buildTrayMenu());
  });
}

app.whenReady().then(() => {
  createWindow();
  setupTray();
});

app.on('before-quit', () => {
  isQuitting = true;
});

ipcMain.on('move-window', (_, { x, y }) => {
  const [wx, wy] = win.getPosition();
  win.setPosition(wx + x, wy + y);
});

ipcMain.on('hide-window', () => win.hide());

ipcMain.on('set-theme', (_, theme) => {
  currentTheme = theme;
});

ipcMain.on('toggle-always-on-top', () => {
  isAlwaysOnTop = !isAlwaysOnTop;
  win.setAlwaysOnTop(isAlwaysOnTop);
  win.webContents.send('always-on-top-changed', isAlwaysOnTop);
});
