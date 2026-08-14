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
}

export class GanttChart {
  private container: HTMLElement;
  private project: Project;
  private config: AppConfig;
  private onTaskChange: (updatedTask: Task) => void;
  private onTaskClick?: (task: Task, event: MouseEvent) => void;
  private onTaskContextMenu?: (task: Task, event: MouseEvent) => void;

  private startDate!: Date;
  private totalDays = 45;
  private columnWidth = 48; // px por día / unidad base
  private minColumnWidth = 28;
  private maxColumnWidth = 120;

  // Estado de interacción Drag & Drop
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

    this.calculateInitialRange();
    this.setBaseScaleWidth();
  }

  private calculateInitialRange() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Mostrar desde 7 días antes de hoy
    this.startDate = addDays(today, -7);
  }

  private setBaseScaleWidth() {
    if (this.config.timeScale === 'days') {
      this.columnWidth = 48;
    } else if (this.config.timeScale === 'weeks') {
      this.columnWidth = 84;
    } else {
      this.columnWidth = 110;
    }
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
    const newWidth = Math.max(this.minColumnWidth, Math.min(this.maxColumnWidth, this.columnWidth + delta));
    if (newWidth !== this.columnWidth) {
      this.columnWidth = newWidth;
      this.render();
    }
  }

  public scrollToToday() {
    const scrollContainer = this.container.querySelector('.gantt-body-wrapper') as HTMLElement;
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calcular posición de la línea "Now"
    const nowDaysFromStart = diffDays(this.startDate, today);
    const nowMarkerLeft = Math.max(0, nowDaysFromStart * this.columnWidth + (this.columnWidth / 2));

    this.container.innerHTML = `
      <div class="timeline-header-wrapper">
        <div class="timeline-task-column-header">
          <span>Actividades (${this.project.tasks.length})</span>
        </div>
        <div class="timeline-dates-header" style="width: ${totalGridWidth}px;">
          ${columns.map(col => {
            const header = formatColumnHeader(col, this.config.timeScale);
            const isWk = this.config.highlightWeekends && isWeekend(col);
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
        <div class="task-list-panel">
          ${this.project.tasks.map(task => {
            const cat = categoriesMap.get(task.categoryId);
            return `
              <div class="task-row-label" data-task-id="${task.id}" title="${task.title}">
                <span style="border-left: 3px solid ${cat?.color || '#38BDF8'}; padding-left: 8px; overflow: hidden; text-overflow: ellipsis;">
                  ${task.title}
                </span>
                <span style="font-size: 11px; opacity: 0.65; margin-left: 6px;">
                  ${task.status === 'completed' ? '✓' : task.status === 'in_progress' ? '●' : '○'}
                </span>
              </div>
            `;
          }).join('')}
        </div>

        <div class="task-grid-panel" style="width: ${totalGridWidth}px; min-height: ${Math.max(200, this.project.tasks.length * 42)}px;">
          <!-- Marcador Fecha Actual (Now Line) -->
          <div class="now-marker-line" style="left: ${nowMarkerLeft}px;">
            <div class="now-marker-badge">HOY</div>
          </div>

          <!-- Cuadrícula de fondo -->
          <div class="grid-background-columns" style="display: flex; position: absolute; inset: 0; pointer-events: none;">
            ${columns.map(col => {
              const isWk = this.config.highlightWeekends && isWeekend(col);
              return `
                <div style="width: ${this.columnWidth}px; min-width: ${this.columnWidth}px; height: 100%; border-right: 1px solid var(--grid-line); ${isWk ? 'background: var(--weekend-bg);' : ''}"></div>
              `;
            }).join('')}
          </div>

          <!-- Barras de Tareas -->
          ${this.project.tasks.map((task, idx) => {
            const cat = categoriesMap.get(task.categoryId);
            const tStart = parseDateISO(task.startDate);
            const tEnd = parseDateISO(task.endDate);
            const leftDays = diffDays(this.startDate, tStart);
            const durDays = Math.max(1, diffDays(tStart, tEnd) + 1);

            const leftPx = leftDays * this.columnWidth;
            const widthPx = Math.max(24, durDays * this.columnWidth - 6);
            const topPx = idx * 42 + 7;

            const isOverdue = task.status !== 'completed' && tEnd < today;
            const statusClass = isOverdue ? 'status-overdue' : `status-${task.status}`;

            return `
              <div class="gantt-task-bar ${statusClass}"
                   id="task-bar-${task.id}"
                   data-task-id="${task.id}"
                   style="left: ${leftPx}px; top: ${topPx}px; width: ${widthPx}px; background: ${cat?.color || '#3B82F6'};"
                   title="${task.title} (${task.startDate} a ${task.endDate})">
                <div class="task-resize-handle left" data-handle="left" title="Ajustar fecha de inicio"></div>
                <span class="task-title-text" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; pointer-events: none; flex: 1;">
                  ${task.title}
                </span>
                <div class="task-resize-handle right" data-handle="right" title="Ajustar fecha de fin"></div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents() {
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
            const newWidth = Math.max(this.columnWidth * 0.8, this.dragInitialWidth + deltaX);
            bar.style.width = `${newWidth}px`;
          } else if (this.isResizingLeft) {
            const newLeft = Math.max(0, this.dragInitialLeft + deltaX);
            const newWidth = Math.max(this.columnWidth * 0.8, this.dragInitialWidth - deltaX);
            if (newWidth > this.columnWidth * 0.8) {
              bar.style.left = `${newLeft}px`;
              bar.style.width = `${newWidth}px`;
            }
          }
        };

        const onMouseUp = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);

          if (this.activeTaskId) {
            this.commitTaskChanges(bar, task);
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

    // Zoom con Ctrl + Wheel
    const scrollBody = this.container.querySelector('#gantt-scroll-body') as HTMLElement;
    if (scrollBody) {
      scrollBody.addEventListener('wheel', (e: WheelEvent) => {
        if (e.ctrlKey) {
          e.preventDefault();
          this.zoom(e.deltaY < 0 ? 6 : -6);
        }
      }, { passive: false });
    }
  }

  private commitTaskChanges(bar: HTMLElement, task: Task) {
    const finalLeftPx = parseFloat(bar.style.left) || 0;
    const finalWidthPx = parseFloat(bar.style.width) || 0;

    // Snapping a días
    const startDayOffset = Math.round(finalLeftPx / this.columnWidth);
    const durationDays = Math.max(1, Math.round((finalWidthPx + 6) / this.columnWidth));

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
