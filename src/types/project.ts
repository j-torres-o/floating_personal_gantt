export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  title: string;
  categoryId: string;
  startDate: string; // ISO format YYYY-MM-DD
  endDate: string;   // ISO format YYYY-MM-DD
  status: TaskStatus;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  categories: Category[];
  tasks: Task[];
}

export interface ProjectsData {
  version: string;
  projects: Project[];
}

export const DEFAULT_PROJECTS_DATA: ProjectsData = {
  version: '1.0',
  projects: [
    {
      id: 'proj-01',
      name: 'Mi Primer Proyecto',
      createdAt: new Date().toISOString(),
      categories: [
        { id: 'cat-1', name: 'Desarrollo', color: '#3B82F6' },
        { id: 'cat-2', name: 'Diseño', color: '#10B981' },
        { id: 'cat-3', name: 'Planificación', color: '#F59E0B' },
        { id: 'cat-4', name: 'Revisión', color: '#EC4899' }
      ],
      tasks: [
        {
          id: 'tsk-01',
          title: 'Definición de Requisitos y Alcance',
          categoryId: 'cat-3',
          startDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
          status: 'completed'
        },
        {
          id: 'tsk-02',
          title: 'Diseño de Interfaz Glassmorphism',
          categoryId: 'cat-2',
          startDate: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
          status: 'in_progress'
        },
        {
          id: 'tsk-03',
          title: 'Desarrollo del Motor Gantt',
          categoryId: 'cat-1',
          startDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          status: 'pending'
        }
      ]
    }
  ]
};
