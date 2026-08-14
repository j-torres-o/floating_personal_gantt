import { contextBridge, ipcRenderer } from 'electron';
import { AppConfig, WindowBounds } from '../types/config';
import { ProjectsData } from '../types/project';

contextBridge.exposeInMainWorld('electronAPI', {
  // Almacenamiento desacoplado
  loadConfig: (): Promise<AppConfig> => ipcRenderer.invoke('storage:loadConfig'),
  saveConfig: (config: AppConfig): Promise<boolean> => ipcRenderer.invoke('storage:saveConfig', config),
  loadProjects: (): Promise<ProjectsData> => ipcRenderer.invoke('storage:loadProjects'),
  saveProjects: (data: ProjectsData): Promise<boolean> => ipcRenderer.invoke('storage:saveProjects', data),

  // Control de Ventana
  setWindowBounds: (bounds: Partial<WindowBounds>): Promise<void> => ipcRenderer.invoke('window:setBounds', bounds),
  getWindowBounds: (): Promise<WindowBounds> => ipcRenderer.invoke('window:getBounds'),
  setAlwaysOnTop: (always: boolean): Promise<void> => ipcRenderer.invoke('window:setAlwaysOnTop', always),
  setOpacity: (opacity: number): Promise<void> => ipcRenderer.invoke('window:setOpacity', opacity),
  setIgnoreMouseEvents: (ignore: boolean, forward = false): Promise<void> => ipcRenderer.invoke('window:setIgnoreMouseEvents', ignore, forward),
  setCompactMode: (compact: boolean): Promise<void> => ipcRenderer.invoke('window:setCompactMode', compact),
  minimizeWindow: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('window:close'),

  // Configuración del Sistema
  setLaunchOnStartup: (enable: boolean): Promise<void> => ipcRenderer.invoke('system:setLaunchOnStartup', enable),

  // Escuchar eventos desde el Proceso Principal (System Tray / Atajos)
  onRestoreFromGhost: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('ghost:restore', handler);
    return () => ipcRenderer.removeListener('ghost:restore', handler);
  },
  onToggleCompact: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('window:toggleCompact', handler);
    return () => ipcRenderer.removeListener('window:toggleCompact', handler);
  }
});
