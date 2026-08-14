import { describe, it, expect, vi } from 'vitest';
import { exportToJSON, importFromJSON } from '../src/renderer/services/exporter';
import { ProjectsData } from '../src/types/project';

describe('ExporterService', () => {
  it('exportToJSON genera una descarga mediante blob', () => {
    const mockData: ProjectsData = {
      version: '1.0',
      projects: [
        {
          id: 'proj-1',
          name: 'P1',
          createdAt: '2026-08-14T00:00:00Z',
          categories: [],
          tasks: []
        }
      ]
    };

    // Espiar creación de URL
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    exportToJSON(mockData, 'test.json');

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalled();
  });

  it('importFromJSON valida correctamente la estructura de proyectos', async () => {
    const validData: ProjectsData = {
      version: '1.0',
      projects: [
        {
          id: 'proj-valid',
          name: 'Proyecto Valido',
          createdAt: '2026-08-14T00:00:00Z',
          categories: [],
          tasks: []
        }
      ]
    };

    const file = new File([JSON.stringify(validData)], 'valid.json', { type: 'application/json' });
    const imported = await importFromJSON(file);

    expect(imported.version).toBe('1.0');
    expect(imported.projects.length).toBe(1);
    expect(imported.projects[0].name).toBe('Proyecto Valido');
  });

  it('importFromJSON rechaza archivos JSON con estructura inválida', async () => {
    const invalidData = { name: 'Sin array de proyectos' };
    const file = new File([JSON.stringify(invalidData)], 'invalid.json', { type: 'application/json' });

    await expect(importFromJSON(file)).rejects.toThrow('Formato de archivo inválido');
  });
});
