import { Project, Task } from '../../types/project';
import { AppConfig } from '../../types/config';
import { 
  formatDateISO, 
  parseDateISO, 
  diffDays, 
  addDays, 
  generateTimelineColumns, 
  formatColumnHeader, 
  isWeekend 
} from '../services/dateUtils';
import { storageService } from '../services/storage';

export interface GanttChartOptions {
  container: HTMLElement;
  project: Project;
  config: AppConfig;
  onTaskChange: (task: Task) => void;
  onTaskClick: (task: Task) => void;
  onTaskContextMenu: (task: Task, event: MouseEvent) => void;
  onNewTaskClick: () => void;
}

export class GanttChart {
  private container: HTMLElement;
  private project: Project;
  private config: AppConfig;
  private onTaskChange: (task: Task) => void;
  private onTaskClick: (task: Task) => void;
  private onTaskContextMenu: (task: Task, event: MouseEvent) => void;
  private onNewTaskClick: () => void;

  // Estado del Gantt
  private startDate: Date;
  private totalDays = 60;
  private columnWidth = 38; // Ancho base de columna por unidad de tiempo

  // Estado de Drag & Drop y Resize
  private isDragging = false;
  private isResizingLeft = false;
  private isResizingRight = false;
  private activeTaskId: string | null = null;
  private dragStartX = 0;
  private initialTaskLeft = 0;
  private initialTaskWidth = 0;

  // Estado de Redimensionamiento de Columna de Actividades
  private isResizingColumn = false;
  private columnResizeStartX = 0;
  private initialColumnWidth = 220;

  constructor(options: GanttChartOptions) {
    this.container = options.container;
    this.project = options.project;
    this.config = options.config;
    this.onTaskChange = options.onTaskChange;
    this.onTaskClick = options.onTaskClick;
    this.onTaskContextMenu = options.onTaskContextMenu;
    this.onNewTaskClick = options.onNewTaskClick;

    // Iniciar 7 días antes de la fecha actual para contexto
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.startDate = addDays(today, -7);

    this.setBaseScaleWidth();
  }

  private setBaseScaleWidth() {
    switch (this.config.timeScale) {
      case 'days':
        this.columnWidth = 38;
        this.totalDays = 60;
        break;
      case 'weeks':
        this.columnWidth = 90;
        this.totalDays = 180;
        break;
      case 'months':
        this.columnWidth = 140;
        this.totalDays = 365;
        break;
    }
  }

  /**
   * Devuelve cuántos píxeles en pantalla representan 1 día natural
   */
  private getPixelsPerDay(): number {
    switch (this.config.timeScale) {
      case 'days':
        return this.columnWidth;
      case 'weeks':
        return this.columnWidth / 7;
      case 'months':
        return this.columnWidth / 30.416;
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
      const taskListWidth = this.config.taskListWidth || 220;
      const targetLeft = nowMarker.offsetLeft - scrollContainer.clientWidth / 2 + taskListWidth / 2;
      scrollContainer.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    }
  }

  public render() {
    const columns = generateTimelineColumns(this.startDate, this.totalDays, this.config.timeScale);
    const totalGridWidth = columns.length * this.columnWidth;
    const categoriesMap = new Map(this.project.categories.map(c => [c.id, c]));
    const groupsMap = new Map((this.project.groups || []).map(g => [g.id, g]));
    const pxPerDay = this.getPixelsPerDay();
    const taskListWidth = this.config.taskListWidth || 220;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Posición exacta del marcador "Now Line"
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
      <div class="timeline-header-wrapper" style="display: flex; width: 100%; overflow: hidden;">
        <div class="timeline-task-column-header" style="width: ${taskListWidth}px; min-width: ${taskListWidth}px; max-width: ${taskListWidth}px; display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; position: relative;">
          <span style="font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Actividades (${this.project.tasks.length})</span>
          <button class="btn-icon" id="btn-header-add-task" title="Crear nueva actividad" style="width: 24px; height: 24px; font-weight: 700; font-size: 14px; background: rgba(56,189,248,0.15); color: var(--accent-primary);">
            +
          </button>
        </div>

        <div class="timeline-dates-header-viewport" id="timeline-dates-viewport" style="flex: 1; overflow: hidden; position: relative;">
          <div class="timeline-dates-header" id="timeline-dates-header" style="width: ${totalGridWidth}px; display: flex; transform: translateX(0px);">
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
      </div>

      <div class="gantt-body-wrapper" id="gantt-scroll-body">
        <!-- Panel lateral izquierdo con ancho ajustable -->
        <div class="task-list-panel" id="task-list-panel" style="width: ${taskListWidth}px; min-width: ${taskListWidth}px; max-width: ${taskListWidth}px;">
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
                  <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${row.groupName}</span>
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
              </div>
            `;
          }).join('')}

          <!-- Manija / Splitter para Redimensionar el Ancho de la Columna -->
          <div class="task-column-resizer" id="task-column-resizer" title="Arrastrar para ajustar ancho de columna"></div>
        </div>

        <!-- Cuadrícula Temporal de Barras -->
        <div class="task-grid-panel" style="width: ${totalGridWidth}px; position: relative;">
          <!-- Marcador en Vivo "Now Line" Limpio sin badge -->
          <div class="now-marker-line" style="left: ${nowMarkerLeft}px;"></div>

          <!-- Columnas de Fondo de la Cuadrícula -->
          <div style="display: flex; position: absolute; top: 0; bottom: 0; left: 0; width: 100%; pointer-events: none;">
            ${columns.map(col => {
              const isWk = this.config.highlightWeekends && isWeekend(col) && this.config.timeScale === 'days';
              return `
                <div style="width: ${this.columnWidth}px; min-width: ${this.columnWidth}px; height: 100%; border-right: 1px solid var(--grid-line); ${isWk ? 'background: var(--weekend-bg);' : ''}"></div>
              `;
            }).join('')}
          </div>

          <!-- Filas de Fondo y Barras de Actividades -->
          ${rows.map((row) => {
            if (row.type === 'group_header') {
              return `
                <div style="height: 32px; border-bottom: 1px solid var(--grid-line); background: rgba(255,255,255,0.02);"></div>
              `;
            }

            const task = row.task!;
            const cat = task.categoryId ? categoriesMap.get(task.categoryId) : undefined;
            const barColor = cat ? cat.color : '#38BDF8';

            const taskStart = parseDateISO(task.startDate);
            const taskEnd = parseDateISO(task.endDate);

            const startDays = diffDays(this.startDate, taskStart);
            const durationDays = diffDays(taskStart, taskEnd) + 1;

            const leftPx = startDays * pxPerDay;
            const widthPx = Math.max(16, durationDays * pxPerDay - 4);

            const isOverdue = task.endDate < formatDateISO(today) && task.status !== 'completed';
            const statusClass = `status-${isOverdue ? 'overdue' : task.status}`;

            return `
              <div style="height: 42px; border-bottom: 1px solid var(--grid-line); position: relative;">
                <div 
                  class="gantt-task-bar ${statusClass}" 
                  id="task-bar-${task.id}"
                  data-task-id="${task.id}"
                  style="
                    left: ${leftPx}px; 
                    top: 7px; 
                    width: ${widthPx}px; 
                    background: ${barColor};
                  "
                  title="${task.title} (${task.startDate} a ${task.endDate})"
                >
                  <div class="task-resize-handle left" data-handle="left"></div>
                  <span class="task-title" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; pointer-events: none;">
                    ${task.title}
                  </span>
                  <div class="task-resize-handle right" data-handle="right"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    this.bindEvents(pxPerDay);
    this.bindColumnResizer();
  }

  private bindEvents(pxPerDay: number) {
    // Botón de nueva actividad en la cabecera
    this.container.querySelector('#btn-header-add-task')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onNewTaskClick();
    });

    // Clic en fila lateral para editar
    const rowLabels = this.container.querySelectorAll('.task-row-label');
    rowLabels.forEach(el => {
      el.addEventListener('click', () => {
        const taskId = el.getAttribute('data-task-id');
        const task = this.project.tasks.find(t => t.id === taskId);
        if (task) {
          this.onTaskClick(task);
        }
      });
    });

    // Drag & Drop y Resize de barras
    const taskBars = this.container.querySelectorAll('.gantt-task-bar');
    taskBars.forEach(barEl => {
      const bar = barEl as HTMLElement;
      const taskId = bar.getAttribute('data-task-id')!;
      const task = this.project.tasks.find(t => t.id === taskId)!;

      // Clic derecho contextual
      bar.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onTaskContextMenu(task, e);
      });

      // Mousedown para inicio de arrastre o redimensión
      bar.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Solo clic izquierdo
        e.stopPropagation();

        const target = e.target as HTMLElement;
        const isLeftHandle = target.dataset.handle === 'left';
        const isRightHandle = target.dataset.handle === 'right';

        this.dragStartX = e.clientX;
        this.initialTaskLeft = parseFloat(bar.style.left) || 0;
        this.initialTaskWidth = parseFloat(bar.style.width) || 0;
        this.activeTaskId = taskId;

        if (isLeftHandle) {
          this.isResizingLeft = true;
        } else if (isRightHandle) {
          this.isResizingRight = true;
        } else {
          this.isDragging = true;
        }

        const onMouseMove = (moveEvent: MouseEvent) => {
          const deltaX = moveEvent.clientX - this.dragStartX;

          if (this.isDragging) {
            const newLeft = Math.max(0, this.initialTaskLeft + deltaX);
            bar.style.left = `${newLeft}px`;
          } else if (this.isResizingRight) {
            const newWidth = Math.max(16, this.initialTaskWidth + deltaX);
            bar.style.width = `${newWidth}px`;
          } else if (this.isResizingLeft) {
            const maxDelta = this.initialTaskWidth - 16;
            const appliedDelta = Math.min(maxDelta, deltaX);
            const newLeft = Math.max(0, this.initialTaskLeft + appliedDelta);
            const newWidth = Math.max(16, this.initialTaskWidth - appliedDelta);
            if (newLeft >= 0) {
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

    // Zoom exclusivo con Ctrl + Wheel y sincronización de Scroll Horizontal
    const scrollBody = this.container.querySelector('#gantt-scroll-body') as HTMLElement;
    const datesHeader = this.container.querySelector('#timeline-dates-header') as HTMLElement;
    if (scrollBody) {
      scrollBody.addEventListener('scroll', () => {
        if (datesHeader) {
          datesHeader.style.transform = `translateX(-${scrollBody.scrollLeft}px)`;
        }
      }, { passive: true });

      scrollBody.addEventListener('wheel', (e: WheelEvent) => {
        if (e.ctrlKey) {
          e.preventDefault();
          this.zoom(e.deltaY < 0 ? 8 : -8);
        }
      }, { passive: false });
    }
  }

  private bindColumnResizer() {
    const resizer = this.container.querySelector('#task-column-resizer') as HTMLElement;
    if (!resizer) return;

    resizer.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      this.isResizingColumn = true;
      this.columnResizeStartX = e.clientX;
      this.initialColumnWidth = this.config.taskListWidth || 220;

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!this.isResizingColumn) return;
        const deltaX = moveEvent.clientX - this.columnResizeStartX;
        const newWidth = Math.max(160, Math.min(480, this.initialColumnWidth + deltaX));
        
        // Actualizar ancho visual en tiempo real
        const headerCol = this.container.querySelector('.timeline-task-column-header') as HTMLElement;
        const panelCol = this.container.querySelector('#task-list-panel') as HTMLElement;

        if (headerCol) {
          headerCol.style.width = `${newWidth}px`;
          headerCol.style.minWidth = `${newWidth}px`;
          headerCol.style.maxWidth = `${newWidth}px`;
        }
        if (panelCol) {
          panelCol.style.width = `${newWidth}px`;
          panelCol.style.minWidth = `${newWidth}px`;
          panelCol.style.maxWidth = `${newWidth}px`;
        }
      };

      const onMouseUp = (upEvent: MouseEvent) => {
        if (this.isResizingColumn) {
          this.isResizingColumn = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';

          const deltaX = upEvent.clientX - this.columnResizeStartX;
          const finalWidth = Math.max(160, Math.min(480, this.initialColumnWidth + deltaX));
          this.config.taskListWidth = finalWidth;
          storageService.saveConfig(this.config);

          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
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

    Object.assign(task, updatedTask);
    this.onTaskChange(updatedTask);
    this.render();
  }
}
