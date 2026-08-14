import { describe, it, expect, beforeEach } from 'vitest';
import { MiniWidget } from '../src/renderer/components/MiniWidget';
import { Project, Task } from '../src/types/project';
import { formatDateISO } from '../src/renderer/services/dateUtils';

describe('MiniWidget', () => {
  let mockProject: Project;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    const todayISO = formatDateISO(new Date());
    const tomorrowISO = formatDateISO(new Date(Date.now() + 86400000));
    const nextWeekISO = formatDateISO(new Date(Date.now() + 7 * 86400000));

    mockProject = {
      id: 'proj-widget-test',
      name: 'Proyecto Widget',
      createdAt: '2026-08-14T00:00:00Z',
      categories: [
        { id: 'cat-1', name: 'Desarrollo', color: '#3B82F6' },
        { id: 'cat-2', name: 'Diseño', color: '#10B981' }
      ],
      tasks: [
        {
          id: 'tsk-active-1',
          title: 'Tarea Activa Hoy 1',
          categoryId: 'cat-1',
          startDate: todayISO,
          endDate: tomorrowISO,
          status: 'in_progress'
        },
        {
          id: 'tsk-active-2',
          title: 'Tarea Activa Hoy 2',
          categoryId: 'cat-2',
          startDate: todayISO,
          endDate: nextWeekISO,
          status: 'in_progress'
        },
        {
          id: 'tsk-completed',
          title: 'Tarea ya completada',
          categoryId: 'cat-1',
          startDate: todayISO,
          endDate: tomorrowISO,
          status: 'completed'
        }
      ]
    };
  });

  it('filtra correctamente las tareas activas para el día de hoy excluyendo completadas', () => {
    const widget = new MiniWidget({
      container,
      project: mockProject,
      onExpand: () => {},
      onToggleGhost: () => {},
      onClose: () => {},
      onTaskStatusChange: () => {}
    });

    const activeTasks = widget.getTodayActiveTasks();
    expect(activeTasks.length).toBe(2);
    expect(activeTasks[0].id).toBe('tsk-active-1');
    expect(activeTasks[1].id).toBe('tsk-active-2');
  });

  it('rota entre las tareas activas con el carrusel', () => {
    const widget = new MiniWidget({
      container,
      project: mockProject,
      onExpand: () => {},
      onToggleGhost: () => {},
      onClose: () => {},
      onTaskStatusChange: () => {}
    });

    widget.render();
    expect(container.innerHTML).toContain('Tarea Activa Hoy 1');

    widget.nextTask();
    expect(container.innerHTML).toContain('Tarea Activa Hoy 2');

    widget.prevTask();
    expect(container.innerHTML).toContain('Tarea Activa Hoy 1');
  });

  it('permite cambiar el estado de la tarea activa', () => {
    let changedTask: Task | null = null;
    let newStatusResult = '';

    const widget = new MiniWidget({
      container,
      project: mockProject,
      onExpand: () => {},
      onToggleGhost: () => {},
      onClose: () => {},
      onTaskStatusChange: (task, newStatus) => {
        changedTask = task;
        newStatusResult = newStatus;
      }
    });

    widget.render();

    const completeBtn = container.querySelector('#btn-widget-complete-task') as HTMLButtonElement;
    expect(completeBtn).not.toBeNull();
    completeBtn.click();

    expect(changedTask).not.toBeNull();
    expect(newStatusResult).toBe('completed');
  });
});
