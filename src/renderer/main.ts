import { storageService } from './services/storage';
import { AppConfig } from '../types/config';
import { ProjectsData, Project, Task, TaskStatus } from '../types/project';
import { GanttChart } from './components/GanttChart';
import { MiniWidget } from './components/MiniWidget';
import { TaskModal } from './components/TaskModal';
import { ContextMenu } from './components/ContextMenu';
import { exportGanttToPNG, exportToJSON, importFromJSON } from './services/exporter';

class App {
  private config!: AppConfig;
  private projectsData!: ProjectsData;
  private currentProject!: Project;
  private rootEl!: HTMLElement;
  private ganttChart: GanttChart | null = null;
  private miniWidget: MiniWidget | null = null;

  // Filtros de búsqueda
  private searchQuery = '';
  private selectedCategoryFilter = 'all';

  // Temporizador de inactividad
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private isFadedOut = false;

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

    // Configurar temporizador de auto-desvanecimiento
    this.setupInactivityFade();

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

  private setupInactivityFade() {
    const resetInactivityTimer = () => {
      if (this.isFadedOut) {
        this.isFadedOut = false;
        this.applyOpacity(this.config.opacity);
        this.rootEl.style.opacity = '1';
      }

      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer);
      }

      if (this.config.ghostOnInactivity) {
        const timeoutMs = (this.config.inactivityTimeoutSeconds || 5) * 1000;
        this.inactivityTimer = setTimeout(() => {
          this.isFadedOut = true;
          this.applyOpacity(Math.min(0.20, this.config.opacity));
          this.rootEl.style.opacity = '0.35';
        }, timeoutMs);
      }
    };

    window.addEventListener('mousemove', resetInactivityTimer, { passive: true });
    window.addEventListener('mousedown', resetInactivityTimer, { passive: true });
    window.addEventListener('keydown', resetInactivityTimer, { passive: true });

    resetInactivityTimer();
  }

  public toggleCompactMode() {
    this.config.compactMode = !this.config.compactMode;
    storageService.saveConfig(this.config);
    if (window.electronAPI) {
      window.electronAPI.setCompactMode(this.config.compactMode);
    }
    this.render();
  }

  private activateGhostMode() {
    if (window.electronAPI) {
      window.electronAPI.setIgnoreMouseEvents(true, false);
    }
  }

  private getFilteredTasks(): Task[] {
    return this.currentProject.tasks.filter(task => {
      const matchesSearch = !this.searchQuery || task.title.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesCategory = this.selectedCategoryFilter === 'all' || task.categoryId === this.selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }

  private openTaskModal(taskToEdit?: Task | null) {
    const modal = new TaskModal({
      task: taskToEdit,
      categories: this.currentProject.categories,
      onSave: (taskData) => {
        if (taskData.id) {
          // Edición
          const existing = this.currentProject.tasks.find(t => t.id === taskData.id);
          if (existing) {
            Object.assign(existing, taskData);
          }
        } else {
          // Nueva tarea
          const newTask: Task = {
            id: `tsk-${Date.now()}`,
            title: taskData.title,
            categoryId: taskData.categoryId,
            startDate: taskData.startDate,
            endDate: taskData.endDate,
            status: taskData.status
          };
          this.currentProject.tasks.push(newTask);
        }
        storageService.saveProjects(this.projectsData);
        this.refreshGanttView();
      },
      onDelete: (taskId) => {
        this.currentProject.tasks = this.currentProject.tasks.filter(t => t.id !== taskId);
        storageService.saveProjects(this.projectsData);
        this.refreshGanttView();
      },
      onClose: () => {}
    });

    modal.open();
  }

  private openContextMenu(task: Task, event: MouseEvent) {
    const menu = new ContextMenu({
      x: event.clientX,
      y: event.clientY,
      task,
      onStatusChange: (t, newStatus: TaskStatus) => {
        t.status = newStatus;
        storageService.saveProjects(this.projectsData);
        this.refreshGanttView();
      },
      onEdit: (t) => {
        this.openTaskModal(t);
      },
      onDuplicate: (t) => {
        const duplicated: Task = {
          ...t,
          id: `tsk-${Date.now()}`,
          title: `${t.title} (Copia)`
        };
        this.currentProject.tasks.push(duplicated);
        storageService.saveProjects(this.projectsData);
        this.refreshGanttView();
      },
      onDelete: (t) => {
        if (confirm(`¿Eliminar la actividad "${t.title}"?`)) {
          this.currentProject.tasks = this.currentProject.tasks.filter(item => item.id !== t.id);
          storageService.saveProjects(this.projectsData);
          this.refreshGanttView();
        }
      },
      onClose: () => {}
    });

    menu.open();
  }

  private refreshGanttView() {
    if (this.ganttChart) {
      const displayProject: Project = {
        ...this.currentProject,
        tasks: this.getFilteredTasks()
      };
      this.ganttChart.updateProject(displayProject);
    }
  }

  private render() {
    if (this.config.compactMode) {
      this.renderMiniWidgetView();
    } else {
      this.renderExpandedGantt();
    }
  }

  private renderMiniWidgetView() {
    this.miniWidget = new MiniWidget({
      container: this.rootEl,
      project: this.currentProject,
      onExpand: () => this.toggleCompactMode(),
      onToggleGhost: () => this.activateGhostMode(),
      onClose: () => window.electronAPI?.closeWindow(),
      onTaskStatusChange: (task, newStatus) => {
        task.status = newStatus;
        storageService.saveProjects(this.projectsData);
        this.miniWidget?.render();
      }
    });

    this.miniWidget.render();
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
          <button class="btn-icon" id="btn-export-png" title="Exportar Gantt a PNG">🖼️</button>
          <button class="btn-icon" id="btn-export-json" title="Exportar respaldo JSON">💾</button>
          <button class="btn-icon" id="btn-import-json" title="Importar respaldo JSON">📂</button>
          <input type="file" id="input-import-file" accept=".json" style="display: none;" />
          <button class="btn-icon" id="btn-toggle-ghost" title="Modo Fantasma (Click-Through)">👻</button>
          <button class="btn-icon" id="btn-toggle-compact" title="Minimizar a Mini-Barra HUD">🗗</button>
          <button class="btn-icon btn-close" id="btn-close-app" title="Cerrar">✕</button>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-group">
          <div style="display: flex; align-items: center; gap: 4px;">
            <select id="select-project" class="select-input">
              ${this.projectsData.projects.map(p => `
                <option value="${p.id}" ${p.id === this.currentProject.id ? 'selected' : ''}>${p.name}</option>
              `).join('')}
            </select>
            <button class="btn-icon" id="btn-add-project" title="Crear nuevo proyecto">+</button>
          </div>

          <select id="select-category-filter" class="select-input">
            <option value="all">Todas las Categorías</option>
            ${this.currentProject.categories.map(c => `
              <option value="${c.id}" ${c.id === this.selectedCategoryFilter ? 'selected' : ''}>${c.name}</option>
            `).join('')}
          </select>

          <input type="text" id="input-search" class="text-input" placeholder="🔍 Buscar..." value="${this.searchQuery}" style="width: 110px;" />

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
            <input type="range" id="input-opacity" min="0.3" max="1.0" step="0.05" value="${this.config.opacity}" style="width: 65px;" />
          </label>
          <button class="btn-icon ${this.config.ghostOnInactivity ? 'active' : ''}" id="btn-toggle-inactivity" title="Auto-desvanecer al no usar el ratón">⏳</button>
          <button class="btn-icon" id="btn-toggle-theme" title="Alternar tema claro/oscuro">🌓</button>
          <button class="btn-primary" id="btn-new-task">+ Nueva Tarea</button>
        </div>
      </div>

      <!-- Área de Gantt Montada Dinámicamente -->
      <div class="gantt-main-container" id="gantt-container"></div>
    `;

    // Montar motor GanttChart con tareas filtradas
    const ganttContainer = document.getElementById('gantt-container')!;
    const displayProject: Project = {
      ...this.currentProject,
      tasks: this.getFilteredTasks()
    };

    this.ganttChart = new GanttChart({
      container: ganttContainer,
      project: displayProject,
      config: this.config,
      onTaskChange: (_updatedTask) => {
        storageService.saveProjects(this.projectsData);
      },
      onTaskClick: (task) => {
        this.openTaskModal(task);
      },
      onTaskContextMenu: (task, event) => {
        this.openContextMenu(task, event);
      }
    });

    this.ganttChart.render();

    // Eventos Toolbar y Ventana
    document.getElementById('btn-close-app')?.addEventListener('click', () => window.electronAPI?.closeWindow());
    document.getElementById('btn-toggle-compact')?.addEventListener('click', () => this.toggleCompactMode());
    document.getElementById('btn-toggle-ghost')?.addEventListener('click', () => this.activateGhostMode());

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

    document.getElementById('btn-toggle-inactivity')?.addEventListener('click', () => {
      this.config.ghostOnInactivity = !this.config.ghostOnInactivity;
      storageService.saveConfig(this.config);
      this.setupInactivityFade();
      this.render();
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

    document.getElementById('input-search')?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.refreshGanttView();
    });

    document.getElementById('select-category-filter')?.addEventListener('change', (e) => {
      this.selectedCategoryFilter = (e.target as HTMLSelectElement).value;
      this.refreshGanttView();
    });

    document.getElementById('select-project')?.addEventListener('change', (e) => {
      const projId = (e.target as HTMLSelectElement).value;
      const proj = this.projectsData.projects.find(p => p.id === projId);
      if (proj) {
        this.currentProject = proj;
        this.config.activeProjectId = proj.id;
        storageService.saveConfig(this.config);
        this.render();
      }
    });

    document.getElementById('btn-add-project')?.addEventListener('click', () => {
      const name = prompt('Nombre del nuevo proyecto:');
      if (name && name.trim()) {
        const newProj: Project = {
          id: `proj-${Date.now()}`,
          name: name.trim(),
          createdAt: new Date().toISOString(),
          categories: [
            { id: `cat-${Date.now()}-1`, name: 'General', color: '#3B82F6' },
            { id: `cat-${Date.now()}-2`, name: 'Prioritario', color: '#EF4444' }
          ],
          tasks: []
        };
        this.projectsData.projects.push(newProj);
        this.currentProject = newProj;
        this.config.activeProjectId = newProj.id;
        storageService.saveProjects(this.projectsData);
        storageService.saveConfig(this.config);
        this.render();
      }
    });

    document.getElementById('btn-new-task')?.addEventListener('click', () => {
      this.openTaskModal();
    });

    // Exportaciones e Importaciones
    document.getElementById('btn-export-png')?.addEventListener('click', () => {
      const container = document.getElementById('gantt-container');
      if (container) {
        exportGanttToPNG(container, this.currentProject.name);
      }
    });

    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      exportToJSON(this.projectsData, `${this.currentProject.name.toLowerCase().replace(/\s+/g, '-')}-data.json`);
    });

    const fileInput = document.getElementById('input-import-file') as HTMLInputElement;
    document.getElementById('btn-import-json')?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', async () => {
      if (fileInput.files && fileInput.files[0]) {
        try {
          const imported = await importFromJSON(fileInput.files[0]);
          this.projectsData = imported;
          this.currentProject = this.projectsData.projects[0];
          this.config.activeProjectId = this.currentProject.id;
          storageService.saveProjects(this.projectsData);
          storageService.saveConfig(this.config);
          this.render();
          alert('¡Proyectos importados con éxito!');
        } catch (err) {
          alert(`Error al importar: ${(err as Error).message}`);
        }
      }
    });
  }
}

// Iniciar aplicación
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
