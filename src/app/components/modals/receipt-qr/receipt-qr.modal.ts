import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from 'src/app/services/modal.service';
import { ReceiptService, ReceiptError } from 'src/app/services/receipt.service';
import { QrCodeComponent } from 'src/app/shared/components/qr-code.component';
import { ButtonComponent } from 'src/app/shared/components/button.component';

/**
 * F14 — แสดง QR ใบเสร็จให้ลูกค้าสแกน + คัดลอกลิงก์/แชร์ LINE/เปิดหน้าใบเสร็จ
 * + สร้างลิงก์ใหม่ (regenerate) กรณีลิงก์เก่าหลุด (seller เจ้าของ/admin).
 * เปิดจาก worksheet-info ผ่าน ModalController. componentProps:
 *   jobId, receiptCode, serialNumber, canRegenerate
 */
@Component({
  standalone: true,
  selector: 'app-receipt-qr-modal',
  imports: [CommonModule, QrCodeComponent, ButtonComponent],
  template: `
    <div class="bg-white border-2 border-ink rounded-lg p-5 md:p-6 w-full">
      <header class="flex items-center justify-between mb-4">
        <h3 class="text-h2 m-0">🧾 ใบเสร็จ / QR</h3>
        <button
          type="button"
          (click)="close()"
          class="w-8 h-8 border-2 border-ink rounded-md bg-white hover:bg-surface-2 cursor-pointer text-base font-extrabold"
          aria-label="ปิด"
        >×</button>
      </header>

      <p class="text-[13px] font-semibold text-ink-3 m-0 mb-3">
        ใบงาน <span class="font-extrabold text-ink">{{ serialNumber }}</span> — ให้ลูกค้าสแกนเพื่อดูใบเสร็จ
      </p>

      <ng-container *ngIf="code; else noCode">
        <div class="flex justify-center my-2">
          <div class="border-2 border-ink rounded-lg p-2 bg-white">
            <app-qr-code [value]="url" [size]="220"></app-qr-code>
          </div>
        </div>

        <div class="mt-3 mb-1 px-3 py-2 border-2 border-ink rounded-md bg-surface-2 break-all text-[12px] font-semibold">
          {{ url }}
        </div>

        <p *ngIf="notice" class="mt-2 text-[12px] font-bold text-green-700" role="status">{{ notice }}</p>
        <p *ngIf="errorMessage" class="mt-2 text-[12px] font-bold text-red-700" role="alert">{{ errorMessage }}</p>

        <div class="grid grid-cols-2 gap-2 mt-4">
          <app-button variant="ghost" size="md" type="button" (clicked)="copyLink()">📋 คัดลอกลิงก์</app-button>
          <app-button variant="ghost" size="md" type="button" (clicked)="shareLine()">💬 แชร์ LINE</app-button>
          <app-button variant="ghost" size="md" type="button" (clicked)="openReceipt()">↗ เปิดใบเสร็จ</app-button>
          <app-button
            *ngIf="canRegenerate"
            variant="ghost"
            size="md"
            type="button"
            [disabled]="working"
            (clicked)="regenerate()"
          >{{ working ? 'กำลังสร้าง…' : '🔄 สร้างลิงก์ใหม่' }}</app-button>
        </div>

        <p *ngIf="canRegenerate" class="mt-3 text-[11px] text-ink-3 font-semibold m-0">
          * "สร้างลิงก์ใหม่" จะทำให้ QR/ลิงก์เดิมใช้ไม่ได้ทันที ใช้กรณีลิงก์หลุดถึงมือคนผิด
        </p>
      </ng-container>

      <ng-template #noCode>
        <p class="text-[13px] font-semibold text-ink-3 py-6 text-center">
          งานนี้ยังไม่มีรหัสใบเสร็จ (งานเก่าก่อนเปิดระบบ)
          <span *ngIf="canRegenerate"><br />กด "สร้างลิงก์" เพื่อออกใบเสร็จ QR</span>
        </p>
        <app-button
          *ngIf="canRegenerate"
          variant="primary"
          size="md"
          type="button"
          [disabled]="working"
          (clicked)="regenerate()"
        >{{ working ? 'กำลังสร้าง…' : 'สร้างลิงก์ใบเสร็จ' }}</app-button>
      </ng-template>

      <div class="flex justify-end mt-5">
        <app-button variant="primary" size="md" type="button" (clicked)="close()">ปิด</app-button>
      </div>
    </div>
  `,
})
export class ReceiptQrModalComponent implements OnInit {
  @Input() jobId = '';
  @Input() receiptCode = '';
  @Input() serialNumber = '';
  @Input() canRegenerate = false;

  code = '';
  url = '';
  notice = '';
  errorMessage = '';
  working = false;

  constructor(
    private modal: ModalController,
    private receiptSvc: ReceiptService,
  ) {}

  ngOnInit(): void {
    this.setCode(this.receiptCode);
  }

  private setCode(code: string): void {
    this.code = code || '';
    this.url = this.code ? this.receiptSvc.receiptUrl(this.code) : '';
  }

  async copyLink(): Promise<void> {
    this.clearMsg();
    try {
      await navigator.clipboard.writeText(this.url);
      this.notice = 'คัดลอกลิงก์แล้ว';
    } catch {
      this.errorMessage = 'คัดลอกไม่สำเร็จ — กดค้างที่ลิงก์เพื่อคัดลอกเอง';
    }
  }

  shareLine(): void {
    const share = `https://line.me/R/share?text=${encodeURIComponent('ใบเสร็จงาน ' + this.serialNumber + '\n' + this.url)}`;
    window.open(share, '_blank', 'noopener');
  }

  openReceipt(): void {
    if (this.url) window.open(this.url, '_blank', 'noopener');
  }

  async regenerate(): Promise<void> {
    if (this.working) return;
    this.working = true;
    this.clearMsg();
    try {
      const newCode = await this.receiptSvc.regenerateReceiptCode(this.jobId);
      this.setCode(newCode);
      this.notice = 'สร้างลิงก์ใหม่แล้ว — ลิงก์เดิมใช้ไม่ได้แล้ว';
    } catch (e: unknown) {
      this.errorMessage = e instanceof ReceiptError ? e.message : 'สร้างลิงก์ใหม่ไม่สำเร็จ';
    } finally {
      this.working = false;
    }
  }

  private clearMsg(): void {
    this.notice = '';
    this.errorMessage = '';
  }

  close(): void {
    // ส่ง code ปัจจุบันกลับ เผื่อ regenerate แล้ว parent อยาก sync (job watcher จะ refresh เองด้วย)
    this.modal.dismiss({ receipt_code: this.code }, 'close');
  }
}
