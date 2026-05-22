import { Injectable, Type } from '@angular/core';
import { Dialog, DialogRef } from '@angular/cdk/dialog';

/**
 * Drop-in replacement for Ionic's ModalController.
 *
 * Same fluent API surface so existing call sites compile unchanged:
 *
 *   const modal = await this.modalController.create({
 *     component: WorksheetInfoComponent,
 *     componentProps: { workSheet: ws },
 *     cssClass: 'modal-fullscreen',
 *   });
 *   await modal.present();
 *   const { role, data } = await modal.onWillDismiss();
 *
 * Internally backed by @angular/cdk/dialog. Components opened this way can
 * close themselves by calling `this.modalController.dismiss(data, role)` —
 * the controller maintains a stack and pops the topmost modal.
 *
 * The `componentProps` map is applied to the rendered instance as @Input-like
 * property assignments (matches Ionic's behavior).
 */

export interface ModalCreateOptions {
  component: Type<any>;
  componentProps?: Record<string, any>;
  cssClass?: string;
}

export interface ModalDismissResult {
  data: any;
  role: string;
}

export class ModalHandle {
  /** Resolved when the underlying dialog actually closes. */
  private resolveDismiss?: (r: ModalDismissResult) => void;
  private dismissPromise: Promise<ModalDismissResult>;
  private dialogRef?: DialogRef<any>;
  /** Stored dismissal payload so we resolve with the right value. */
  private dismissed?: ModalDismissResult;

  constructor(
    private opts: ModalCreateOptions,
    private dialog: Dialog,
    private onClose: (h: ModalHandle) => void,
  ) {
    this.dismissPromise = new Promise<ModalDismissResult>((resolve) => {
      this.resolveDismiss = resolve;
    });
  }

  /** Open the dialog and apply componentProps onto the instance. */
  async present(): Promise<void> {
    this.dialogRef = this.dialog.open(this.opts.component, {
      panelClass: ['nk-modal', this.opts.cssClass].filter(Boolean) as string[],
      hasBackdrop: true,
      // Default to a roomy modal; "modal-fullscreen" callers expand to full vp.
      width: this.opts.cssClass === 'modal-fullscreen' ? '100vw' : '500px',
      height: this.opts.cssClass === 'modal-fullscreen' ? '100dvh' : 'auto',
      maxWidth: this.opts.cssClass === 'modal-fullscreen' ? '100vw' : undefined,
      maxHeight: this.opts.cssClass === 'modal-fullscreen' ? '100dvh' : '90dvh',
    });

    // Apply componentProps onto the rendered instance.
    const instance: any = this.dialogRef.componentInstance;
    if (instance && this.opts.componentProps) {
      for (const [k, v] of Object.entries(this.opts.componentProps)) {
        instance[k] = v;
      }
    }

    this.dialogRef.closed.subscribe((closeData: any) => {
      // If dismiss(data, role) was called, dismissed is set; otherwise the
      // backdrop was clicked (CDK passes undefined).
      const result: ModalDismissResult = this.dismissed
        ?? { data: closeData ?? null, role: 'backdrop' };
      this.resolveDismiss?.(result);
      this.onClose(this);
    });
  }

  /** Dismiss the modal — also wired from the inside via the controller stack. */
  async dismiss(data?: any, role: string = 'cancel'): Promise<void> {
    this.dismissed = { data: data ?? null, role };
    this.dialogRef?.close();
  }

  /** Resolves when the modal is fully dismissed. */
  onWillDismiss(): Promise<ModalDismissResult> {
    return this.dismissPromise;
  }

  /** Alias — Ionic distinguishes will/did dismiss but we collapse them. */
  onDidDismiss(): Promise<ModalDismissResult> {
    return this.dismissPromise;
  }
}

@Injectable({ providedIn: 'root' })
export class ModalController {
  /** Active modal stack — topmost dismissed first by the no-arg dismiss(). */
  private stack: ModalHandle[] = [];

  constructor(private dialog: Dialog) {}

  /** Mirror of Ionic's modalController.create — returns a handle, not yet open. */
  async create(opts: ModalCreateOptions): Promise<ModalHandle> {
    const handle = new ModalHandle(opts, this.dialog, (closed) => {
      this.stack = this.stack.filter((h) => h !== closed);
    });
    // Push immediately so a sync dismiss() right after create+present works.
    this.stack.push(handle);
    return handle;
  }

  /**
   * Dismiss the topmost open modal. Components opened via this service can
   * call this to close themselves without needing a handle reference.
   */
  async dismiss(data?: any, role: string = 'cancel'): Promise<void> {
    const top = this.stack[this.stack.length - 1];
    if (top) await top.dismiss(data, role);
  }
}
