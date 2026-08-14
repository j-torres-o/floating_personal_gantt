import { storageService } from './services/storage';
import { AppConfig } from '../types/config';
import { ProjectsData, Project, Task, TaskGroup, TaskStatus } from '../types/project';
import { GanttChart } from './components/GanttChart';
import { MiniWidget } from './components/MiniWidget';
import { TaskModal } from './components/TaskModal';
import { ProjectModal } from './components/ProjectModal';
import { ContextMenu } from './components/ContextMenu';
import { AboutModal } from './components/AboutModal';
import { UpdateModal } from './components/UpdateModal';
import { exportGanttToPNG, exportToJSON, importFromJSON } from './services/exporter';
import { UpdateInfoResult } from '../types/electron';

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

  // Menú gráfico de herramientas en TitleBar
  private isToolsMenuOpen = false;

  // Temporizador de inactividad
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private isFadedOut = false;

  // Referencia al modal de actualización activo
  private activeUpdateModal: UpdateModal | null = null;

  public async init() {
    this.rootEl = document.getElementById('app-root')!;
    
    // Cargar datos desacoplados con validación
    this.config = await storageService.loadConfig();
    this.projectsData = await storageService.loadProjects();

    if (!this.projectsData || !Array.isArray(this.projectsData.projects) || this.projectsData.projects.length === 0) {
      this.projectsData = {
        version: '0.6.1',
        projects: [
          {
            id: 'proj-001',
            name: 'Mi Primer Proyecto',
            createdAt: new Date().toISOString(),
            groups: [
              { id: 'grp-01', name: 'Fase Inicial', color: '#8B5CF6' }
            ],
            categories: [
              { id: 'cat-01', name: 'Desarrollo', color: '#3B82F6' },
              { id: 'cat-02', name: 'Diseño', color: '#10B981' }
            ],
            tasks: []
          }
        ]
      };
    }

    // Seleccionar proyecto activo
    this.currentProject = this.projectsData.projects.find(p => p.id === this.config.activeProjectId) || this.projectsData.projects[0];

    if (!this.currentProject) {
      this.currentProject = this.projectsData.projects[0];
    }

    if (!this.currentProject.groups) {
      this.currentProject.groups = [];
    }
    if (!this.currentProject.tasks) {
      this.currentProject.tasks = [];
    }
    if (!this.currentProject.categories) {
      this.currentProject.categories = [];
    }

    // Aplicar tema y opacidad inicial
    this.applyTheme(this.config.theme || 'dark');
    this.applyOpacity(this.config.compactMode ? this.config.opacity : 1.0);

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

      // Escuchar progreso de descarga de actualizaciones
      if (typeof window.electronAPI.onUpdateDownloadProgress === 'function') {
        window.electronAPI.onUpdateDownloadProgress((percent) => {
          if (this.activeUpdateModal) {
            this.activeUpdateModal.updateProgress(percent);
          }
        });
      }
    }

    this.render();

    // Comprobar actualizaciones automáticamente de fondo
    this.checkForUpdatesSilently();
  }

  private async checkForUpdatesSilently() {
    if (!window.electronAPI) return;
    try {
      const updateInfo = await window.electronAPI.checkForUpdates();
      if (updateInfo.hasUpdate && updateInfo.downloadUrl) {
        this.showUpdateModal(updateInfo);
      }
    } catch (err) {
      console.warn('No se pudo verificar actualización en inicio:', err);
    }
  }

  private showUpdateModal(updateInfo: UpdateInfoResult) {
    this.activeUpdateModal = new UpdateModal({
      updateInfo,
      onConfirmUpdate: async () => {
        if (window.electronAPI && updateInfo.downloadUrl) {
          try {
            await window.electronAPI.downloadAndInstallUpdate(updateInfo.downloadUrl, updateInfo.assetName || 'update.exe');
          } catch (err) {
            alert(`Error al descargar la actualización: ${(err as Error).message}`);
            this.activeUpdateModal?.close();
          }
        }
      },
      onClose: () => {
        this.activeUpdateModal = null;
      }
    });
    this.activeUpdateModal.open();
  }

  private async openAboutModal() {
    let currentVer = '0.6.3';
    if (window.electronAPI?.getAppVersion) {
      try {
        currentVer = await window.electronAPI.getAppVersion();
      } catch {
        currentVer = '0.6.3';
      }
    }
    const modal = new AboutModal({
      currentVersion: currentVer,
      onCheckUpdates: async () => {
        if (!window.electronAPI) return;
        try {
          const updateInfo = await window.electronAPI.checkForUpdates();
          if (updateInfo.hasUpdate && updateInfo.downloadUrl) {
            this.showUpdateModal(updateInfo);
          } else {
            alert(`✨ ¡Tienes la versión más reciente instalada! (v${currentVer})`);
          }
        } catch (err) {
          alert(`Error al buscar actualizaciones: ${(err as Error).message}`);
        }
      },
      onClose: () => {}
    });
    modal.open();
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
        if (this.config.compactMode) {
          this.applyOpacity(this.config.opacity);
        }
        this.rootEl.style.opacity = '1';
      }

      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer);
      }

      if (this.config.compactMode && this.config.ghostOnInactivity) {
        const mins = typeof this.config.inactivityTimeoutMinutes === 'number' ? this.config.inactivityTimeoutMinutes : 2;
        const timeoutMs = Math.max(10000, mins * 60 * 1000);
        this.inactivityTimer = setTimeout(() => {
          this.isFadedOut = true;
          this.applyOpacity(Math.min(0.15, this.config.opacity));
          this.rootEl.style.opacity = '0.25';
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
    this.applyOpacity(this.config.compactMode ? this.config.opacity : 1.0);
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
      const matchesCategory = this.selectedCategoryFilter === 'all' || 
        (this.selectedCategoryFilter === 'uncategorized' && !task.categoryId) ||
        task.categoryId === this.selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }

  private openTaskModal(taskToEdit?: Task | null) {
    const modal = new TaskModal({
      task: taskToEdit,
      categories: this.currentProject.categories,
      groups: this.currentProject.groups || [],
      onSave: (taskData) => {
        let assignedGroupId = taskData.groupId;

        if (taskData.newGroupName) {
          const newGrp: TaskGroup = {
            id: `grp-${Date.now()}`,
            name: taskData.newGroupName,
            color: '#8B5CF6'
          };
          if (!this.currentProject.groups) {
            this.currentProject.groups = [];
          }
          this.currentProject.groups.push(newGrp);
          assignedGroupId = newGrp.id;
        }

        if (taskData.id) {
          const existing = this.currentProject.tasks.find(t => t.id === taskData.id);
          if (existing) {
            existing.title = taskData.title;
            existing.categoryId = taskData.categoryId;
            existing.groupId = assignedGroupId;
            existing.startDate = taskData.startDate;
            existing.endDate = taskData.endDate;
            existing.status = taskData.status;
          }
        } else {
          const newTask: Task = {
            id: `tsk-${Date.now()}`,
            title: taskData.title,
            categoryId: taskData.categoryId,
            groupId: assignedGroupId,
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

  private openProjectModal() {
    const modal = new ProjectModal({
      onSave: (name) => {
        const newProj: Project = {
          id: `proj-${Date.now()}`,
          name: name.trim(),
          createdAt: new Date().toISOString(),
          groups: [], // Proyecto limpio sin grupos por defecto
          categories: [
            { id: `cat-${Date.now()}-1`, name: 'Desarrollo', color: '#3B82F6' },
            { id: `cat-${Date.now()}-2`, name: 'Diseño', color: '#10B981' }
          ],
          tasks: []
        };
        this.projectsData.projects.push(newProj);
        this.currentProject = newProj;
        this.config.activeProjectId = newProj.id;
        storageService.saveProjects(this.projectsData);
        storageService.saveConfig(this.config);
        this.render();
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
      allProjects: this.projectsData.projects,
      onSelectProject: (projId) => {
        const proj = this.projectsData.projects.find(p => p.id === projId);
        if (proj) {
          this.currentProject = proj;
          this.config.activeProjectId = proj.id;
          storageService.saveConfig(this.config);
          this.miniWidget?.updateProject(this.currentProject, this.projectsData.projects);
        }
      },
      onExpand: () => this.toggleCompactMode(),
      onToggleGhost: () => this.activateGhostMode(),
      onClose: () => window.electronAPI?.closeWindow(),
      onTaskStatusChange: (task, newStatus) => {
        const target = this.currentProject.tasks.find(t => t.id === task.id);
        if (target) {
          target.status = newStatus;
        }
        storageService.saveProjects(this.projectsData);
        this.miniWidget?.updateProject(this.currentProject, this.projectsData.projects);
      }
    });

    this.miniWidget.render();
  }

  private renderExpandedGantt() {
    this.rootEl.innerHTML = `
      <!-- TitleBar con Menú Gráfico de herramientas -->
      <div class="titlebar" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid var(--grid-line);">
        <div class="titlebar-left" style="display: flex; align-items: center; gap: 8px;">
          <span class="app-badge">Personal Gantt</span>
        </div>
        
        <div class="titlebar-actions" style="display: flex; align-items: center; gap: 4px; -webkit-app-region: no-drag; position: relative;">
          <!-- Menú Gráfico de Herramientas desplegable -->
          <div style="position: relative;">
            <button class="btn-icon" id="btn-toggle-tools-menu" title="Herramientas y Configuración">⚙️</button>
            <div id="tools-dropdown-menu" style="display: ${this.isToolsMenuOpen ? 'flex' : 'none'}; position: absolute; top: 32px; right: 0; background: var(--bg-panel); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid var(--border-glass-bright); border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 9999; min-width: 250px; flex-direction: column; padding: 8px; gap: 4px;">
              <div class="menu-item" id="tool-toggle-theme" style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                <span>🌓</span> Alternar Tema (Claro / Oscuro)
              </div>

              <!-- Toggle Ejecutar al Iniciar Windows -->
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; font-size: 12px;" title="Inicia la aplicación automáticamente al arrancar el sistema operativo Windows">
                <label for="check-launch-startup" style="cursor: pointer;">
                  Iniciar con Windows
                </label>
                <input type="checkbox" id="check-launch-startup" ${this.config.launchOnStartup ? 'checked' : ''} style="cursor: pointer;" />
              </div>

              <!-- Configuración de Autodesvanecimiento por Inactividad -->
              <div style="display: flex; flex-direction: column; gap: 4px; padding: 6px 10px; border-radius: 4px; background: rgba(255,255,255,0.02);" title="Atenúa la ventana automáticamente tras el tiempo seleccionado sin mover el ratón">
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px;">
                  <label for="check-inactivity-fade" style="cursor: pointer;">
                    Autodesvanecer por inactividad
                  </label>
                  <input type="checkbox" id="check-inactivity-fade" ${this.config.ghostOnInactivity ? 'checked' : ''} style="cursor: pointer;" />
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; margin-top: 2px;">
                  <span style="color: var(--text-muted);">Tiempo de espera:</span>
                  <select id="select-inactivity-mins" class="select-input" style="font-size: 11px; padding: 2px 4px; height: 22px;">
                    <option value="1" ${(this.config.inactivityTimeoutMinutes || 2) === 1 ? 'selected' : ''}>1 minuto</option>
                    <option value="2" ${(this.config.inactivityTimeoutMinutes || 2) === 2 ? 'selected' : ''}>2 minutos (por defecto)</option>
                    <option value="5" ${(this.config.inactivityTimeoutMinutes || 2) === 5 ? 'selected' : ''}>5 minutos</option>
                    <option value="10" ${(this.config.inactivityTimeoutMinutes || 2) === 10 ? 'selected' : ''}>10 minutos</option>
                  </select>
                </div>
              </div>
              
              <div style="height: 1px; background: var(--grid-line); margin: 3px 0;"></div>
              
              <!-- Control de Opacidad del Modo Mini -->
              <div style="padding: 4px 10px; display: flex; flex-direction: column; gap: 4px;" title="Ajusta el nivel de transparencia de la ventana en el modo mini HUD flotante">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Opacidad Mini:</span>
                  <input type="range" id="tool-input-opacity" min="0.05" max="1.0" step="0.05" value="${this.config.opacity}" style="width: 80px;" />
                </div>
              </div>

              <div style="height: 1px; background: var(--grid-line); margin: 3px 0;"></div>

              <div class="menu-item" id="tool-export-png" title="Genera y guarda una imagen PNG en alta resolución del diagrama de Gantt actual" style="padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                Exportar Gantt a PNG
              </div>
              <div class="menu-item" id="tool-export-json" title="Guarda una copia de respaldo completa con todos tus proyectos, grupos y tareas en formato JSON" style="padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                Exportar Respaldo JSON
              </div>
              <div class="menu-item" id="tool-import-json" title="Restaura todos tus proyectos y actividades desde un archivo de respaldo JSON previo" style="padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                Importar Respaldo JSON
              </div>
              
              <div style="height: 1px; background: var(--grid-line); margin: 3px 0;"></div>
              
              <div class="menu-item" id="tool-toggle-ghost" title="Activa la transparencia total para que el cursor haga clic en las ventanas y aplicaciones que están detrás" style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                <span>👻</span> Activar Modo Fantasma
              </div>

              <div style="height: 1px; background: var(--grid-line); margin: 3px 0;"></div>

              <div class="menu-item" id="tool-open-about" style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; color: var(--accent-primary);">
                <span>ℹ️</span> Acerca de Floating Gantt
              </div>
            </div>
          </div>

          <input type="file" id="input-import-file" accept=".json" style="display: none;" />
          <button class="btn-icon" id="btn-toggle-compact" title="Minimizar a Mini-Barra HUD">🗗</button>
          <button class="btn-icon btn-close" id="btn-close-app" title="Cerrar">✕</button>
        </div>
      </div>

      <!-- Toolbar Responsive Limpia -->
      <div class="toolbar" style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 12px; border-bottom: 1px solid var(--grid-line);">
        <div class="toolbar-group" style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <select id="select-project" class="select-input" style="font-weight: 500;">
              ${this.projectsData.projects.map(p => `
                <option value="${p.id}" ${p.id === this.currentProject.id ? 'selected' : ''}>${p.name}</option>
              `).join('')}
            </select>
            <button class="btn-secondary" id="btn-add-project" title="Crear un nuevo proyecto" style="font-size: 11px; padding: 4px 8px;">Nuevo</button>
            <button class="btn-secondary" id="btn-rename-project" title="Renombrar el proyecto actual" style="font-size: 11px; padding: 4px 8px;">Renombrar</button>
            <button class="btn-secondary" id="btn-delete-project" title="Eliminar el proyecto actual" style="font-size: 11px; padding: 4px 8px;">Eliminar</button>
          </div>

          <select id="select-category-filter" class="select-input">
            <option value="all">Todas las Categorías</option>
            <option value="uncategorized">Sin Categoría</option>
            ${this.currentProject.categories.map(c => `
              <option value="${c.id}" ${c.id === this.selectedCategoryFilter ? 'selected' : ''}>${c.name}</option>
            `).join('')}
          </select>

          <input type="text" id="input-search" class="text-input" placeholder="🔍 Buscar actividad..." value="${this.searchQuery}" style="width: 130px;" />

          <select id="select-scale" class="select-input">
            <option value="days" ${this.config.timeScale === 'days' ? 'selected' : ''}>Días</option>
            <option value="weeks" ${this.config.timeScale === 'weeks' ? 'selected' : ''}>Semanas</option>
            <option value="months" ${this.config.timeScale === 'months' ? 'selected' : ''}>Meses</option>
          </select>

          <button class="btn-secondary" id="btn-today">📍 Hoy</button>
        </div>
      </div>

      <!-- Área de Gantt Montada Dinámicamente -->
      <div class="gantt-main-container" id="gantt-container"></div>
    `;

    // Montar motor GanttChart
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
      },
      onNewTaskClick: () => {
        this.openTaskModal();
      },
      onRenameGroup: (groupId, newName) => {
        const grp = (this.currentProject.groups || []).find(g => g.id === groupId);
        if (grp) {
          grp.name = newName;
          storageService.saveProjects(this.projectsData);
          this.refreshGanttView();
        }
      },
      onDeleteGroup: (groupId) => {
        this.currentProject.groups = (this.currentProject.groups || []).filter(g => g.id !== groupId);
        this.currentProject.tasks = this.currentProject.tasks.filter(t => t.groupId !== groupId);
        storageService.saveProjects(this.projectsData);
        this.refreshGanttView();
      }
    });

    this.ganttChart.render();

    // Eventos Toolbar y Ventana
    document.getElementById('btn-close-app')?.addEventListener('click', () => window.electronAPI?.closeWindow());
    document.getElementById('btn-toggle-compact')?.addEventListener('click', () => this.toggleCompactMode());
    document.getElementById('btn-today')?.addEventListener('click', () => this.ganttChart?.scrollToToday());

    // Menú Gráfico de Herramientas
    const toolsMenu = document.getElementById('tools-dropdown-menu');
    const toolsBtn = document.getElementById('btn-toggle-tools-menu');

    toolsMenu?.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    toolsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isToolsMenuOpen = !this.isToolsMenuOpen;
      if (toolsMenu) toolsMenu.style.display = this.isToolsMenuOpen ? 'flex' : 'none';
    });

    window.addEventListener('click', (e) => {
      if (this.isToolsMenuOpen && toolsMenu && !toolsMenu.contains(e.target as Node) && !toolsBtn?.contains(e.target as Node)) {
        this.isToolsMenuOpen = false;
        toolsMenu.style.display = 'none';
      }
    });

    document.getElementById('tool-toggle-theme')?.addEventListener('click', () => {
      this.config.theme = this.config.theme === 'dark' ? 'light' : 'dark';
      this.applyTheme(this.config.theme);
      storageService.saveConfig(this.config);
      this.ganttChart?.updateConfig(this.config);
    });

    document.getElementById('check-launch-startup')?.addEventListener('change', async (e) => {
      const isChecked = (e.target as HTMLInputElement).checked;
      this.config.launchOnStartup = isChecked;
      storageService.saveConfig(this.config);
      if (window.electronAPI) {
        await window.electronAPI.setLaunchOnStartup(isChecked);
      }
    });

    document.getElementById('tool-open-about')?.addEventListener('click', () => {
      this.isToolsMenuOpen = false;
      if (toolsMenu) toolsMenu.style.display = 'none';
      this.openAboutModal();
    });

    document.getElementById('tool-toggle-ghost')?.addEventListener('click', () => this.activateGhostMode());

    document.getElementById('tool-input-opacity')?.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.config.opacity = val;
      storageService.saveConfig(this.config);
    });

    document.getElementById('tool-export-png')?.addEventListener('click', () => {
      const container = document.getElementById('gantt-container');
      if (container) {
        exportGanttToPNG(container, this.currentProject.name);
      }
    });

    document.getElementById('tool-export-json')?.addEventListener('click', () => {
      exportToJSON(this.projectsData, `${this.currentProject.name.toLowerCase().replace(/\s+/g, '-')}-data.json`);
    });

    const fileInput = document.getElementById('input-import-file') as HTMLInputElement;
    document.getElementById('tool-import-json')?.addEventListener('click', () => {
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

    document.getElementById('check-inactivity-fade')?.addEventListener('change', (e) => {
      this.config.ghostOnInactivity = (e.target as HTMLInputElement).checked;
      storageService.saveConfig(this.config);
      this.setupInactivityFade();
    });

    document.getElementById('select-inactivity-mins')?.addEventListener('change', (e) => {
      const mins = parseInt((e.target as HTMLSelectElement).value, 10) || 2;
      this.config.inactivityTimeoutMinutes = mins;
      this.config.inactivityTimeoutSeconds = mins * 60;
      storageService.saveConfig(this.config);
      this.setupInactivityFade();
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
      this.openProjectModal();
    });

    document.getElementById('btn-rename-project')?.addEventListener('click', () => {
      const newName = prompt('Introduce el nuevo nombre para el proyecto actual:', this.currentProject.name);
      if (newName && newName.trim() && newName.trim() !== this.currentProject.name) {
        this.currentProject.name = newName.trim();
        storageService.saveProjects(this.projectsData);
        this.render();
      }
    });

    document.getElementById('btn-delete-project')?.addEventListener('click', () => {
      if (this.projectsData.projects.length <= 1) {
        alert('No es posible eliminar el único proyecto disponible.');
        return;
      }

      const tasksCount = (this.currentProject.tasks || []).length;
      const confirmMsg = tasksCount > 0
        ? `¿Estás seguro de eliminar el proyecto "${this.currentProject.name}" con sus ${tasksCount} actividad(es)? Esta acción no se puede deshacer.`
        : `¿Estás seguro de eliminar el proyecto "${this.currentProject.name}"?`;

      if (confirm(confirmMsg)) {
        const deletedId = this.currentProject.id;
        this.projectsData.projects = this.projectsData.projects.filter(p => p.id !== deletedId);
        this.currentProject = this.projectsData.projects[0];
        this.config.activeProjectId = this.currentProject.id;
        storageService.saveProjects(this.projectsData);
        storageService.saveConfig(this.config);
        this.render();
      }
    });
  }
}

function startApp() {
  const app = new App();
  app.init().catch((err) => {
    console.error('Error al inicializar Floating Personal Gantt:', err);
    const root = document.getElementById('app-root');
    if (root) {
      root.innerHTML = `
        <div style="padding: 20px; color: #EF4444; font-family: sans-serif; background: rgba(0,0,0,0.8); border-radius: 8px;">
          <h3>Error al cargar la aplicación</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

