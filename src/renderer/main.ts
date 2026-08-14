import { storageService } from './services/storage';
import { AppConfig } from '../types/config';
import { ProjectsData, Project, Task } from '../types/project';
import { formatDateISO, parseDateISO, diffDays } from './services/dateUtils';
import { GanttChart } from './components/GanttChart';

class App {
  private config!: AppConfig;
  private projectsData!: ProjectsData;
  private currentProject!: Project;
  private rootEl!: HTMLElement;
  private activeCarouselIndex = 0;
  private ganttChart: GanttChart | null = null;

  public async init() {
    this.rootEl = document.getElementById('app-root')!;
    
    // Cargar datos desacoplados
    this.config = await storageService.loadConfig();
    this.projectsData = await storageService.loadProjects();

    // Seleccionar proyecto activo
    this.currentProject = this.projectsData.projects.find(p => p.id === this.config.activeProjectId) || this.projectsData.projects[0];

    // Aplicar tema y opacidad inicial
    this.applyTheme(this.config.theme);
    this.applyOpacity(this.config.opacity);

    // Escuchar eventos IPC desde System Tray
    if (window.electronAPI) {
      window.electronAPI.onRestoreFromGhost(() => {
        this.render();
      });
      window.electronAPI.onToggleCompact(() => {
        this.toggleCompactMode();
      });
    }

    this.render();
  }

  private applyTheme(theme: 'dark' | 'light') {
    document.body.className = `theme-${theme}`;
  }

  private applyOpacity(opacity: number) {
    if (window.electronAPI) {
      window.electronAPI.setOpacity(opacity);
    }
  }

  public toggleCompactMode() {
    this.config.compactMode = !this.config.compactMode;
    storageService.saveConfig(this.config);
    if (window.electronAPI) {
      window.electronAPI.setCompactMode(this.config.compactMode);
    }
    this.render();
  }

  private render() {
    if (this.config.compactMode) {
      this.renderMiniWidget();
    } else {
      this.renderExpandedGantt();
    }
  }

  private renderMiniWidget() {
    const todayISO = formatDateISO(new Date());
    // Filtrar tareas que incluyan el día actual
    const activeTasks = this.currentProject.tasks.filter(t => {
      return t.startDate <= todayISO && t.endDate >= todayISO && t.status !== 'completed';
    });

    const total = activeTasks.length;
    const task = total > 0 ? activeTasks[this.activeCarouselIndex % total] : null;

    let taskHtml = '';
    if (task) {
      const remaining = diffDays(new Date(), parseDateISO(task.endDate));
      const category = this.currentProject.categories.find(c => c.id === task.categoryId);
      taskHtml = `
        <div class="mini-widget-task-info">
          <div class="mini-widget-task-title" style="border-left: 3px solid ${category?.color || '#38BDF8'}; padding-left: 6px;">
            ${task.title}
          </div>
          <div class="mini-widget-task-meta">
            ${remaining === 0 ? '¡Vence hoy!' : remaining > 0 ? `Restan ${remaining} días` : '⚠️ Vencida'}
          </div>
        </div>
      `;
    } else {
      taskHtml = `
        <div class="mini-widget-task-info">
          <div class="mini-widget-task-title">Sin tareas activas hoy</div>
          <div class="mini-widget-task-meta">Todo al día</div>
        </div>
      `;
    }

    this.rootEl.innerHTML = `
      <div class="mini-widget-container">
        <div class="mini-widget-carousel">
          <span class="app-badge">GANTT HUD</span>
          ${total > 1 ? `
            <button class="btn-icon" id="btn-carousel-prev">‹</button>
            <span style="font-size: 11px; color: var(--text-dim);">${(this.activeCarouselIndex % total) + 1}/${total}</span>
            <button class="btn-icon" id="btn-carousel-next">›</button>
          ` : ''}
          ${taskHtml}
        </div>
        <div class="titlebar-actions">
          <button class="btn-icon" id="btn-expand-hud" title="Expandir tablero completo">⛶</button>
          <button class="btn-icon btn-close" id="btn-close-app" title="Cerrar">✕</button>
        </div>
      </div>
    `;

    // Eventos del MiniWidget
    document.getElementById('btn-expand-hud')?.addEventListener('click', () => this.toggleCompactMode());
    document.getElementById('btn-close-app')?.addEventListener('click', () => window.electronAPI?.closeWindow());
    document.getElementById('btn-carousel-prev')?.addEventListener('click', () => {
      this.activeCarouselIndex = (this.activeCarouselIndex - 1 + total) % total;
      this.render();
    });
    document.getElementById('btn-carousel-next')?.addEventListener('click', () => {
      this.activeCarouselIndex = (this.activeCarouselIndex + 1) % total;
      this.render();
    });
  }

  private renderExpandedGantt() {
    this.rootEl.innerHTML = `
      <!-- TitleBar -->
      <div class="titlebar">
        <div class="titlebar-left">
          <span class="app-badge">Personal Gantt</span>
          <span style="font-weight: 600; font-size: 13px;">${this.currentProject.name}</span>
        </div>
        <div class="titlebar-actions">
          <button class="btn-icon" id="btn-toggle-ghost" title="Modo Fantasma (Click-Through)">👻</button>
          <button class="btn-icon" id="btn-toggle-compact" title="Minimizar a Mini-Barra HUD">🗗</button>
          <button class="btn-icon btn-close" id="btn-close-app" title="Cerrar">✕</button>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-group">
          <select id="select-project" class="select-input">
            ${this.projectsData.projects.map(p => `
              <option value="${p.id}" ${p.id === this.currentProject.id ? 'selected' : ''}>${p.name}</option>
            `).join('')}
          </select>
          <select id="select-scale" class="select-input">
            <option value="days" ${this.config.timeScale === 'days' ? 'selected' : ''}>Días</option>
            <option value="weeks" ${this.config.timeScale === 'weeks' ? 'selected' : ''}>Semanas</option>
            <option value="months" ${this.config.timeScale === 'months' ? 'selected' : ''}>Meses</option>
          </select>
          <button class="btn-secondary" id="btn-today">📍 Hoy</button>
          <div style="display: flex; gap: 2px;">
            <button class="btn-icon" id="btn-zoom-in" title="Acercar zoom">+</button>
            <button class="btn-icon" id="btn-zoom-out" title="Alejar zoom">-</button>
          </div>
        </div>

        <div class="toolbar-group">
          <label style="font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
            Opacidad:
            <input type="range" id="input-opacity" min="0.3" max="1.0" step="0.05" value="${this.config.opacity}" style="width: 70px;" />
          </label>
          <button class="btn-icon" id="btn-toggle-theme" title="Alternar tema claro/oscuro">🌓</button>
          <button class="btn-primary" id="btn-new-task">+ Nueva Tarea</button>
        </div>
      </div>

      <!-- Área de Gantt Montada Dinámicamente -->
      <div class="gantt-main-container" id="gantt-container"></div>
    `;

    // Montar motor GanttChart
    const ganttContainer = document.getElementById('gantt-container')!;
    this.ganttChart = new GanttChart({
      container: ganttContainer,
      project: this.currentProject,
      config: this.config,
      onTaskChange: (_updatedTask) => {
        // Auto-save inmediato tras interacción Drag & Drop o Resize
        storageService.saveProjects(this.projectsData);
      }
    });

    this.ganttChart.render();

    // Eventos Toolbar y Ventana
    document.getElementById('btn-close-app')?.addEventListener('click', () => window.electronAPI?.closeWindow());
    document.getElementById('btn-toggle-compact')?.addEventListener('click', () => this.toggleCompactMode());
    document.getElementById('btn-toggle-ghost')?.addEventListener('click', () => {
      window.electronAPI?.setIgnoreMouseEvents(true, false);
    });

    document.getElementById('btn-today')?.addEventListener('click', () => {
      this.ganttChart?.scrollToToday();
    });

    document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
      this.ganttChart?.zoom(8);
    });

    document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
      this.ganttChart?.zoom(-8);
    });

    document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
      this.config.theme = this.config.theme === 'dark' ? 'light' : 'dark';
      this.applyTheme(this.config.theme);
      storageService.saveConfig(this.config);
      this.ganttChart?.updateConfig(this.config);
    });

    document.getElementById('input-opacity')?.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.config.opacity = val;
      this.applyOpacity(val);
      storageService.saveConfig(this.config);
    });

    document.getElementById('select-scale')?.addEventListener('change', (e) => {
      this.config.timeScale = (e.target as HTMLSelectElement).value as any;
      storageService.saveConfig(this.config);
      this.ganttChart?.updateConfig(this.config);
    });

    document.getElementById('select-project')?.addEventListener('change', (e) => {
      const projId = (e.target as HTMLSelectElement).value;
      const proj = this.projectsData.projects.find(p => p.id === projId);
      if (proj) {
        this.currentProject = proj;
        this.config.activeProjectId = proj.id;
        storageService.saveConfig(this.config);
        this.ganttChart?.updateProject(this.currentProject);
      }
    });

    document.getElementById('btn-new-task')?.addEventListener('click', () => {
      const title = prompt('Título de la nueva actividad:');
      if (title && title.trim()) {
        const todayStr = formatDateISO(new Date());
        const nextWeekStr = formatDateISO(new Date(Date.now() + 5 * 86400000));
        const newTask: Task = {
          id: `tsk-${Date.now()}`,
          title: title.trim(),
          categoryId: this.currentProject.categories[0]?.id || 'cat-1',
          startDate: todayStr,
          endDate: nextWeekStr,
          status: 'in_progress'
        };
        this.currentProject.tasks.push(newTask);
        storageService.saveProjects(this.projectsData);
        this.ganttChart?.updateProject(this.currentProject);
      }
    });
  }
}

// Iniciar aplicación
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
