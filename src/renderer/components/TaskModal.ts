import { Category, Task, TaskStatus } from '../../types/project';
import { formatDateISO } from '../services/dateUtils';

export interface TaskModalOptions {
  task?: Task | null;
  categories: Category[];
  defaultStartDate?: string;
  onSave: (taskData: Omit<Task, 'id'> & { id?: string }) => void;
  onDelete?: (taskId: string) => void;
  onClose: () => void;
}

export class TaskModal {
  private options: TaskModalOptions;
  private modalEl: HTMLElement | null = null;

  constructor(options: TaskModalOptions) {
    this.options = options;
  }

  public open() {
    const isEdit = !!this.options.task;
    const task = this.options.task;
    const todayStr = formatDateISO(new Date());
    const nextWeekStr = formatDateISO(new Date(Date.now() + 5 * 86400000));

    const initialTitle = task?.title || '';
    const initialCategoryId = task?.categoryId || this.options.categories[0]?.id || '';
    const initialStartDate = task?.startDate || this.options.defaultStartDate || todayStr;
    const initialEndDate = task?.endDate || nextWeekStr;
    const initialStatus: TaskStatus = task?.status || 'in_progress';

    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-backdrop';
    this.modalEl.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.15s ease-out;
    `;

    this.modalEl.innerHTML = `
      <div class="modal-card" style="
        background: var(--bg-panel);
        border: 1px solid var(--border-glass-bright);
        border-radius: var(--radius-lg);
        width: 380px;
        max-width: 90vw;
        padding: 20px;
        box-shadow: var(--glass-shadow);
        display: flex;
        flex-direction: column;
        gap: 14px;
        color: var(--text-main);
      ">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h3 style="font-size: 16px; font-weight: 600;">${isEdit ? 'Editar Actividad' : 'Nueva Actividad'}</h3>
          <button class="btn-icon" id="modal-btn-close" style="width: 26px; height: 26px;">✕</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label style="font-size: 12px; color: var(--text-muted);">Nombre de la Tarea:</label>
          <input type="text" id="modal-task-title" class="text-input" value="${initialTitle}" placeholder="Ej. Lanzamiento de Versión" style="width: 100%;" autofocus />
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label style="font-size: 12px; color: var(--text-muted);">Categoría:</label>
          <select id="modal-task-category" class="select-input" style="width: 100%;">
            ${this.options.categories.map(c => `
              <option value="${c.id}" ${c.id === initialCategoryId ? 'selected' : ''}>${c.name}</option>
            `).join('')}
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 12px; color: var(--text-muted);">Inicio:</label>
            <input type="date" id="modal-task-start" class="text-input" value="${initialStartDate}" style="width: 100%;" />
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 12px; color: var(--text-muted);">Fin:</label>
            <input type="date" id="modal-task-end" class="text-input" value="${initialEndDate}" style="width: 100%;" />
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label style="font-size: 12px; color: var(--text-muted);">Estado:</label>
          <select id="modal-task-status" class="select-input" style="width: 100%;">
            <option value="pending" ${initialStatus === 'pending' ? 'selected' : ''}>⏳ Pendiente</option>
            <option value="in_progress" ${initialStatus === 'in_progress' ? 'selected' : ''}>🚀 En Curso</option>
            <option value="completed" ${initialStatus === 'completed' ? 'selected' : ''}>✅ Finalizada</option>
          </select>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px;">
          ${isEdit && this.options.onDelete ? `
            <button class="btn-secondary" id="modal-btn-delete" style="color: #EF4444; border-color: rgba(239,68,68,0.3);">
              🗑️ Eliminar
            </button>
          ` : '<div></div>'}
          
          <div style="display: flex; gap: 8px;">
            <button class="btn-secondary" id="modal-btn-cancel">Cancelar</button>
            <button class="btn-primary" id="modal-btn-save">Guardar</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);

    // Bind eventos
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    this.modalEl.querySelector('#modal-btn-close')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector('#modal-btn-cancel')?.addEventListener('click', () => this.close());

    this.modalEl.querySelector('#modal-btn-delete')?.addEventListener('click', () => {
      if (task && this.options.onDelete) {
        this.options.onDelete(task.id);
        this.close();
      }
    });

    this.modalEl.querySelector('#modal-btn-save')?.addEventListener('click', () => {
      this.handleSave(isEdit ? task?.id : undefined);
    });

    // Tecla Escape para salir y Enter para guardar
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
        window.removeEventListener('keydown', keyHandler);
      } else if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
        this.handleSave(isEdit ? task?.id : undefined);
        window.removeEventListener('keydown', keyHandler);
      }
    };
    window.addEventListener('keydown', keyHandler);
  }

  private handleSave(taskId?: string) {
    if (!this.modalEl) return;

    const title = (this.modalEl.querySelector('#modal-task-title') as HTMLInputElement).value.trim();
    const categoryId = (this.modalEl.querySelector('#modal-task-category') as HTMLSelectElement).value;
    const startDate = (this.modalEl.querySelector('#modal-task-start') as HTMLInputElement).value;
    const endDate = (this.modalEl.querySelector('#modal-task-end') as HTMLInputElement).value;
    const status = (this.modalEl.querySelector('#modal-task-status') as HTMLSelectElement).value as TaskStatus;

    if (!title) {
      alert('Por favor introduce un nombre para la actividad.');
      return;
    }

    if (startDate > endDate) {
      alert('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    this.options.onSave({
      id: taskId,
      title,
      categoryId,
      startDate,
      endDate,
      status
    });

    this.close();
  }

  public close() {
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
      this.modalEl = null;
      this.options.onClose();
    }
  }
}
