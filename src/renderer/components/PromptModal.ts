export interface PromptModalOptions {
  title: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  onConfirm: (value: string) => void;
  onClose?: () => void;
}

export class PromptModal {
  private options: PromptModalOptions;
  private modalEl: HTMLElement | null = null;

  constructor(options: PromptModalOptions) {
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
      z-index: 10000;
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
          <h3 style="font-size: 15px; font-weight: 600;">${this.options.title}</h3>
          <button class="btn-icon" id="prompt-modal-close" style="width: 24px; height: 24px;">✕</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label style="font-size: 12px; color: var(--text-muted);">${this.options.label}</label>
          <input type="text" id="prompt-modal-input" class="text-input" 
                 placeholder="${this.options.placeholder || ''}" 
                 value="${this.options.defaultValue || ''}" 
                 style="width: 100%;" />
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;">
          <button class="btn-secondary" id="prompt-modal-cancel">Cancelar</button>
          <button class="btn-primary" id="prompt-modal-confirm">${this.options.confirmText || 'Guardar'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);

    // Eventos
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    this.modalEl.querySelector('#prompt-modal-close')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector('#prompt-modal-cancel')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector('#prompt-modal-confirm')?.addEventListener('click', () => this.handleConfirm());

    const input = this.modalEl.querySelector('#prompt-modal-input') as HTMLInputElement;
    input.focus();
    input.select();

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
        window.removeEventListener('keydown', keyHandler);
      } else if (e.key === 'Enter') {
        this.handleConfirm();
        window.removeEventListener('keydown', keyHandler);
      }
    };
    window.addEventListener('keydown', keyHandler);
  }

  private handleConfirm() {
    if (!this.modalEl) return;
    const input = this.modalEl.querySelector('#prompt-modal-input') as HTMLInputElement;
    const val = input.value.trim();
    if (!val) {
      alert('Por favor introduce un valor válido.');
      return;
    }
    this.options.onConfirm(val);
    this.close();
  }

  public close() {
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
      this.modalEl = null;
      if (this.options.onClose) this.options.onClose();
    }
  }
}
