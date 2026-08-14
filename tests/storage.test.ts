import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageService } from '../src/renderer/services/storage';
import { DEFAULT_CONFIG } from '../src/types/config';
import { DEFAULT_PROJECTS_DATA } from '../src/types/project';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    service = new StorageService();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('retorna DEFAULT_CONFIG cuando no hay datos guardados', async () => {
    const config = await service.loadConfig();
    expect(config.version).toBe(DEFAULT_CONFIG.version);
    expect(config.theme).toBe(DEFAULT_CONFIG.theme);
    expect(config.opacity).toBe(DEFAULT_CONFIG.opacity);
  });

  it('guarda y carga la configuración en localStorage', async () => {
    const customConfig = {
      ...DEFAULT_CONFIG,
      theme: 'light' as const,
      opacity: 0.75,
      alwaysOnTop: false
    };

    await service.saveConfig(customConfig, true);
    const loaded = await service.loadConfig();

    expect(loaded.theme).toBe('light');
    expect(loaded.opacity).toBe(0.75);
    expect(loaded.alwaysOnTop).toBe(false);
  });

  it('retorna DEFAULT_PROJECTS_DATA cuando no hay proyectos guardados', async () => {
    const data = await service.loadProjects();
    expect(data.version).toBe(DEFAULT_PROJECTS_DATA.version);
    expect(data.projects.length).toBeGreaterThan(0);
    expect(data.projects[0].tasks.length).toBeGreaterThan(0);
  });

  it('guarda y carga proyectos personalizados', async () => {
    const customProjectsData = {
      version: '1.0',
      projects: [
        {
          id: 'proj-test',
          name: 'Proyecto de Prueba',
          createdAt: '2026-08-14T00:00:00Z',
          categories: [{ id: 'cat-test', name: 'General', color: '#FF0000' }],
          tasks: [
            {
              id: 'tsk-test-1',
              title: 'Tarea 1',
              categoryId: 'cat-test',
              startDate: '2026-08-10',
              endDate: '2026-08-15',
              status: 'pending' as const
            }
          ]
        }
      ]
    };

    await service.saveProjects(customProjectsData, true);
    const loaded = await service.loadProjects();

    expect(loaded.projects.length).toBe(1);
    expect(loaded.projects[0].name).toBe('Proyecto de Prueba');
    expect(loaded.projects[0].tasks[0].title).toBe('Tarea 1');
  });
});
