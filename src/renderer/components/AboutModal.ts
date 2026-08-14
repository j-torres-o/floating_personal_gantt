export interface AboutModalOptions {
  currentVersion: string;
  onCheckUpdates: () => void;
  onClose: () => void;
}

export class AboutModal {
  private options: AboutModalOptions;
  private modalEl: HTMLElement | null = null;

  constructor(options: AboutModalOptions) {
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
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
        width: 360px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 14px;
        position: relative;
        color: var(--text-main);
      ">
        <button id="btn-close-about-modal" style="
          position: absolute;
          top: 12px;
          right: 12px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 16px;
          cursor: pointer;
        ">✕</button>

        <div style="
          width: 52px;
          height: 52px;
          border-radius: 12px;
          background: var(--accent-glow);
          border: 1px solid var(--accent-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
        ">
          📊
        </div>

        <div>
          <h2 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">Floating Personal Gantt</h2>
          <span style="font-size: 12px; color: var(--accent-primary); font-weight: 600; background: var(--accent-glow); padding: 2px 8px; border-radius: 4px;">
            Versión v${this.options.currentVersion}
          </span>
        </div>

        <p style="font-size: 12px; color: var(--text-muted); line-height: 1.5; margin: 0;">
          Aplicación de escritorio ultra-ligera y moderna para Windows con diagrama de Gantt flotante, modo Click-Through, mini-widget HUD y persistencia desacoplada.
        </p>

        <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; font-size: 11px; color: var(--text-dim); border-top: 1px solid var(--grid-line); padding-top: 12px;">
          <div>Autor: <strong>Floating Personal Gantt Contributors</strong></div>
          <div>Licencia: <strong>MIT</strong></div>
          <div>Repositorio: <a href="https://github.com/j-torres-o/floating_personal_gantt" target="_blank" style="color: var(--accent-primary); text-decoration: none;">GitHub</a></div>
        </div>

        <div style="display: flex; gap: 8px; width: 100%; margin-top: 6px;">
          <button class="btn-primary" id="btn-modal-check-updates" style="flex: 1; padding: 8px 12px; font-size: 12px;">
            🔄 Buscar Actualizaciones
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);

    this.modalEl.querySelector('#btn-close-about-modal')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector('#btn-modal-check-updates')?.addEventListener('click', () => {
      this.close();
      this.options.onCheckUpdates();
    });

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });
  }

  public close() {
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
      this.modalEl = null;
      this.options.onClose();
    }
  }
}
