import { UpdateInfoResult } from '../../types/electron';

export interface UpdateModalOptions {
  updateInfo: UpdateInfoResult;
  onConfirmUpdate: () => void;
  onClose: () => void;
}

export class UpdateModal {
  private options: UpdateModalOptions;
  private modalEl: HTMLElement | null = null;

  constructor(options: UpdateModalOptions) {
    this.options = options;
  }

  public open() {
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-backdrop';
    this.modalEl.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      animation: fadeIn 0.15s ease-out;
    `;

    const info = this.options.updateInfo;

    this.modalEl.innerHTML = `
      <div class="modal-card" style="
        background: var(--bg-panel);
        border: 1px solid var(--border-glass-bright);
        border-radius: var(--radius-lg);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65);
        width: 400px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        position: relative;
        color: var(--text-main);
      ">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 10px;
            background: rgba(16, 185, 129, 0.2);
            border: 1px solid rgba(16, 185, 129, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            color: #10B981;
          ">
            🚀
          </div>
          <div>
            <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin: 0;">¡Nueva Versión Disponible!</h3>
            <span style="font-size: 12px; color: var(--text-muted);">
              Actual: <strong>v${info.currentVersion}</strong> → Nueva: <strong style="color: #10B981;">v${info.latestVersion}</strong>
            </span>
          </div>
        </div>

        <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid var(--grid-line); border-radius: var(--radius-sm); padding: 10px; max-height: 120px; overflow-y: auto;">
          <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Notas de la Versión:</div>
          <div style="font-size: 11px; color: var(--text-dim); line-height: 1.4; white-space: pre-wrap;">${info.releaseNotes}</div>
        </div>

        <!-- Barra de Progreso de Descarga (Oculta inicialmente) -->
        <div id="update-progress-container" style="display: none; flex-direction: column; gap: 6px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted);">
            <span>Descargando actualización...</span>
            <span id="update-progress-percent">0%</span>
          </div>
          <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
            <div id="update-progress-bar" style="width: 0%; height: 100%; background: var(--accent-primary); transition: width 0.1s ease;"></div>
          </div>
        </div>

        <div id="update-actions-container" style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;">
          <button class="btn-secondary" id="btn-update-later" style="padding: 6px 14px; font-size: 12px;">
            Más tarde
          </button>
          <button class="btn-primary" id="btn-update-now" style="padding: 6px 16px; font-size: 12px; background: #10B981;">
            Actualizar Ahora
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);

    this.modalEl.querySelector('#btn-update-later')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector('#btn-update-now')?.addEventListener('click', () => {
      const progressContainer = this.modalEl?.querySelector('#update-progress-container') as HTMLElement;
      const actionsContainer = this.modalEl?.querySelector('#update-actions-container') as HTMLElement;
      if (progressContainer && actionsContainer) {
        progressContainer.style.display = 'flex';
        actionsContainer.style.display = 'none';
      }
      this.options.onConfirmUpdate();
    });
  }

  public updateProgress(percent: number) {
    if (this.modalEl) {
      const percentEl = this.modalEl.querySelector('#update-progress-percent');
      const barEl = this.modalEl.querySelector('#update-progress-bar') as HTMLElement;
      if (percentEl) percentEl.textContent = `${percent}%`;
      if (barEl) barEl.style.width = `${percent}%`;
    }
  }

  public close() {
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
      this.modalEl = null;
      this.options.onClose();
    }
  }
}
