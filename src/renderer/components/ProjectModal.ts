export interface ProjectModalOptions {
  onSave: (projectName: string) => void;
  onClose: () => void;
}

export class ProjectModal {
  private options: ProjectModalOptions;
  private modalEl: HTMLElement | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(options: ProjectModalOptions) {
    this.options = options;
  }

  public open() {
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
        width: 360px;
        max-width: 90vw;
        padding: 20px;
        box-shadow: var(--glass-shadow);
        display: flex;
        flex-direction: column;
        gap: 14px;
        color: var(--text-main);
      ">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h3 style="font-size: 16px; font-weight: 600;">Nuevo Proyecto</h3>
          <button class="btn-icon" id="project-modal-close" style="width: 26px; height: 26px;">✕</button>
        </div>

        <div id="project-modal-error" style="display: none; font-size: 12px; color: #EF4444; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 6px; padding: 6px 10px;"></div>

        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label style="font-size: 12px; color: var(--text-muted);">Nombre del Proyecto:</label>
          <input type="text" id="project-modal-name" class="text-input" placeholder="Ej. Lanzamiento Web 2026" style="width: 100%;" autofocus />
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
          <button class="btn-secondary" id="project-modal-cancel">Cancelar</button>
          <button class="btn-primary" id="project-modal-save">Crear Proyecto</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);

    // Eventos
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    this.modalEl.querySelector('#project-modal-close')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector('#project-modal-cancel')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector('#project-modal-save')?.addEventListener('click', () => this.handleSave());

    const input = this.modalEl.querySelector('#project-modal-name') as HTMLInputElement;
    input.focus();

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'Enter') {
        this.handleSave();
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  private showError(msg: string) {
    if (!this.modalEl) return;
    const errBox = this.modalEl.querySelector('#project-modal-error') as HTMLElement;
    if (errBox) {
      errBox.textContent = `⚠️ ${msg}`;
      errBox.style.display = 'block';
    }
    const input = this.modalEl.querySelector('#project-modal-name') as HTMLInputElement;
    if (input) input.focus();
  }

  private handleSave() {
    if (!this.modalEl) return;
    const input = this.modalEl.querySelector('#project-modal-name') as HTMLInputElement;
    const name = input.value.trim();
    if (!name) {
      this.showError('Por favor introduce un nombre para el proyecto.');
      return;
    }
    this.options.onSave(name);
    this.close();
  }

  public close() {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
      this.modalEl = null;
      this.options.onClose();
    }
  }
}
