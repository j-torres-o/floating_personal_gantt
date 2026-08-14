import { Project, Task } from '../../types/project';
import { formatDateISO, parseDateISO, diffDays } from '../services/dateUtils';

export interface MiniWidgetOptions {
  container: HTMLElement;
  project: Project;
  onExpand: () => void;
  onToggleGhost: () => void;
  onClose: () => void;
  onTaskStatusChange: (task: Task, newStatus: 'completed' | 'in_progress' | 'pending') => void;
}

export class MiniWidget {
  private container: HTMLElement;
  private project: Project;
  private onExpand: () => void;
  private onToggleGhost: () => void;
  private onClose: () => void;
  private onTaskStatusChange: (task: Task, newStatus: 'completed' | 'in_progress' | 'pending') => void;

  private activeIndex = 0;

  constructor(options: MiniWidgetOptions) {
    this.container = options.container;
    this.project = options.project;
    this.onExpand = options.onExpand;
    this.onToggleGhost = options.onToggleGhost;
    this.onClose = options.onClose;
    this.onTaskStatusChange = options.onTaskStatusChange;
  }

  public updateProject(project: Project) {
    this.project = project;
    this.render();
  }

  /**
   * Obtiene la lista de tareas activas para el día de hoy (o las tareas no finalizadas más urgentes)
   */
  public getTodayActiveTasks(): Task[] {
    const todayISO = formatDateISO(new Date());
    
    // Tareas que caen en el rango de hoy
    const currentTasks = this.project.tasks.filter(t => {
      return t.startDate <= todayISO && t.endDate >= todayISO && t.status !== 'completed';
    });

    if (currentTasks.length > 0) {
      return currentTasks;
    }

    // Si no hay tareas hoy, mostrar tareas pendientes futuras ordenadas por fecha de inicio
    const upcomingTasks = this.project.tasks
      .filter(t => t.status !== 'completed' && t.startDate > todayISO)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    return upcomingTasks.slice(0, 3);
  }

  public nextTask() {
    const tasks = this.getTodayActiveTasks();
    if (tasks.length > 0) {
      this.activeIndex = (this.activeIndex + 1) % tasks.length;
      this.render();
    }
  }

  public prevTask() {
    const tasks = this.getTodayActiveTasks();
    if (tasks.length > 0) {
      this.activeIndex = (this.activeIndex - 1 + tasks.length) % tasks.length;
      this.render();
    }
  }

  public render() {
    const activeTasks = this.getTodayActiveTasks();
    const total = activeTasks.length;
    const currentTask = total > 0 ? activeTasks[this.activeIndex % total] : null;

    let contentHtml = '';

    if (currentTask) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = parseDateISO(currentTask.endDate);
      const remaining = diffDays(today, endDate);
      const category = this.project.categories.find(c => c.id === currentTask.categoryId);
      const catColor = category?.color || '#38BDF8';

      let remainingText = '';
      if (remaining === 0) {
        remainingText = '⚡ ¡Vence hoy!';
      } else if (remaining === 1) {
        remainingText = '⏳ Vence mañana';
      } else if (remaining > 1) {
        remainingText = `📅 Restan ${remaining} días`;
      } else {
        remainingText = `⚠️ Vencida hace ${Math.abs(remaining)} día(s)`;
      }

      contentHtml = `
        <div class="mini-widget-task-info" style="border-left: 3px solid ${catColor}; padding-left: 8px; flex: 1; min-width: 0;">
          <div class="mini-widget-task-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${currentTask.title}">
            ${currentTask.title}
          </div>
          <div class="mini-widget-task-meta" style="display: flex; align-items: center; gap: 8px;">
            <span style="color: ${remaining < 0 ? '#EF4444' : 'var(--text-muted)'}; font-weight: ${remaining <= 0 ? '600' : '400'};">
              ${remainingText}
            </span>
            <span style="font-size: 10px; opacity: 0.6;">(${category?.name || 'General'})</span>
          </div>
        </div>
        <button class="btn-icon" id="btn-widget-complete-task" title="Marcar como completada" style="color: #10B981;">
          ✓
        </button>
      `;
    } else {
      contentHtml = `
        <div class="mini-widget-task-info" style="flex: 1; padding-left: 4px;">
          <div class="mini-widget-task-title" style="color: var(--text-muted);">✨ Sin tareas pendientes hoy</div>
          <div class="mini-widget-task-meta">Todo al día</div>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="mini-widget-container">
        <div class="mini-widget-carousel" style="display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden;">
          <span class="app-badge" style="cursor: default;">GANTT HUD</span>
          ${total > 1 ? `
            <div style="display: flex; align-items: center; gap: 2px; -webkit-app-region: no-drag;">
              <button class="btn-icon" id="btn-widget-prev" style="width: 22px; height: 22px; font-size: 13px;">‹</button>
              <span style="font-size: 11px; color: var(--text-dim); min-width: 22px; text-align: center;">
                ${(this.activeIndex % total) + 1}/${total}
              </span>
              <button class="btn-icon" id="btn-widget-next" style="width: 22px; height: 22px; font-size: 13px;">›</button>
            </div>
          ` : ''}
          ${contentHtml}
        </div>

        <div class="titlebar-actions" style="-webkit-app-region: no-drag;">
          <button class="btn-icon" id="btn-widget-ghost" title="Modo Fantasma (Click-Through)">👻</button>
          <button class="btn-icon" id="btn-widget-expand" title="Expandir Tablero Completo">⛶</button>
          <button class="btn-icon btn-close" id="btn-widget-close" title="Cerrar">✕</button>
        </div>
      </div>
    `;

    this.bindEvents(currentTask);
  }

  private bindEvents(currentTask: Task | null) {
    this.container.querySelector('#btn-widget-expand')?.addEventListener('click', () => this.onExpand());
    this.container.querySelector('#btn-widget-ghost')?.addEventListener('click', () => this.onToggleGhost());
    this.container.querySelector('#btn-widget-close')?.addEventListener('click', () => this.onClose());

    this.container.querySelector('#btn-widget-prev')?.addEventListener('click', () => this.prevTask());
    this.container.querySelector('#btn-widget-next')?.addEventListener('click', () => this.nextTask());

    if (currentTask) {
      this.container.querySelector('#btn-widget-complete-task')?.addEventListener('click', () => {
        this.onTaskStatusChange(currentTask, 'completed');
      });
    }
  }
}
