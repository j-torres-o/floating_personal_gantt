import { Project, Task } from '../../types/project';
import { AppConfig } from '../../types/config';
import {
  formatDateISO,
  parseDateISO,
  diffDays,
  addDays,
  isWeekend,
  formatColumnHeader,
  generateTimelineColumns
} from '../services/dateUtils';

export interface GanttChartOptions {
  container: HTMLElement;
  project: Project;
  config: AppConfig;
  onTaskChange: (updatedTask: Task) => void;
  onTaskClick?: (task: Task, event: MouseEvent) => void;
  onTaskContextMenu?: (task: Task, event: MouseEvent) => void;
  onNewTaskClick?: () => void;
}

export class GanttChart {
  private container: HTMLElement;
  private project: Project;
  private config: AppConfig;
  private onTaskChange: (updatedTask: Task) => void;
  private onTaskClick?: (task: Task, event: MouseEvent) => void;
  private onTaskContextMenu?: (task: Task, event: MouseEvent) => void;
  private onNewTaskClick?: () => void;

  private startDate!: Date;
  private totalDays = 60;
  private columnWidth = 48; // Ancho base de columna en píxeles

  // Estado de interacción Drag & Drop / Resize
  private isDragging = false;
  private isResizingLeft = false;
  private isResizingRight = false;
  private activeTaskId: string | null = null;
  private dragStartX = 0;
  private dragInitialLeft = 0;
  private dragInitialWidth = 0;

  constructor(options: GanttChartOptions) {
    this.container = options.container;
    this.project = options.project;
    this.config = options.config;
    this.onTaskChange = options.onTaskChange;
    this.onTaskClick = options.onTaskClick;
    this.onTaskContextMenu = options.onTaskContextMenu;
    this.onNewTaskClick = options.onNewTaskClick;

    this.calculateInitialRange();
    this.setBaseScaleWidth();
  }

  private calculateInitialRange() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.startDate = addDays(today, -7);
  }

  private setBaseScaleWidth() {
    if (this.config.timeScale === 'days') {
      this.columnWidth = 48;
      this.totalDays = 45;
    } else if (this.config.timeScale === 'weeks') {
      this.columnWidth = 90;
      this.totalDays = 120;
    } else {
      // months
      this.columnWidth = 140;
      this.totalDays = 365;
    }
  }

  /**
   * Retorna la equivalencia en píxeles por cada día según la escala activa
   */
  public getPixelsPerDay(): number {
    if (this.config.timeScale === 'days') {
      return this.columnWidth;
    }
    if (this.config.timeScale === 'weeks') {
      return this.columnWidth / 7;
    }
    // months (~30.4 días por mes)
    return this.columnWidth / 30.416;
  }

  public updateProject(project: Project) {
    this.project = project;
    this.render();
  }

  public updateConfig(config: AppConfig) {
    const scaleChanged = this.config.timeScale !== config.timeScale;
    this.config = config;
    if (scaleChanged) {
      this.setBaseScaleWidth();
    }
    this.render();
  }

  public zoom(delta: number) {
    const minW = this.config.timeScale === 'days' ? 26 : this.config.timeScale === 'weeks' ? 45 : 70;
    const maxW = this.config.timeScale === 'days' ? 90 : this.config.timeScale === 'weeks' ? 180 : 280;
    const newWidth = Math.max(minW, Math.min(maxW, this.columnWidth + delta));
    if (newWidth !== this.columnWidth) {
      this.columnWidth = newWidth;
      this.render();
    }
  }

  public scrollToToday() {
    const scrollContainer = this.container.querySelector('#gantt-scroll-body') as HTMLElement;
    const nowMarker = this.container.querySelector('.now-marker-line') as HTMLElement;
    if (scrollContainer && nowMarker) {
      const targetLeft = nowMarker.offsetLeft - scrollContainer.clientWidth / 2 + 100;
      scrollContainer.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    }
  }

  public render() {
    const columns = generateTimelineColumns(this.startDate, this.totalDays, this.config.timeScale);
    const totalGridWidth = columns.length * this.columnWidth;
    const categoriesMap = new Map(this.project.categories.map(c => [c.id, c]));
    const groupsMap = new Map((this.project.groups || []).map(g => [g.id, g]));
    const pxPerDay = this.getPixelsPerDay();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calcular posición exacta del marcador "Now Line"
    const nowDaysOffset = diffDays(this.startDate, today);
    const nowMarkerLeft = Math.max(0, nowDaysOffset * pxPerDay + (pxPerDay / 2));

    // Estructurar actividades por Grupos / Fases
    interface DisplayRow {
      type: 'group_header' | 'task';
      groupName?: string;
      groupColor?: string;
      task?: Task;
      isIndented?: boolean;
    }

    const rows: DisplayRow[] = [];
    const groups = this.project.groups || [];
    const tasksByGroup = new Map<string, Task[]>();
    const ungroupedTasks: Task[] = [];

    this.project.tasks.forEach(task => {
      if (task.groupId && groupsMap.has(task.groupId)) {
        if (!tasksByGroup.has(task.groupId)) {
          tasksByGroup.set(task.groupId, []);
        }
        tasksByGroup.get(task.groupId)!.push(task);
      } else {
        ungroupedTasks.push(task);
      }
    });

    // Agregar filas agrupadas
    groups.forEach(grp => {
      const gTasks = tasksByGroup.get(grp.id) || [];
      if (gTasks.length > 0 || groups.length > 0) {
        rows.push({
          type: 'group_header',
          groupName: grp.name,
          groupColor: grp.color || '#8B5CF6'
        });
        gTasks.forEach(t => rows.push({ type: 'task', task: t, isIndented: true }));
      }
    });

    // Agregar actividades individuales (sin grupo)
    ungroupedTasks.forEach(t => rows.push({ type: 'task', task: t, isIndented: false }));

    this.container.innerHTML = `
      <div class="timeline-header-wrapper">
        <div class="timeline-task-column-header" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 12px;">
          <span style="font-weight: 600; font-size: 13px;">Actividades (${this.project.tasks.length})</span>
          <button class="btn-icon" id="btn-header-add-task" title="Crear nueva actividad" style="width: 24px; height: 24px; font-weight: 700; font-size: 14px; background: rgba(56,189,248,0.15); color: var(--accent-primary);">
            +
          </button>
        </div>
        <div class="timeline-dates-header" style="width: ${totalGridWidth}px;">
          ${columns.map(col => {
            const header = formatColumnHeader(col, this.config.timeScale);
            const isWk = this.config.highlightWeekends && isWeekend(col) && this.config.timeScale === 'days';
            return `
              <div class="timeline-date-col ${isWk ? 'weekend' : ''}" 
                   style="width: ${this.columnWidth}px; min-width: ${this.columnWidth}px;">
                <span class="primary-date">${header.primary}</span>
                <span class="secondary-date">${header.secondary}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="gantt-body-wrapper" id="gantt-scroll-body">
        <!-- Panel lateral izquierdo con nombres de grupos y actividades -->
        <div class="task-list-panel">
          ${rows.map(row => {
            if (row.type === 'group_header') {
              return `
                <div class="task-row-group-header" style="
                  height: 32px;
                  display: flex;
                  align-items: center;
                  padding: 0 12px;
                  background: rgba(255, 255, 255, 0.04);
                  border-bottom: 1px solid var(--grid-line);
                  font-size: 11px;
                  font-weight: 700;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  color: ${row.groupColor};
                  gap: 6px;
                ">
                  <span style="font-size: 12px;">◈</span>
                  <span>${row.groupName}</span>
                </div>
              `;
            }

            const task = row.task!;
            const cat = task.categoryId ? categoriesMap.get(task.categoryId) : undefined;
            const borderCol = cat ? cat.color : 'rgba(255,255,255,0.2)';
            const paddingLeft = row.isIndented ? '28px' : '12px';

            return `
              <div class="task-row-label" data-task-id="${task.id}" title="${task.title}" style="padding-left: ${paddingLeft}; position: relative;">
                ${row.isIndented ? `
                  <span style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--text-dim); font-size: 10px;">↳</span>
                ` : ''}
                <span style="border-left: 3px solid ${borderCol}; padding-left: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${task.title}
                </span>
                <span style="font-size: 11px; opacity: 0.7; margin-left: 6px;">
                  ${task.status === 'completed' ? '✓' : task.status === 'in_progress' ? '●' : '○'}
                </span>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Panel de cuadrícula y barras temporales -->
        <div class="task-grid-panel" style="width: ${totalGridWidth}px; min-height: ${Math.max(200, rows.length * 42)}px;">
          <!-- Marcador Fecha Actual (Now Line) -->
          <div class="now-marker-line" style="left: ${nowMarkerLeft}px;">
            <div class="now-marker-badge">HOY</div>
          </div>

          <!-- Cuadrícula de fondo -->
          <div class="grid-background-columns" style="display: flex; position: absolute; inset: 0; pointer-events: none;">
            ${columns.map(col => {
              const isWk = this.config.highlightWeekends && isWeekend(col) && this.config.timeScale === 'days';
              return `
                <div style="width: ${this.columnWidth}px; min-width: ${this.columnWidth}px; height: 100%; border-right: 1px solid var(--grid-line); ${isWk ? 'background: var(--weekend-bg);' : ''}"></div>
              `;
            }).join('')}
          </div>

          <!-- Filas de la cuadrícula -->
          ${(() => {
            let currentTop = 0;
            return rows.map((row) => {
              if (row.type === 'group_header') {
                const groupRowHtml = `
                  <div style="position: absolute; top: ${currentTop}px; left: 0; width: 100%; height: 32px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--grid-line);"></div>
                `;
                currentTop += 32;
                return groupRowHtml;
              }

              const task = row.task!;
              const cat = task.categoryId ? categoriesMap.get(task.categoryId) : undefined;
              const barColor = cat ? cat.color : '#475569';
              const tStart = parseDateISO(task.startDate);
              const tEnd = parseDateISO(task.endDate);

              const leftDays = diffDays(this.startDate, tStart);
              const durDays = Math.max(1, diffDays(tStart, tEnd) + 1);

              // Escalado proporcional exacto en píxeles
              const leftPx = leftDays * pxPerDay;
              const widthPx = Math.max(18, durDays * pxPerDay - 4);
              const topPx = currentTop + 7;
              currentTop += 42;

              const isOverdue = task.status !== 'completed' && tEnd < today;
              const statusClass = isOverdue ? 'status-overdue' : `status-${task.status}`;

              return `
                <div class="gantt-task-bar ${statusClass}"
                     id="task-bar-${task.id}"
                     data-task-id="${task.id}"
                     style="left: ${leftPx}px; top: ${topPx}px; width: ${widthPx}px; background: ${barColor};"
                     title="${task.title} (${task.startDate} a ${task.endDate})">
                  <div class="task-resize-handle left" data-handle="left" title="Ajustar fecha de inicio"></div>
                  <span class="task-title-text" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; pointer-events: none; flex: 1;">
                    ${task.title}
                  </span>
                  <div class="task-resize-handle right" data-handle="right" title="Ajustar fecha de fin"></div>
                </div>
              `;
            }).join('');
          })()}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents() {
    this.container.querySelector('#btn-header-add-task')?.addEventListener('click', () => {
      this.onNewTaskClick?.();
    });

    const pxPerDay = this.getPixelsPerDay();
    const taskBars = this.container.querySelectorAll('.gantt-task-bar');

    taskBars.forEach(el => {
      const bar = el as HTMLElement;
      const taskId = bar.getAttribute('data-task-id');
      if (!taskId) return;
      const task = this.project.tasks.find(t => t.id === taskId);
      if (!task) return;

      // Clic para editar
      bar.addEventListener('click', (e) => {
        if (!this.isDragging && !this.isResizingLeft && !this.isResizingRight) {
          this.onTaskClick?.(task, e);
        }
      });

      // Menú contextual clic derecho
      bar.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.onTaskContextMenu?.(task, e);
      });

      // Inicio de interacción Drag & Drop / Resize
      bar.addEventListener('mousedown', (e: MouseEvent) => {
        if (e.button !== 0) return; // Solo clic izquierdo
        const target = e.target as HTMLElement;

        this.activeTaskId = taskId;
        this.dragStartX = e.clientX;
        this.dragInitialLeft = parseFloat(bar.style.left) || 0;
        this.dragInitialWidth = parseFloat(bar.style.width) || 0;

        if (target.classList.contains('left')) {
          this.isResizingLeft = true;
        } else if (target.classList.contains('right')) {
          this.isResizingRight = true;
        } else {
          this.isDragging = true;
        }

        const onMouseMove = (moveEvent: MouseEvent) => {
          const deltaX = moveEvent.clientX - this.dragStartX;

          if (this.isDragging) {
            const newLeft = Math.max(0, this.dragInitialLeft + deltaX);
            bar.style.left = `${newLeft}px`;
          } else if (this.isResizingRight) {
            const newWidth = Math.max(18, this.dragInitialWidth + deltaX);
            bar.style.width = `${newWidth}px`;
          } else if (this.isResizingLeft) {
            const newLeft = Math.max(0, this.dragInitialLeft + deltaX);
            const newWidth = Math.max(18, this.dragInitialWidth - deltaX);
            if (newWidth > 18) {
              bar.style.left = `${newLeft}px`;
              bar.style.width = `${newWidth}px`;
            }
          }
        };

        const onMouseUp = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);

          if (this.activeTaskId) {
            this.commitTaskChanges(bar, task, pxPerDay);
          }

          this.isDragging = false;
          this.isResizingLeft = false;
          this.isResizingRight = false;
          this.activeTaskId = null;
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    });

    // Zoom exclusivo con Ctrl + Wheel
    const scrollBody = this.container.querySelector('#gantt-scroll-body') as HTMLElement;
    if (scrollBody) {
      scrollBody.addEventListener('wheel', (e: WheelEvent) => {
        if (e.ctrlKey) {
          e.preventDefault();
          this.zoom(e.deltaY < 0 ? 8 : -8);
        }
      }, { passive: false });
    }
  }

  private commitTaskChanges(bar: HTMLElement, task: Task, pxPerDay: number) {
    const finalLeftPx = parseFloat(bar.style.left) || 0;
    const finalWidthPx = parseFloat(bar.style.width) || 0;

    // Snapping a días exactos considerando la escala
    const startDayOffset = Math.round(finalLeftPx / pxPerDay);
    const durationDays = Math.max(1, Math.round((finalWidthPx + 4) / pxPerDay));

    const newStartDate = addDays(this.startDate, startDayOffset);
    const newEndDate = addDays(newStartDate, durationDays - 1);

    const updatedTask: Task = {
      ...task,
      startDate: formatDateISO(newStartDate),
      endDate: formatDateISO(newEndDate)
    };

    // Actualizar objeto en memoria y notificar
    Object.assign(task, updatedTask);
    this.onTaskChange(updatedTask);
    this.render();
  }
}
