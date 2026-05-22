import { Injectable, inject } from '@angular/core';

/**
 * Cross-cutting UI utilities — alerts, confirmations, loading overlay.
 *
 * Previously wrapped Ionic's AlertController + LoadingController. After
 * dropping Ionic, this re-implements the same API surface so existing call
 * sites compile unchanged:
 *
 *   - AlertPresent(header, message)
 *   - showAlert(header, message, confirmHandler, opts, cancelHandler)
 *   - presentRemarkAlert(header, handlerConfirm)
 *   - presentLoadingWithOutTime / dismissLoading
 *   - presentLoadingWithOutTime2 / dismissLoading2
 *   - presentToast (added — was previously inlined via Ionic's ToastController)
 *
 * The implementation is intentionally minimal: a single DOM loading overlay
 * for spinners, and browser-native confirm/alert/prompt for dialogs. The
 * brutal design language can be applied later by promoting these to
 * standalone components without changing callers.
 */
@Injectable({ providedIn: 'root' })
export class ServiceService {
  private loadingEl: HTMLDivElement | null = null;
  private loading2El: HTMLDivElement | null = null;

  // ── Loading overlay ───────────────────────────────────────────────────────

  async presentLoadingWithOutTime(message: string): Promise<void> {
    this.loadingEl = this.buildLoadingEl(message);
    document.body.appendChild(this.loadingEl);
  }

  async dismissLoading(): Promise<void> {
    if (this.loadingEl?.parentNode) {
      this.loadingEl.parentNode.removeChild(this.loadingEl);
    }
    this.loadingEl = null;
  }

  async presentLoadingWithOutTime2(message: string): Promise<void> {
    this.loading2El = this.buildLoadingEl(message);
    document.body.appendChild(this.loading2El);
  }

  async dismissLoading2(): Promise<void> {
    if (this.loading2El?.parentNode) {
      this.loading2El.parentNode.removeChild(this.loading2El);
    }
    this.loading2El = null;
  }

  private buildLoadingEl(message: string): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(10,10,10,0.55);
      display: flex; align-items: center; justify-content: center;
      font-family: 'IBM Plex Sans Thai', system-ui, sans-serif;
    `;
    const box = document.createElement('div');
    box.style.cssText = `
      background: #fff; border: 2px solid #0A0A0A; border-radius: 10px;
      box-shadow: 3px 3px 0 #0A0A0A;
      padding: 18px 22px; min-width: 200px;
      display: flex; flex-direction: column; align-items: center; gap: 10px;
    `;
    const spinner = document.createElement('div');
    spinner.style.cssText = `
      width: 28px; height: 28px;
      border: 3px solid #E5E5E5; border-top-color: #FFD400;
      border-radius: 50%; animation: nk-spin 0.8s linear infinite;
    `;
    const text = document.createElement('div');
    text.textContent = message || 'Loading...';
    text.style.cssText = 'font-weight: 700; font-size: 13px; color: #0A0A0A;';
    box.appendChild(spinner);
    box.appendChild(text);
    overlay.appendChild(box);

    // Inject keyframes once.
    if (!document.getElementById('nk-spin-keyframes')) {
      const style = document.createElement('style');
      style.id = 'nk-spin-keyframes';
      style.textContent = `@keyframes nk-spin { to { transform: rotate(360deg); } }`;
      document.head.appendChild(style);
    }
    return overlay;
  }

  // ── Alerts ────────────────────────────────────────────────────────────────

  /** Single-button info alert. Fires-and-forgets. */
  AlertPresent(header: string, message: string): void {
    window.alert(`${header}\n\n${message}`);
  }

  /**
   * Confirm-style alert. Returns true iff the user clicked confirm.
   * `confirmOnly` collapses to an info-only message (no cancel button).
   */
  async showAlert(
    header: string,
    message: string,
    confirmHandler: Function,
    options: { confirmText?: string; confirmOnly?: boolean; cssClass?: string } = {},
    cancelHandler?: Function,
  ): Promise<boolean> {
    const text = `${header}\n\n${message}`;
    if (options.confirmOnly) {
      window.alert(text);
      confirmHandler?.();
      return true;
    }
    const ok = window.confirm(text);
    if (ok) {
      confirmHandler?.();
    } else {
      cancelHandler?.();
    }
    return ok;
  }

  /** Prompt-style alert with a single text input — feeds the handler. */
  async presentRemarkAlert(header: string, handlerConfirm: (remark: string) => void): Promise<void> {
    const remark = window.prompt(header, '');
    if (remark != null && remark.trim() !== '') {
      handlerConfirm(remark);
    }
  }

  // ── Toast (replaces Ionic ToastController for inline use cases) ───────────

  /**
   * Short transient banner anchored bottom-center. Used by create-work-sheet
   * for save success/error. Auto-dismisses after `duration` ms (default 2200).
   */
  presentToast(message: string, color: string = 'info', duration = 2200): void {
    const palettes: Record<string, { bg: string; fg: string; icon: string }> = {
      success: { bg: '#DCFCE7', fg: '#166534', icon: '✓' },
      danger:  { bg: '#FFE9E9', fg: '#B91C1C', icon: '⚠' },
      warning: { bg: '#FFF7CC', fg: '#854D0E', icon: '⚠' },
      info:    { bg: '#E0F2FE', fg: '#075985', icon: 'ℹ' },
    };
    const palette = palettes[color] || palettes['info'];

    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
      z-index: 10000;
      background: ${palette.bg}; color: ${palette.fg};
      border: 2px solid #0A0A0A; border-radius: 8px;
      box-shadow: 3px 3px 0 #0A0A0A;
      padding: 10px 16px; font-weight: 700; font-size: 14px;
      font-family: 'IBM Plex Sans Thai', system-ui, sans-serif;
      display: flex; align-items: center; gap: 8px;
      max-width: calc(100vw - 32px);
    `;
    toast.textContent = `${palette.icon} ${message}`;
    document.body.appendChild(toast);
    window.setTimeout(() => {
      toast.parentNode?.removeChild(toast);
    }, duration);
  }
}

/**
 * Shim that mimics Ionic's `ToastController.create({...}).present()` API.
 * Lets existing call sites compile unchanged while routing the message
 * through ServiceService.presentToast underneath.
 */
@Injectable({ providedIn: 'root' })
export class ToastController {
  private service = inject(ServiceService);

  async create(opts: { message: string; color?: string; duration?: number; [k: string]: any }): Promise<{ present: () => Promise<void> }> {
    return {
      present: async () => {
        this.service.presentToast(opts.message, opts.color || 'info', opts.duration);
      },
    };
  }
}

/**
 * Shim that mimics Ionic's `AlertController.create({...}).present()` API,
 * including a single-input remark prompt. Existing call sites compile
 * unchanged; the actual UX is routed through ServiceService.
 */
@Injectable({ providedIn: 'root' })
export class AlertController {
  private service = inject(ServiceService);

  async create(opts: {
    header?: string;
    message?: string;
    buttons?: Array<{ text: string; role?: string; handler?: (data?: any) => void }>;
    inputs?: Array<{ name: string; type: string; placeholder?: string }>;
    [k: string]: any;
  }): Promise<{ present: () => Promise<void>; onDidDismiss: () => Promise<{ role: string }> }> {
    let dismissedRole = 'backdrop';
    return {
      present: async () => {
        const header = opts.header || '';
        const message = opts.message || '';
        const confirmBtn = opts.buttons?.find((b) => b.role === 'confirm') || opts.buttons?.find((b) => b.role !== 'cancel');
        const cancelBtn = opts.buttons?.find((b) => b.role === 'cancel');

        // Prompt-style alert (single text input).
        if (opts.inputs && opts.inputs.length > 0) {
          const value = window.prompt(`${header}\n\n${message}`, '');
          if (value != null && value.trim() !== '') {
            dismissedRole = 'confirm';
            const payload: any = {};
            payload[opts.inputs[0].name] = value;
            confirmBtn?.handler?.(payload);
          } else {
            dismissedRole = 'cancel';
            cancelBtn?.handler?.();
          }
          return;
        }

        // Info-only alert (single confirm button, no cancel).
        if (!cancelBtn) {
          window.alert(`${header}\n\n${message}`);
          dismissedRole = 'confirm';
          confirmBtn?.handler?.();
          return;
        }

        // Confirm/cancel alert.
        const ok = window.confirm(`${header}\n\n${message}`);
        if (ok) {
          dismissedRole = 'confirm';
          confirmBtn?.handler?.();
        } else {
          dismissedRole = 'cancel';
          cancelBtn?.handler?.();
        }
      },
      onDidDismiss: async () => ({ role: dismissedRole }),
    };
  }
}

