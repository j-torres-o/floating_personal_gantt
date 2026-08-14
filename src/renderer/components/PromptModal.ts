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
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

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

        <div id="prompt-modal-error" style="display: none; font-size: 12px; color: #EF4444; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 6px; padding: 6px 10px;"></div>

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

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'Enter') {
        this.handleConfirm();
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  private showError(msg: string) {
    if (!this.modalEl) return;
    const errBox = this.modalEl.querySelector('#prompt-modal-error') as HTMLElement;
    if (errBox) {
      errBox.textContent = `⚠️ ${msg}`;
      errBox.style.display = 'block';
    }
    const input = this.modalEl.querySelector('#prompt-modal-input') as HTMLInputElement;
    if (input) input.focus();
  }

  private handleConfirm() {
    if (!this.modalEl) return;
    const input = this.modalEl.querySelector('#prompt-modal-input') as HTMLInputElement;
    const val = input.value.trim();
    if (!val) {
      this.showError('Por favor introduce un valor válido.');
      return;
    }
    this.options.onConfirm(val);
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
      if (this.options.onClose) this.options.onClose();
    }
  }
}
