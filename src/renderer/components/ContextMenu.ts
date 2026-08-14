import { Task, TaskStatus } from '../../types/project';

export interface ContextMenuOptions {
  x: number;
  y: number;
  task: Task;
  onStatusChange: (task: Task, newStatus: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  onDelete: (task: Task) => void;
  onClose: () => void;
}

export class ContextMenu {
  private options: ContextMenuOptions;
  private menuEl: HTMLElement | null = null;

  constructor(options: ContextMenuOptions) {
    this.options = options;
  }

  public open() {
    this.menuEl = document.createElement('div');
    this.menuEl.className = 'context-menu-floating';
    
    // Asegurar que no se salga de los bordes de la ventana
    const posX = Math.min(this.options.x, window.innerWidth - 200);
    const posY = Math.min(this.options.y, window.innerHeight - 220);

    this.menuEl.style.cssText = `
      position: fixed;
      left: ${posX}px;
      top: ${posY}px;
      background: var(--bg-panel);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border-glass-bright);
      border-radius: var(--radius-md);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      z-index: 10000;
      min-width: 190px;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 13px;
      color: var(--text-main);
      animation: fadeIn 0.1s ease-out;
    `;

    this.menuEl.innerHTML = `
      <div style="padding: 6px 10px; font-weight: 600; font-size: 11px; color: var(--text-muted); text-transform: uppercase; border-bottom: 1px solid var(--grid-line); margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${this.options.task.title}
      </div>

      <div class="menu-item" id="ctx-status-pending" style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: var(--radius-sm); cursor: pointer;">
        <span>⏳</span> Cambiar a Pendiente
      </div>
      <div class="menu-item" id="ctx-status-progress" style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: var(--radius-sm); cursor: pointer;">
        <span>🚀</span> Cambiar a En Curso
      </div>
      <div class="menu-item" id="ctx-status-completed" style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: var(--radius-sm); cursor: pointer;">
        <span>✅</span> Marcar como Finalizada
      </div>

      <div style="height: 1px; background: var(--grid-line); margin: 4px 0;"></div>

      <div class="menu-item" id="ctx-action-edit" style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: var(--radius-sm); cursor: pointer;">
        <span>✏️</span> Editar Actividad...
      </div>
      <div class="menu-item" id="ctx-action-duplicate" style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: var(--radius-sm); cursor: pointer;">
        <span>📋</span> Duplicar
      </div>
      <div class="menu-item" id="ctx-action-delete" style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: var(--radius-sm); cursor: pointer; color: #EF4444;">
        <span>🗑️</span> Eliminar
      </div>
    `;

    document.body.appendChild(this.menuEl);

    // Hover styles
    const items = this.menuEl.querySelectorAll('.menu-item');
    items.forEach(el => {
      el.addEventListener('mouseenter', () => {
        (el as HTMLElement).style.background = 'var(--bg-glass-card-hover)';
      });
      el.addEventListener('mouseleave', () => {
        (el as HTMLElement).style.background = 'transparent';
      });
    });

    // Eventos de opciones
    this.menuEl.querySelector('#ctx-status-pending')?.addEventListener('click', () => {
      this.options.onStatusChange(this.options.task, 'pending');
      this.close();
    });

    this.menuEl.querySelector('#ctx-status-progress')?.addEventListener('click', () => {
      this.options.onStatusChange(this.options.task, 'in_progress');
      this.close();
    });

    this.menuEl.querySelector('#ctx-status-completed')?.addEventListener('click', () => {
      this.options.onStatusChange(this.options.task, 'completed');
      this.close();
    });

    this.menuEl.querySelector('#ctx-action-edit')?.addEventListener('click', () => {
      this.options.onEdit(this.options.task);
      this.close();
    });

    this.menuEl.querySelector('#ctx-action-duplicate')?.addEventListener('click', () => {
      this.options.onDuplicate(this.options.task);
      this.close();
    });

    this.menuEl.querySelector('#ctx-action-delete')?.addEventListener('click', () => {
      this.options.onDelete(this.options.task);
      this.close();
    });

    // Cerrar al hacer clic fuera
    const closeListener = (e: MouseEvent) => {
      if (this.menuEl && !this.menuEl.contains(e.target as Node)) {
        this.close();
        window.removeEventListener('click', closeListener);
        window.removeEventListener('contextmenu', closeListener);
      }
    };

    setTimeout(() => {
      window.addEventListener('click', closeListener);
      window.addEventListener('contextmenu', closeListener);
    }, 50);
  }

  public close() {
    if (this.menuEl && this.menuEl.parentNode) {
      this.menuEl.parentNode.removeChild(this.menuEl);
      this.menuEl = null;
      this.options.onClose();
    }
  }
}
