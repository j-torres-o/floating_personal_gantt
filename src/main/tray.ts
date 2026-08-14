import { Tray, Menu, nativeImage, BrowserWindow, app, NativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let tray: Tray | null = null;

/**
 * Obtiene el icono nativo oficial para la bandeja del sistema
 */
function createTrayIcon(): NativeImage {
  const possiblePaths = [
    path.join(__dirname, '../../build/icon.ico'),
    path.join(__dirname, '../../assets/icon.ico'),
    path.join(__dirname, '../assets/icon.ico'),
    path.join(process.resourcesPath, 'build/icon.ico'),
    path.join(process.resourcesPath, 'assets/icon.ico'),
    path.join(process.resourcesPath, 'app.asar.unpacked/build/icon.ico'),
    path.join(app.getAppPath(), 'build/icon.ico'),
    path.join(app.getAppPath(), 'assets/icon.ico')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const img = nativeImage.createFromPath(p);
      if (!img.isEmpty()) {
        return img;
      }
    }
  }

  // Fallback si no se encontrara el archivo físico
  const iconBase64 = 
    'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABmJLR0QA/wD/AP+gvaeTAAAAbElEQVRYhe3WMQqAMBBE0Sd4/6uF' +
    'hRW2EawExUK2zSvhj2Y2wI8iAgCgUu/k2/mS41b3k+P1pA4w51rGvfsd4Oz7zXG99fGvAEgJyI8gAUgBkgBSAeQBSAKQACQCSAC' +
    'SAKQCKABk5/eS8kMA/7oBeM/E/3u88xIAAAAASUVORK5CYII=';

  return nativeImage.createFromDataURL(`data:image/png;base64,${iconBase64}`);
}

export function setupSystemTray(mainWindow: BrowserWindow): Tray {
  if (tray) return tray;

  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('Floating Personal Gantt');

  const updateContextMenu = (isGhostMode = false) => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Floating Personal Gantt',
        enabled: false
      },
      { type: 'separator' },
      {
        label: isGhostMode ? '👻 Desactivar Modo Fantasma (Reactivar Clics)' : '👻 Modo Fantasma Activo',
        enabled: isGhostMode,
        click: () => {
          mainWindow.setIgnoreMouseEvents(false);
          mainWindow.webContents.send('ghost:restore');
          updateContextMenu(false);
        }
      },
      {
        label: mainWindow.isVisible() ? 'Ocultar Ventana' : 'Mostrar Ventana',
        click: () => {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
          updateContextMenu(isGhostMode);
        }
      },
      {
        label: 'Modo Mini-Barra',
        click: () => {
          mainWindow.webContents.send('window:toggleCompact');
        }
      },
      { type: 'separator' },
      {
        label: 'Salir',
        click: () => {
          app.quit();
        }
      }
    ]);

    tray?.setContextMenu(contextMenu);
  };

  updateContextMenu(false);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return tray;
}

export function updateTrayGhostState(isGhostMode: boolean, mainWindow: BrowserWindow) {
  if (tray) {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Floating Personal Gantt',
        enabled: false
      },
      { type: 'separator' },
      {
        label: isGhostMode ? '👻 Desactivar Modo Fantasma (Reactivar Clics)' : 'Ventana Interactiva',
        click: () => {
          mainWindow.setIgnoreMouseEvents(false);
          mainWindow.webContents.send('ghost:restore');
          updateTrayGhostState(false, mainWindow);
        }
      },
      {
        label: mainWindow.isVisible() ? 'Ocultar Ventana' : 'Mostrar Ventana',
        click: () => {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: 'Modo Mini-Barra',
        click: () => {
          mainWindow.webContents.send('window:toggleCompact');
        }
      },
      { type: 'separator' },
      {
        label: 'Salir',
        click: () => {
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);
  }
}
