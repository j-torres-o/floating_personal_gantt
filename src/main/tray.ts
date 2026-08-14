import { Tray, Menu, nativeImage, BrowserWindow, app, NativeImage } from 'electron';

let tray: Tray | null = null;

/**
 * Genera un icono minimalista en memoria para la bandeja del sistema
 */
function createTrayIcon(): NativeImage {
  // Icono SVG renderizado en tamaño estándar para Windows Tray (16x16 / 32x32)
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill="#1E293B"/>
      <rect x="5" y="8" width="14" height="4" rx="2" fill="#38BDF8"/>
      <rect x="10" y="14" width="16" height="4" rx="2" fill="#34D399"/>
      <rect x="7" y="20" width="12" height="4" rx="2" fill="#FBBF24"/>
    </svg>
  `;
  return nativeImage.createFromBuffer(Buffer.from(svgIcon));
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
        label: 'Conmutar Modo Mini-Barra',
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
        label: 'Conmutar Modo Mini-Barra',
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
