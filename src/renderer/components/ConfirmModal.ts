export interface ConfirmModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export class ConfirmModal {
  private options: ConfirmModalOptions;
  private modalEl: HTMLElement | null = null;

  constructor(options: ConfirmModalOptions) {
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

    const confirmBtnBg = this.options.isDanger ? 'rgba(239, 68, 68, 0.25)' : 'var(--accent-glow)';
    const confirmBtnBorder = this.options.isDanger ? '#EF4444' : 'var(--accent-primary)';
    const confirmBtnColor = this.options.isDanger ? '#FCA5A5' : 'var(--accent-primary)';

    this.modalEl.innerHTML = `
      <div class="modal-card" style="
        background: var(--bg-panel);
        border: 1px solid var(--border-glass-bright);
        border-radius: var(--radius-lg);
        width: 380px;
        max-width: 90vw;
        padding: 22px;
        box-shadow: var(--glass-shadow);
        display: flex;
        flex-direction: column;
        gap: 16px;
        color: var(--text-main);
      ">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h3 style="font-size: 16px; font-weight: 600;">${this.options.title}</h3>
          <button class="btn-icon" id="confirm-modal-close" style="width: 24px; height: 24px;">✕</button>
        </div>

        <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin: 0;">
          ${this.options.message}
        </p>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;">
          <button class="btn-secondary" id="confirm-modal-cancel">
            ${this.options.cancelText || 'Cancelar'}
          </button>
          <button class="btn-primary" id="confirm-modal-action" style="
            background: ${confirmBtnBg};
            border: 1px solid ${confirmBtnBorder};
            color: ${confirmBtnColor};
          ">
            ${this.options.confirmText || 'Confirmar'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close(false);
    });

    this.modalEl.querySelector('#confirm-modal-close')?.addEventListener('click', () => this.close(false));
    this.modalEl.querySelector('#confirm-modal-cancel')?.addEventListener('click', () => this.close(false));
    this.modalEl.querySelector('#confirm-modal-action')?.addEventListener('click', () => this.close(true));

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close(false);
        window.removeEventListener('keydown', keyHandler);
      } else if (e.key === 'Enter') {
        this.close(true);
        window.removeEventListener('keydown', keyHandler);
      }
    };
    window.addEventListener('keydown', keyHandler);
  }

  public close(confirmed: boolean) {
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
      this.modalEl = null;
      if (confirmed) {
        this.options.onConfirm();
      } else if (this.options.onCancel) {
        this.options.onCancel();
      }
    }
  }
}
