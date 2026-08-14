export type ThemeMode = 'dark' | 'light';
export type TimeScale = 'days' | 'weeks' | 'months';

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AppConfig {
  version: string;
  activeProjectId: string;
  theme: ThemeMode;
  opacity: number;
  alwaysOnTop: boolean;
  launchOnStartup: boolean;
  ghostOnInactivity: boolean;
  inactivityTimeoutSeconds: number;
  highlightWeekends: boolean;
  timeScale: TimeScale;
  compactMode: boolean;
  windowBounds: WindowBounds;
}

export const DEFAULT_CONFIG: AppConfig = {
  version: '0.5.0',
  activeProjectId: 'proj-01',
  theme: 'dark',
  opacity: 0.92,
  alwaysOnTop: true,
  launchOnStartup: false,
  ghostOnInactivity: false,
  inactivityTimeoutSeconds: 5,
  highlightWeekends: true,
  timeScale: 'days',
  compactMode: false,
  windowBounds: {
    x: 100,
    y: 80,
    width: 960,
    height: 580
  }
};
