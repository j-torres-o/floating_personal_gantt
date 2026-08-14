import { describe, it, expect, beforeEach } from 'vitest';
import { MiniWidget } from '../src/renderer/components/MiniWidget';
import { Project, Task } from '../src/types/project';
import { formatDateISO } from '../src/renderer/services/dateUtils';

describe('MiniWidget', () => {
  let mockProject: Project;
  let allProjects: Project[];
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
          title: 'Actividad Activa Hoy 1',
          categoryId: 'cat-1',
          startDate: todayISO,
          endDate: tomorrowISO,
          status: 'in_progress'
        },
        {
          id: 'tsk-active-2',
          title: 'Actividad Activa Hoy 2',
          categoryId: 'cat-2',
          startDate: todayISO,
          endDate: nextWeekISO,
          status: 'pending'
        },
        {
          id: 'tsk-completed',
          title: 'Actividad ya completada',
          categoryId: 'cat-1',
          startDate: todayISO,
          endDate: tomorrowISO,
          status: 'completed'
        }
      ]
    };

    allProjects = [mockProject];
  });

  it('filtra estrictamente solo actividades pendientes y en curso ordenadas', () => {
    const widget = new MiniWidget({
      container,
      project: mockProject,
      allProjects,
      onSelectProject: () => {},
      onExpand: () => {},
      onToggleGhost: () => {},
      onClose: () => {},
      onTaskStatusChange: () => {}
    });

    const activeTasks = widget.getTodayActiveTasks();
    expect(activeTasks.length).toBe(2);
    expect(activeTasks.find(t => t.id === 'tsk-completed')).toBeUndefined();
  });

  it('permite transicionar actividad de in_progress a completed con icono ✓', () => {
    let changedTask: Task | null = null;
    let newStatusResult = '';

    const widget = new MiniWidget({
      container,
      project: mockProject,
      allProjects,
      onSelectProject: () => {},
      onExpand: () => {},
      onToggleGhost: () => {},
      onClose: () => {},
      onTaskStatusChange: (task, newStatus) => {
        changedTask = task;
        newStatusResult = newStatus;
      }
    });

    widget.render();

    const actionBtn = container.querySelector('#btn-widget-action-task') as HTMLButtonElement;
    expect(actionBtn).not.toBeNull();
    expect(actionBtn.textContent?.trim()).toBe('✓');
    actionBtn.click();

    expect(changedTask).not.toBeNull();
    expect(newStatusResult).toBe('completed');
  });

  it('permite transicionar actividad de pending a in_progress con icono ▶', () => {
    let changedTask: Task | null = null;
    let newStatusResult = '';

    const widget = new MiniWidget({
      container,
      project: mockProject,
      allProjects,
      onSelectProject: () => {},
      onExpand: () => {},
      onToggleGhost: () => {},
      onClose: () => {},
      onTaskStatusChange: (task, newStatus) => {
        changedTask = task;
        newStatusResult = newStatus;
      }
    });

    widget.render();
    widget.nextTask();

    const actionBtn = container.querySelector('#btn-widget-action-task') as HTMLButtonElement;
    expect(actionBtn).not.toBeNull();
    expect(actionBtn.textContent?.trim()).toBe('▶');
    actionBtn.click();

    expect(changedTask).not.toBeNull();
    expect(newStatusResult).toBe('in_progress');
  });
});
