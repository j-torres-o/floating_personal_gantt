import { AppConfig, DEFAULT_CONFIG } from '../../types/config';
import { ProjectsData, DEFAULT_PROJECTS_DATA } from '../../types/project';

const LOCAL_STORAGE_CONFIG_KEY = 'fpg_config_data';
const LOCAL_STORAGE_PROJECTS_KEY = 'fpg_projects_data';

export class StorageService {
  private configSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private projectsSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs = 300;

  /**
   * Carga la configuración del usuario desde el backend IPC o localStorage
   */
  public async loadConfig(): Promise<AppConfig> {
    try {
      if (window.electronAPI) {
        const loaded = await window.electronAPI.loadConfig();
        return { ...DEFAULT_CONFIG, ...loaded };
      }
      const raw = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
      if (raw) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      }
    } catch (err) {
      console.warn('Error al cargar config.json, usando valores por defecto:', err);
    }
    return DEFAULT_CONFIG;
  }

  /**
   * Guarda la configuración de la aplicación con debounce automático
   */
  public saveConfig(config: AppConfig, immediate = false): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.configSaveTimer) {
        clearTimeout(this.configSaveTimer);
      }

      const doSave = async () => {
        try {
          if (window.electronAPI) {
            await window.electronAPI.saveConfig(config);
          } else {
            localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));
          }
          resolve(true);
        } catch (err) {
          console.error('Error al guardar config.json:', err);
          resolve(false);
        }
      };

      if (immediate) {
        doSave();
      } else {
        this.configSaveTimer = setTimeout(doSave, this.debounceMs);
      }
    });
  }

  /**
   * Carga la colección de proyectos y tareas
   */
  public async loadProjects(): Promise<ProjectsData> {
    try {
      if (window.electronAPI) {
        const loaded = await window.electronAPI.loadProjects();
        return { ...DEFAULT_PROJECTS_DATA, ...loaded };
      }
      const raw = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
      if (raw) {
        return { ...DEFAULT_PROJECTS_DATA, ...JSON.parse(raw) };
      }
    } catch (err) {
      console.warn('Error al cargar projects.json, usando valores por defecto:', err);
    }
    return DEFAULT_PROJECTS_DATA;
  }

  /**
   * Guarda los proyectos y tareas con debounce automático
   */
  public saveProjects(data: ProjectsData, immediate = false): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.projectsSaveTimer) {
        clearTimeout(this.projectsSaveTimer);
      }

      const doSave = async () => {
        try {
          if (window.electronAPI) {
            await window.electronAPI.saveProjects(data);
          } else {
            localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(data));
          }
          resolve(true);
        } catch (err) {
          console.error('Error al guardar projects.json:', err);
          resolve(false);
        }
      };

      if (immediate) {
        doSave();
      } else {
        this.projectsSaveTimer = setTimeout(doSave, this.debounceMs);
      }
    });
  }
}

export const storageService = new StorageService();
