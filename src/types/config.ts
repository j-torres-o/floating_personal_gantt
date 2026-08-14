export type TimeScale = 'days' | 'weeks' | 'months';

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MiniBounds {
  x: number;
  y: number;
}

export interface AppConfig {
  version?: string;
  theme: 'dark' | 'light';
  opacity: number;
  alwaysOnTop?: boolean;
  timeScale: TimeScale;
  compactMode: boolean;
  highlightWeekends?: boolean;
  windowBounds: WindowBounds;
  miniBounds?: MiniBounds;
  taskListWidth?: number;
  launchOnStartup?: boolean;
  ghostOnInactivity: boolean;
  inactivityTimeoutSeconds: number;
  activeProjectId: string;
}

export const DEFAULT_CONFIG: AppConfig = {
  version: '0.5.1',
  theme: 'dark',
  opacity: 0.92,
  alwaysOnTop: false,
  timeScale: 'days',
  compactMode: false,
  highlightWeekends: true,
  taskListWidth: 220,
  launchOnStartup: false,
  windowBounds: {
    x: 100,
    y: 100,
    width: 1020,
    height: 580
  },
  ghostOnInactivity: false,
  inactivityTimeoutSeconds: 5,
  activeProjectId: 'proj-001'
};
