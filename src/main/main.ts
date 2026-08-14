import { app, BrowserWindow, ipcMain, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { setupSystemTray, updateTrayGhostState } from './tray';
import { checkForAppUpdates, downloadAndInstallUpdate } from './autoUpdater';

let mainWindow: BrowserWindow | null = null;

// Rutas de almacenamiento local desacoplado
const userDataPath = path.join(app.getPath('appData'), 'floating-personal-gantt');
const configFilePath = path.join(userDataPath, 'config.json');
const projectsFilePath = path.join(userDataPath, 'projects.json');

function ensureStorageDirectory() {
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
}

function readConfigFile(): Record<string, unknown> {
  try {
    ensureStorageDirectory();
    if (fs.existsSync(configFilePath)) {
      const data = fs.readFileSync(configFilePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error al leer config.json:', err);
  }
  return {};
}

function writeConfigFile(data: unknown): boolean {
  try {
    ensureStorageDirectory();
    fs.writeFileSync(configFilePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error al escribir config.json:', err);
    return false;
  }
}

function readProjectsFile(): Record<string, unknown> {
  try {
    ensureStorageDirectory();
    if (fs.existsSync(projectsFilePath)) {
      const data = fs.readFileSync(projectsFilePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error al leer projects.json:', err);
  }
  return {};
}

function writeProjectsFile(data: unknown): boolean {
  try {
    ensureStorageDirectory();
    fs.writeFileSync(projectsFilePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error al escribir projects.json:', err);
    return false;
  }
}

function createWindow() {
  const initialConfig = readConfigFile();
  const isCompact = initialConfig.compactMode === true;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const defaultNormalWidth = 1020;
  const defaultNormalHeight = 580;
  const defaultNormalX = Math.round((screenWidth - defaultNormalWidth) / 2);
  const defaultNormalY = Math.round((screenHeight - defaultNormalHeight) / 2);

  const defaultMiniWidth = 560;
  const defaultMiniHeight = 85;
  const defaultMiniX = Math.round((screenWidth - defaultMiniWidth) / 2);
  const defaultMiniY = Math.round(screenHeight - defaultMiniHeight - 40);

  const windowBounds = (initialConfig.windowBounds as { x?: number; y?: number; width?: number; height?: number }) || {};
  const miniBounds = (initialConfig.miniBounds as { x?: number; y?: number }) || {};

  const currentX = isCompact 
    ? (typeof miniBounds.x === 'number' ? miniBounds.x : defaultMiniX)
    : (typeof windowBounds.x === 'number' ? windowBounds.x : defaultNormalX);

  const currentY = isCompact 
    ? (typeof miniBounds.y === 'number' ? miniBounds.y : defaultMiniY)
    : (typeof windowBounds.y === 'number' ? windowBounds.y : defaultNormalY);

  const currentW = isCompact ? defaultMiniWidth : (typeof windowBounds.width === 'number' ? windowBounds.width : defaultNormalWidth);
  const currentH = isCompact ? defaultMiniHeight : (typeof windowBounds.height === 'number' ? windowBounds.height : defaultNormalHeight);

  mainWindow = new BrowserWindow({
    x: currentX,
    y: currentY,
    width: currentW,
    height: currentH,
    minWidth: isCompact ? defaultMiniWidth : 960,
    minHeight: isCompact ? defaultMiniHeight : 480,
    maxWidth: isCompact ? defaultMiniWidth : undefined,
    maxHeight: isCompact ? defaultMiniHeight : undefined,
    frame: false,
    transparent: true,
    thickFrame: false,
    alwaysOnTop: isCompact,
    resizable: !isCompact,
    maximizable: !isCompact,
    hasShadow: true,
    skipTaskbar: false,
    opacity: isCompact ? Math.max(0.05, Math.min(1.0, (initialConfig.opacity as number) || 0.92)) : 1.0,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.on('will-resize', (e) => {
    const cfg = readConfigFile();
    if (cfg.compactMode === true) {
      e.preventDefault();
    }
  });

  mainWindow.on('resize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const cfg = readConfigFile();
      if (cfg.compactMode === true) {
        const [currentW, currentH] = mainWindow.getSize();
        if (currentW !== 560 || currentH !== 85) {
          mainWindow.setContentSize(560, 85, false);
        }
      }
    }
  });

  mainWindow.on('moved', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const currentBounds = mainWindow.getBounds();
      const cfg = readConfigFile();
      if (cfg.compactMode === true) {
        cfg.miniBounds = { x: currentBounds.x, y: currentBounds.y };
      } else {
        cfg.windowBounds = currentBounds;
      }
      writeConfigFile(cfg);
    }
  });

  mainWindow.on('resized', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const cfg = readConfigFile();
      if (cfg.compactMode !== true) {
        cfg.windowBounds = mainWindow.getBounds();
        writeConfigFile(cfg);
      }
    }
  });

  // Cargar frontend
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = fs.existsSync(path.join(__dirname, '../../dist/index.html'))
      ? path.join(__dirname, '../../dist/index.html')
      : path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  setupSystemTray(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIpcHandlers() {
  ipcMain.handle('storage:loadConfig', () => readConfigFile());
  ipcMain.handle('storage:saveConfig', (_event, config) => writeConfigFile(config));
  ipcMain.handle('storage:loadProjects', () => readProjectsFile());
  ipcMain.handle('storage:saveProjects', (_event, data) => writeProjectsFile(data));

  ipcMain.handle('window:getBounds', () => {
    return mainWindow ? mainWindow.getBounds() : { x: 0, y: 0, width: 1020, height: 580 };
  });

  ipcMain.handle('window:setBounds', (_event, bounds) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setBounds(bounds, true);
    }
  });

  ipcMain.handle('window:setAlwaysOnTop', (_event, always) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const cfg = readConfigFile();
      if (cfg.compactMode) {
        mainWindow.setAlwaysOnTop(always, 'floating');
      } else {
        mainWindow.setAlwaysOnTop(false);
      }
    }
  });

  ipcMain.handle('window:setOpacity', (_event, opacity) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const cfg = readConfigFile();
      if (cfg.compactMode) {
        mainWindow.setOpacity(Math.max(0.05, Math.min(1.0, opacity)));
      } else {
        mainWindow.setOpacity(1.0);
      }
    }
  });

  ipcMain.handle('window:setIgnoreMouseEvents', (_event, ignore, forward = false) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setIgnoreMouseEvents(ignore, { forward });
      updateTrayGhostState(ignore, mainWindow);
    }
  });

  ipcMain.handle('window:setCompactMode', (_event, compact) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const cfg = readConfigFile();
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

      if (compact) {
        const normalBounds = mainWindow.getBounds();
        cfg.windowBounds = normalBounds;
        writeConfigFile(cfg);

        const miniBounds = (cfg.miniBounds as { x?: number; y?: number }) || {};
        const targetX = typeof miniBounds.x === 'number' ? miniBounds.x : Math.round((screenWidth - 560) / 2);
        const targetY = typeof miniBounds.y === 'number' ? miniBounds.y : Math.round(screenHeight - 85 - 40);

        mainWindow.setResizable(false);
        mainWindow.setMaximizable(false);
        mainWindow.setAlwaysOnTop(true, 'floating');
        mainWindow.setMinimumSize(560, 85);
        mainWindow.setMaximumSize(560, 85);
        mainWindow.setBounds({ x: targetX, y: targetY, width: 560, height: 85 });
        mainWindow.setContentSize(560, 85, false);

        const currentOpacity = typeof cfg.opacity === 'number' ? cfg.opacity : 0.92;
        mainWindow.setOpacity(Math.max(0.05, Math.min(1.0, currentOpacity)));
      } else {
        const currentMiniBounds = mainWindow.getBounds();
        cfg.miniBounds = { x: currentMiniBounds.x, y: currentMiniBounds.y };
        writeConfigFile(cfg);

        const windowBounds = (cfg.windowBounds as { x?: number; y?: number; width?: number; height?: number }) || {};
        const targetW = typeof windowBounds.width === 'number' ? windowBounds.width : 1020;
        const targetH = typeof windowBounds.height === 'number' ? windowBounds.height : 580;
        const targetX = typeof windowBounds.x === 'number' ? windowBounds.x : Math.round((screenWidth - targetW) / 2);
        const targetY = typeof windowBounds.y === 'number' ? windowBounds.y : Math.round((screenHeight - targetH) / 2);

        mainWindow.setAlwaysOnTop(false);
        mainWindow.setMinimumSize(960, 480);
        mainWindow.setMaximumSize(3840, 2160);
        mainWindow.setResizable(true);
        mainWindow.setMaximizable(true);
        mainWindow.setBounds({ x: targetX, y: targetY, width: targetW, height: targetH });
        mainWindow.setOpacity(1.0);
      }
    }
  });

  ipcMain.handle('window:minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
  });

  // Auto-Inicio al arrancar Windows
  ipcMain.handle('system:setLaunchOnStartup', (_event, enable: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: process.execPath
    });
  });

  ipcMain.handle('system:getLaunchOnStartup', () => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  });

  // Auto-Updater con GitHub Releases
  ipcMain.handle('updater:checkForUpdates', async () => {
    return await checkForAppUpdates();
  });

  ipcMain.handle('updater:downloadAndInstall', async (_event, downloadUrl: string, assetName: string) => {
    return await downloadAndInstallUpdate(downloadUrl, assetName, (percent) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('updater:downloadProgress', percent);
      }
    });
  });
}

app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
