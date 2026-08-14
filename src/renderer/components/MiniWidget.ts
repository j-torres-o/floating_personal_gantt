import { Project, Task } from '../../types/project';
import { formatDateISO, parseDateISO, diffDays } from '../services/dateUtils';

export interface MiniWidgetOptions {
  container: HTMLElement;
  project: Project;
  allProjects: Project[];
  onSelectProject: (projectId: string) => void;
  onExpand: () => void;
  onToggleGhost: () => void;
  onClose: () => void;
  onTaskStatusChange: (task: Task, newStatus: 'completed' | 'in_progress' | 'pending') => void;
}

export class MiniWidget {
  private container: HTMLElement;
  private project: Project;
  private allProjects: Project[];
  private onSelectProject: (projectId: string) => void;
  private onExpand: () => void;
  private onToggleGhost: () => void;
  private onClose: () => void;
  private onTaskStatusChange: (task: Task, newStatus: 'completed' | 'in_progress' | 'pending') => void;

  private activeIndex = 0;
  private isProjectMenuOpen = false;

  constructor(options: MiniWidgetOptions) {
    this.container = options.container;
    this.project = options.project;
    this.allProjects = options.allProjects;
    this.onSelectProject = options.onSelectProject;
    this.onExpand = options.onExpand;
    this.onToggleGhost = options.onToggleGhost;
    this.onClose = options.onClose;
    this.onTaskStatusChange = options.onTaskStatusChange;
  }

  public updateProject(project: Project, allProjects: Project[]) {
    this.project = project;
    this.allProjects = allProjects;
    this.render();
  }

  /**
   * Obtiene EXCLUSIVAMENTE actividades NO finalizadas (pending o in_progress)
   */
  public getTodayActiveTasks(): Task[] {
    const todayISO = formatDateISO(new Date());
    
    // Filtrar estrictamente excluyendo cualquier actividad completada
    const uncompletedTasks = this.project.tasks.filter(t => t.status !== 'completed');

    // 1. Actividades que caen en el día de hoy
    const currentTasks = uncompletedTasks.filter(t => {
      return t.startDate <= todayISO && t.endDate >= todayISO;
    });

    currentTasks.sort((a, b) => a.endDate.localeCompare(b.endDate));

    if (currentTasks.length > 0) {
      return currentTasks;
    }

    // 2. Si no hay activas hoy, mostrar actividades pendientes futuras ordenadas por fecha
    const upcomingTasks = uncompletedTasks.sort((a, b) => a.startDate.localeCompare(b.startDate));
    return upcomingTasks;
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
      const category = currentTask.categoryId ? this.project.categories.find(c => c.id === currentTask.categoryId) : undefined;
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

      // Determinar icono, estilo y acción según la etapa actual
      const isPending = currentTask.status === 'pending';
      const actionIcon = isPending ? '▶' : '✓';
      const actionTooltip = isPending ? 'Iniciar Actividad (Cambiar a En Curso)' : 'Completar Actividad (Marcar como Finalizada)';
      const actionBg = isPending ? 'rgba(56,189,248,0.2)' : 'rgba(16,185,129,0.2)';
      const actionColor = isPending ? '#38BDF8' : '#10B981';
      const actionBorder = isPending ? 'rgba(56,189,248,0.4)' : 'rgba(16,185,129,0.4)';

      contentHtml = `
        <div class="mini-widget-task-info" style="border-left: 3px solid ${catColor}; padding-left: 8px; flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;">
          <div class="mini-widget-task-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; font-weight: 600; color: var(--text-main);" title="${currentTask.title}">
            ${currentTask.title}
          </div>
          <div class="mini-widget-task-meta" style="display: flex; align-items: center; gap: 8px; font-size: 11px; margin-top: 2px;">
            <span style="color: ${remaining < 0 ? '#EF4444' : 'var(--text-muted)'}; font-weight: ${remaining <= 0 ? '600' : '400'};">
              ${remainingText}
            </span>
            <span style="opacity: 0.6;">(${category?.name || 'General'})</span>
          </div>
        </div>
        <button class="btn-icon" id="btn-widget-action-task" title="${actionTooltip}" style="-webkit-app-region: no-drag !important; pointer-events: auto !important; color: ${actionColor}; font-size: 14px; font-weight: 700; width: 30px; height: 30px; background: ${actionBg}; border-radius: 6px; border: 1px solid ${actionBorder}; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease;">
          ${actionIcon}
        </button>
      `;
    } else {
      contentHtml = `
        <div class="mini-widget-task-info" style="flex: 1; padding-left: 6px; display: flex; flex-direction: column; justify-content: center;">
          <div class="mini-widget-task-title" style="color: var(--text-muted); font-size: 13px;">✨ No hay actividades programadas</div>
          <div class="mini-widget-task-meta" style="font-size: 11px;">Todo al día</div>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="mini-widget-container" style="padding: 6px 10px; height: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; gap: 8px; -webkit-app-region: drag;">
        <!-- Columna Izquierda: Selector de Proyecto arriba + Carrusel abajo -->
        <div style="display: flex; flex-direction: column; gap: 3px; width: 115px; min-width: 115px; -webkit-app-region: no-drag; position: relative;">
          <button class="btn-secondary" id="btn-mini-project-name" style="font-size: 10px; font-weight: 600; padding: 2px 6px; height: 20px; border-radius: 4px; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; background: rgba(255,255,255,0.06); cursor: pointer;">
            ${this.project.name} ▾
          </button>
          
          <div id="mini-project-dropdown" style="display: ${this.isProjectMenuOpen ? 'flex' : 'none'}; position: absolute; top: 24px; left: 0; background: var(--bg-panel); border: 1px solid var(--border-glass-bright); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); z-index: 1000; min-width: 150px; flex-direction: column; padding: 4px; gap: 2px;">
            ${this.allProjects.map(p => `
              <div class="menu-item" data-project-id="${p.id}" style="padding: 6px 10px; font-size: 12px; border-radius: 4px; cursor: pointer; color: ${p.id === this.project.id ? 'var(--accent-primary)' : 'var(--text-main)'}; font-weight: ${p.id === this.project.id ? '600' : '400'};">
                ${p.name}
              </div>
            `).join('')}
          </div>

          ${total > 1 ? `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 2px; width: 100%;">
              <button class="btn-icon" id="btn-widget-prev" style="width: 20px; height: 18px; font-size: 12px; cursor: pointer;">‹</button>
              <span style="font-size: 10px; color: var(--text-dim); font-weight: 500;">
                ${(this.activeIndex % total) + 1}/${total}
              </span>
              <button class="btn-icon" id="btn-widget-next" style="width: 20px; height: 18px; font-size: 12px; cursor: pointer;">›</button>
            </div>
          ` : '<div style="height: 18px;"></div>'}
        </div>

        <!-- Columna Central: Info de Actividad y botón de Acción -->
        <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; -webkit-app-region: no-drag;">
          ${contentHtml}
        </div>

        <!-- Columna Derecha: Acciones de Ventana -->
        <div class="titlebar-actions" style="-webkit-app-region: no-drag; display: flex; align-items: center; gap: 4px;">
          <button class="btn-icon" id="btn-widget-ghost" title="Modo Fantasma (Click-Through)">👻</button>
          <button class="btn-icon" id="btn-widget-expand" title="Expandir Tablero Completo">⛶</button>
          <button class="btn-icon btn-close" id="btn-widget-close" title="Cerrar">✕</button>
        </div>
      </div>
    `;

    this.bindCardEvents(currentTask);
  }

  private bindCardEvents(currentTask: Task | null) {
    this.container.querySelector('#btn-widget-expand')?.addEventListener('click', () => this.onExpand());
    this.container.querySelector('#btn-widget-ghost')?.addEventListener('click', () => this.onToggleGhost());
    this.container.querySelector('#btn-widget-close')?.addEventListener('click', () => this.onClose());

    this.container.querySelector('#btn-mini-project-name')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isProjectMenuOpen = !this.isProjectMenuOpen;
      this.render();
    });

    const projectItems = this.container.querySelectorAll('#mini-project-dropdown .menu-item');
    projectItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const projId = item.getAttribute('data-project-id');
        if (projId) {
          this.isProjectMenuOpen = false;
          this.onSelectProject(projId);
        }
      });
    });

    this.container.querySelector('#btn-widget-prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.prevTask();
    });

    this.container.querySelector('#btn-widget-next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.nextTask();
    });

    if (currentTask) {
      const actionBtn = this.container.querySelector('#btn-widget-action-task');
      actionBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const nextStatus = currentTask.status === 'pending' ? 'in_progress' : 'completed';
        this.onTaskStatusChange(currentTask, nextStatus);
      });
    }
  }
}
