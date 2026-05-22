const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widget', {
  moveWindow: (dx, dy) => ipcRenderer.send('move-window', { x: dx, y: dy }),
  hideWindow: () => ipcRenderer.send('hide-window'),
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),
  toggleAlwaysOnTop: () => ipcRenderer.send('toggle-always-on-top'),
  onThemeChanged: (cb) => {
    ipcRenderer.on('theme-changed', (_, theme) => cb(theme));
  },
  onAlwaysOnTopChanged: (cb) => {
    ipcRenderer.on('always-on-top-changed', (_, val) => cb(val));
  },
});
