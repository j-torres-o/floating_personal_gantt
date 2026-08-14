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
   * Obtiene TODAS las actividades NO finalizadas (pending o in_progress),
   * priorizando las que están en curso o caen en el día de hoy, y luego las futuras/vencidas.
   */
  public getTodayActiveTasks(): Task[] {
    const todayISO = formatDateISO(new Date());
    
    // Filtrar estrictamente excluyendo cualquier actividad completada
    const uncompletedTasks = (this.project.tasks || []).filter(t => t.status !== 'completed');

    if (uncompletedTasks.length === 0) {
      return [];
    }

    // Ordenar con prioridad:
    // 1. En curso ('in_progress')
    // 2. Activas hoy (startDate <= hoy <= endDate)
    // 3. Próximas pendientes ordenadas por fecha de inicio
    return uncompletedTasks.sort((a, b) => {
      const aIsToday = a.startDate <= todayISO && a.endDate >= todayISO;
      const bIsToday = b.startDate <= todayISO && b.endDate >= todayISO;

      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
      if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;

      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;

      return a.startDate.localeCompare(b.startDate);
    });
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
    
    if (this.activeIndex >= total) {
      this.activeIndex = 0;
    }

    const currentTask = total > 0 ? activeTasks[this.activeIndex] : null;

    let contentHtml = '';

    if (currentTask) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = parseDateISO(currentTask.endDate);
      const remaining = diffDays(today, endDate);
      
      // Buscar grupo al que pertenece la actividad
      const group = currentTask.groupId ? (this.project.groups || []).find(g => g.id === currentTask.groupId) : undefined;
      const groupColor = group?.color || '#38BDF8';

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

      const isPending = currentTask.status === 'pending';
      const actionIcon = isPending ? '▶' : '✓';
      const actionTooltip = isPending ? 'Iniciar Actividad (Cambiar a En Curso)' : 'Completar Actividad (Marcar como Finalizada)';
      const actionBg = isPending ? 'rgba(56,189,248,0.2)' : 'rgba(16,185,129,0.2)';
      const actionColor = isPending ? '#38BDF8' : '#10B981';
      const actionBorder = isPending ? 'rgba(56,189,248,0.4)' : 'rgba(16,185,129,0.4)';

      contentHtml = `
        <div class="mini-widget-task-info" id="mini-task-card-body" title="Doble clic para expandir al tablero completo" style="border-left: 3px solid ${groupColor}; padding-left: 8px; flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; cursor: pointer; user-select: none;">
          <div class="mini-widget-task-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; font-weight: 600; color: var(--text-main);">
            ${currentTask.title}
          </div>
          <div class="mini-widget-task-meta" style="display: flex; align-items: center; gap: 8px; font-size: 11px; margin-top: 2px;">
            <span style="color: ${remaining < 0 ? '#EF4444' : 'var(--text-muted)'}; font-weight: ${remaining <= 0 ? '600' : '400'};">
              ${remainingText}
            </span>
            ${group ? `<span style="color: ${groupColor}; font-weight: 500; font-size: 10px;">◈ ${group.name}</span>` : ''}
          </div>
        </div>
        <button class="btn-icon" id="btn-widget-action-task" title="${actionTooltip}" style="-webkit-app-region: no-drag !important; pointer-events: auto !important; color: ${actionColor}; font-size: 14px; font-weight: 700; width: 30px; height: 30px; background: ${actionBg}; border-radius: 6px; border: 1px solid ${actionBorder}; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease;">
          ${actionIcon}
        </button>
      `;
    } else {
      contentHtml = `
        <div class="mini-widget-task-info" id="mini-task-card-body" title="Doble clic para expandir al tablero completo" style="flex: 1; padding-left: 6px; display: flex; flex-direction: column; justify-content: center; cursor: pointer; user-select: none;">
          <div class="mini-widget-task-title" style="color: var(--text-muted); font-size: 13px;">✨ No hay actividades programadas</div>
          <div class="mini-widget-task-meta" style="font-size: 11px; color: var(--text-dim);">Todo al día</div>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="mini-widget-container" style="padding: 6px 10px; height: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; gap: 8px; -webkit-app-region: drag; position: relative;">
        <!-- Columna Izquierda: Selector de Proyecto arriba + Carrusel abajo -->
        <div style="display: flex; flex-direction: column; gap: 3px; width: 120px; min-width: 120px; -webkit-app-region: no-drag; position: relative;">
          <button class="btn-secondary" id="btn-mini-project-name" style="font-size: 10px; font-weight: 600; padding: 2px 6px; height: 20px; border-radius: 4px; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; background: rgba(255,255,255,0.06); cursor: pointer;" title="Cambiar de proyecto">
            ${this.project.name} ▾
          </button>

          ${total > 1 ? `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 2px; width: 100%;">
              <button class="btn-icon" id="btn-widget-prev" style="width: 20px; height: 18px; font-size: 12px; cursor: pointer;">‹</button>
              <span style="font-size: 10px; color: var(--text-dim); font-weight: 500;">
                ${this.activeIndex + 1}/${total}
              </span>
              <button class="btn-icon" id="btn-widget-next" style="width: 20px; height: 18px; font-size: 12px; cursor: pointer;">›</button>
            </div>
          ` : '<div style="height: 18px;"></div>'}
        </div>

        <!-- Columna Central: Info de Actividad y botón de Acción -->
        <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; -webkit-app-region: no-drag;">
          ${contentHtml}
        </div>

        <!-- Columna Derecha: Acciones de Ventana (Sin botón de expandir) -->
        <div class="titlebar-actions" style="-webkit-app-region: no-drag; display: flex; align-items: center; gap: 4px;">
          <button class="btn-icon" id="btn-widget-ghost" title="Modo Fantasma (Click-Through)">👻</button>
          <button class="btn-icon btn-close" id="btn-widget-close" title="Cerrar">✕</button>
        </div>

        <!-- Modal Overlay Interno Glassmorphism para Selección Cómoda de Proyectos -->
        ${this.isProjectMenuOpen ? `
          <div class="mini-widget-project-overlay" style="
            position: absolute;
            inset: 0;
            background: var(--bg-panel);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: var(--radius-md);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            padding: 8px 12px;
            justify-content: space-between;
            -webkit-app-region: no-drag;
            box-shadow: 0 8px 24px rgba(0,0,0,0.6);
            animation: fadeIn 0.1s ease-out;
          ">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
              <span style="font-size: 11px; font-weight: 700; color: var(--accent-primary); text-transform: uppercase; letter-spacing: 0.5px;">
                Seleccionar Proyecto (${this.allProjects.length})
              </span>
              <button class="btn-icon" id="btn-close-mini-projects" style="width: 22px; height: 22px; font-size: 12px; cursor: pointer;">✕</button>
            </div>
            <div style="
              display: flex;
              align-items: center;
              gap: 6px;
              overflow-x: auto;
              overflow-y: hidden;
              padding: 2px 0 4px 0;
              width: 100%;
            ">
              ${this.allProjects.map(p => `
                <button class="btn-secondary mini-project-item" data-project-id="${p.id}" style="
                  font-size: 11px;
                  padding: 4px 12px;
                  height: 28px;
                  border-radius: 6px;
                  white-space: nowrap;
                  background: ${p.id === this.project.id ? 'var(--accent-glow)' : 'rgba(255,255,255,0.06)'};
                  border: 1px solid ${p.id === this.project.id ? 'var(--accent-primary)' : 'var(--border-glass)'};
                  color: ${p.id === this.project.id ? 'var(--accent-primary)' : 'var(--text-main)'};
                  font-weight: ${p.id === this.project.id ? '700' : '500'};
                  cursor: pointer;
                  flex-shrink: 0;
                  transition: all 0.15s ease;
                ">
                  ${p.id === this.project.id ? '✓ ' : ''}${p.name}
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    this.bindCardEvents(currentTask);
  }

  private bindCardEvents(currentTask: Task | null) {
    // Doble clic en la tarjeta para expandir
    this.container.querySelector('#mini-task-card-body')?.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.onExpand();
    });

    this.container.querySelector('#btn-widget-ghost')?.addEventListener('click', () => this.onToggleGhost());
    this.container.querySelector('#btn-widget-close')?.addEventListener('click', () => this.onClose());

    this.container.querySelector('#btn-mini-project-name')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isProjectMenuOpen = true;
      this.render();
    });

    this.container.querySelector('#btn-close-mini-projects')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isProjectMenuOpen = false;
      this.render();
    });

    const projectItems = this.container.querySelectorAll('.mini-project-item');
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
