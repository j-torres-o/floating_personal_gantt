import { AppConfig, WindowBounds } from './config';
import { ProjectsData } from './project';

export interface ElectronAPI {
  // Almacenamiento desacoplado
  loadConfig: () => Promise<AppConfig>;
  saveConfig: (config: AppConfig) => Promise<boolean>;
  loadProjects: () => Promise<ProjectsData>;
  saveProjects: (data: ProjectsData) => Promise<boolean>;

  // Gestión de Ventana
  setWindowBounds: (bounds: Partial<WindowBounds>) => Promise<void>;
  getWindowBounds: () => Promise<WindowBounds>;
  setAlwaysOnTop: (always: boolean) => Promise<void>;
  setOpacity: (opacity: number) => Promise<void>;
  setIgnoreMouseEvents: (ignore: boolean, forward?: boolean) => Promise<void>;
  setCompactMode: (compact: boolean) => Promise<void>;
  minimizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;

  // Configuración del Sistema
  setLaunchOnStartup: (enable: boolean) => Promise<void>;

  // Eventos desde el Proceso Principal / System Tray
  onRestoreFromGhost: (callback: () => void) => () => void;
  onToggleCompact: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
