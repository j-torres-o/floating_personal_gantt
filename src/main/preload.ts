import { contextBridge, ipcRenderer } from 'electron';
import type { AppConfig, WindowBounds } from '../types/config';
import type { ProjectsData } from '../types/project';
import type { UpdateInfoResult } from '../types/electron';

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

  // Configuración del Sistema y Auto-Inicio
  setLaunchOnStartup: (enable: boolean): Promise<void> => ipcRenderer.invoke('system:setLaunchOnStartup', enable),
  getLaunchOnStartup: (): Promise<boolean> => ipcRenderer.invoke('system:getLaunchOnStartup'),

  // Auto-Updater
  checkForUpdates: (): Promise<UpdateInfoResult> => ipcRenderer.invoke('updater:checkForUpdates'),
  downloadAndInstallUpdate: (downloadUrl: string, assetName: string): Promise<boolean> => 
    ipcRenderer.invoke('updater:downloadAndInstall', downloadUrl, assetName),
  onUpdateDownloadProgress: (callback: (percent: number) => void) => {
    const handler = (_event: any, percent: number) => callback(percent);
    ipcRenderer.on('updater:downloadProgress', handler);
    return () => ipcRenderer.removeListener('updater:downloadProgress', handler);
  },

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
