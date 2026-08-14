import { app, BrowserWindow, ipcMain, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { setupSystemTray, updateTrayGhostState } from './tray';

let mainWindow: BrowserWindow | null = null;

// Rutas de almacenamiento local desacoplado
const userDataPath = path.join(app.getPath('appData'), 'floating-personal-gantt');
const configFilePath = path.join(userDataPath, 'config.json');
const projectsFilePath = path.join(userDataPath, 'projects.json');

// Asegurar existencia del directorio de datos
function ensureStorageDirectory() {
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
}

// Cargar o inicializar config.json
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

// Guardar config.json
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

// Cargar o inicializar projects.json
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

// Guardar projects.json
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
  const bounds = (initialConfig.windowBounds as { x?: number; y?: number; width?: number; height?: number }) || {};
  const isCompact = initialConfig.compactMode === true;

  const primaryDisplay = screen.getPrimaryDisplay();
  const defaultWidth = isCompact ? 420 : 960;
  const defaultHeight = isCompact ? 72 : 580;

  const defaultX = Math.round((primaryDisplay.workAreaSize.width - defaultWidth) / 2);
  const defaultY = Math.round((primaryDisplay.workAreaSize.height - defaultHeight) / 2);

  mainWindow = new BrowserWindow({
    x: typeof bounds.x === 'number' ? bounds.x : defaultX,
    y: typeof bounds.y === 'number' ? bounds.y : defaultY,
    width: typeof bounds.width === 'number' ? bounds.width : defaultWidth,
    height: typeof bounds.height === 'number' ? bounds.height : defaultHeight,
    minWidth: 320,
    minHeight: 60,
    frame: false,
    transparent: true,
    alwaysOnTop: initialConfig.alwaysOnTop !== false,
    resizable: true,
    hasShadow: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Cargar frontend (en desarrollo desde Vite dev server o archivo estático)
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Configurar System Tray
  setupSystemTray(mainWindow);

  // Guardar posición al mover o redimensionar
  mainWindow.on('moved', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const currentBounds = mainWindow.getBounds();
      const cfg = readConfigFile();
      cfg.windowBounds = currentBounds;
      writeConfigFile(cfg);
    }
  });

  mainWindow.on('resized', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const currentBounds = mainWindow.getBounds();
      const cfg = readConfigFile();
      cfg.windowBounds = currentBounds;
      writeConfigFile(cfg);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Configurar IPC Handlers
function setupIpcHandlers() {
  // Almacenamiento desacoplado
  ipcMain.handle('storage:loadConfig', () => readConfigFile());
  ipcMain.handle('storage:saveConfig', (_event, config) => writeConfigFile(config));
  ipcMain.handle('storage:loadProjects', () => readProjectsFile());
  ipcMain.handle('storage:saveProjects', (_event, data) => writeProjectsFile(data));

  // Ventana
  ipcMain.handle('window:getBounds', () => {
    return mainWindow ? mainWindow.getBounds() : { x: 0, y: 0, width: 960, height: 580 };
  });

  ipcMain.handle('window:setBounds', (_event, bounds) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setBounds(bounds, true);
    }
  });

  ipcMain.handle('window:setAlwaysOnTop', (_event, always) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(always, 'floating');
    }
  });

  ipcMain.handle('window:setOpacity', (_event, opacity) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setOpacity(Math.max(0.1, Math.min(1.0, opacity)));
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
      const bounds = mainWindow.getBounds();
      if (compact) {
        mainWindow.setSize(440, 74, true);
      } else {
        mainWindow.setSize(Math.max(bounds.width, 900), Math.max(bounds.height, 560), true);
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

  // Configuración de inicio con Windows
  ipcMain.handle('system:setLaunchOnStartup', (_event, enable) => {
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: process.execPath
    });
  });
}

// Inicialización de la aplicación
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
