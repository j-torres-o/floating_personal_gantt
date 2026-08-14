import { describe, it, expect } from 'vitest';
import { addDays, diffDays, formatDateISO, parseDateISO } from '../src/renderer/services/dateUtils';
import { Task } from '../src/types/project';

describe('GanttInteractions', () => {
  it('calcula correctamente el desplazamiento horizontal de una tarea en el tiempo', () => {
    const startDate = parseDateISO('2026-08-10');
    const columnWidth = 48; // px por día
    const deltaPixels = 96; // 2 días hacia adelante

    const daysOffset = Math.round(deltaPixels / columnWidth);
    const newStartDate = addDays(startDate, daysOffset);

    expect(daysOffset).toBe(2);
    expect(formatDateISO(newStartDate)).toBe('2026-08-12');
  });

  it('calcula la nueva duración y fecha de fin al redimensionar el extremo derecho', () => {
    const taskStartDate = parseDateISO('2026-08-10');
    const columnWidth = 48;
    const initialWidthPx = 48 * 4 - 6; // 4 días de duración
    const resizeDeltaPx = 48 * 2;     // Extender 2 días más

    const finalWidthPx = initialWidthPx + resizeDeltaPx;
    const durationDays = Math.max(1, Math.round((finalWidthPx + 6) / columnWidth));
    const newEndDate = addDays(taskStartDate, durationDays - 1);

    expect(durationDays).toBe(6);
    expect(formatDateISO(newEndDate)).toBe('2026-08-15');
  });

  it('detecta tareas vencidas si la fecha de fin es anterior a hoy y no están completadas', () => {
    const today = parseDateISO('2026-08-14');

    const overdueTask: Task = {
      id: 'tsk-overdue',
      title: 'Tarea Retrasada',
      categoryId: 'cat-1',
      startDate: '2026-08-01',
      endDate: '2026-08-10',
      status: 'in_progress'
    };

    const completedTask: Task = {
      id: 'tsk-completed',
      title: 'Tarea Finalizada',
      categoryId: 'cat-1',
      startDate: '2026-08-01',
      endDate: '2026-08-10',
      status: 'completed'
    };

    const isTaskOverdue = (t: Task) => t.status !== 'completed' && parseDateISO(t.endDate) < today;

    expect(isTaskOverdue(overdueTask)).toBe(true);
    expect(isTaskOverdue(completedTask)).toBe(false);
  });

  it('mantiene la consistencia de fechas al desplazar la tarea completa', () => {
    const originalTask: Task = {
      id: 'tsk-move',
      title: 'Desarrollo Feature',
      categoryId: 'cat-dev',
      startDate: '2026-08-15',
      endDate: '2026-08-20',
      status: 'pending'
    };

    const originalDuration = diffDays(parseDateISO(originalTask.startDate), parseDateISO(originalTask.endDate));
    const shiftDays = 5;

    const shiftedTask: Task = {
      ...originalTask,
      startDate: formatDateISO(addDays(parseDateISO(originalTask.startDate), shiftDays)),
      endDate: formatDateISO(addDays(parseDateISO(originalTask.endDate), shiftDays))
    };

    const newDuration = diffDays(parseDateISO(shiftedTask.startDate), parseDateISO(shiftedTask.endDate));

    expect(shiftedTask.startDate).toBe('2026-08-20');
    expect(shiftedTask.endDate).toBe('2026-08-25');
    expect(newDuration).toBe(originalDuration);
  });
});
