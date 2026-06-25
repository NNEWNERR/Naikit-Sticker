import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReceiptService, ReceiptError } from 'src/app/services/receipt.service';
import { ReceiptProjection } from 'src/app/core/models/receipt';

/**
 * F14 — หน้าใบเสร็จสาธารณะ `/r/:code` (no-auth, นอก app shell).
 * ลูกค้าสแกน QR → เห็นเลขใบงาน + รายการ + ยอด + สถานะ (read-only).
 */
@Component({
  standalone: true,
  selector: 'app-receipt',
  imports: [CommonModule],
  template: `
    <div class="min-h-[100dvh] bg-surface-2 flex flex-col items-center py-6 px-4">
      <!-- loading -->
      <div *ngIf="loading()" class="mt-20 text-ink-3 font-bold">กำลังโหลดใบเสร็จ…</div>

      <!-- error -->
      <div *ngIf="!loading() && error()" class="mt-16 max-w-sm w-full text-center">
        <div class="text-4xl mb-3">🧾</div>
        <p class="font-extrabold text-ink text-lg m-0 mb-1">ไม่พบใบเสร็จ</p>
        <p class="text-[13px] font-semibold text-ink-3 m-0">{{ error() }}</p>
      </div>

      <!-- receipt -->
      <div
        *ngIf="!loading() && receipt() as r"
        class="receipt-card max-w-sm w-full bg-white border-2 border-ink rounded-xl p-5 md:p-6"
      >
        <header class="text-center border-b-2 border-dashed border-ink pb-4 mb-4">
          <h1 class="text-h2 m-0">{{ r.shop_name }}</h1>
          <p class="text-[13px] font-bold text-ink-3 m-0 mt-1">ใบเสร็จ / ใบรับงาน</p>
          <p class="text-[15px] font-extrabold text-ink m-0 mt-2">{{ r.serial_number }}</p>
          <p *ngIf="r.date" class="text-[12px] font-semibold text-ink-3 m-0 mt-0.5">{{ fmtDate(r.date) }}</p>
        </header>

        <p class="text-[13px] font-semibold m-0 mb-3">
          ลูกค้า: <span class="font-extrabold">{{ r.customer_name || '—' }}</span>
        </p>

        <!-- items -->
        <div class="border-2 border-ink rounded-md overflow-hidden mb-4">
          <div *ngFor="let it of r.items; let last = last"
               class="flex justify-between gap-2 px-3 py-2 text-[13px]"
               [class.border-b]="!last" [class.border-ink]="!last">
            <div class="font-semibold">
              {{ it.label }}
              <span class="text-ink-3">× {{ it.quantity }}</span>
            </div>
            <div class="font-extrabold whitespace-nowrap">{{ money(it.amount) }}</div>
          </div>
        </div>

        <!-- totals -->
        <dl class="text-[13px] space-y-1 m-0">
          <div class="flex justify-between"><dt class="text-ink-3 font-semibold">รวมค่างาน</dt><dd class="font-bold m-0">{{ money(r.subtotal) }}</dd></div>
          <div *ngIf="r.discount > 0" class="flex justify-between"><dt class="text-ink-3 font-semibold">ส่วนลด</dt><dd class="font-bold m-0">−{{ money(r.discount) }}</dd></div>
          <div *ngIf="r.other_fee > 0" class="flex justify-between"><dt class="text-ink-3 font-semibold">ค่าใช้จ่ายอื่น</dt><dd class="font-bold m-0">{{ money(r.other_fee) }}</dd></div>
          <div *ngIf="r.vat_amount > 0" class="flex justify-between"><dt class="text-ink-3 font-semibold">VAT</dt><dd class="font-bold m-0">{{ money(r.vat_amount) }}</dd></div>
          <div *ngIf="r.shipping_fee > 0" class="flex justify-between"><dt class="text-ink-3 font-semibold">ค่าส่ง</dt><dd class="font-bold m-0">{{ money(r.shipping_fee) }}</dd></div>
          <div *ngIf="r.transfer_fee > 0" class="flex justify-between"><dt class="text-ink-3 font-semibold">ค่าธรรมเนียม</dt><dd class="font-bold m-0">{{ money(r.transfer_fee) }}</dd></div>
          <div *ngIf="r.wht_amount > 0" class="flex justify-between"><dt class="text-ink-3 font-semibold">หัก ณ ที่จ่าย</dt><dd class="font-bold m-0">−{{ money(r.wht_amount) }}</dd></div>
        </dl>

        <div class="flex justify-between items-center border-t-2 border-ink mt-3 pt-3">
          <span class="font-extrabold">ยอดที่ต้องชำระ</span>
          <span class="font-extrabold text-lg">{{ money(r.amount_due) }}</span>
        </div>

        <div class="flex justify-between items-center mt-2 text-[13px]">
          <span class="text-ink-3 font-semibold">ชำระแล้ว</span>
          <span class="font-bold">{{ money(r.paid_amount) }}</span>
        </div>
        <div *ngIf="r.outstanding > 0" class="flex justify-between items-center mt-1 text-[13px]">
          <span class="text-ink-3 font-semibold">คงค้าง</span>
          <span class="font-extrabold text-red-700">{{ money(r.outstanding) }}</span>
        </div>

        <div class="flex items-center justify-center gap-2 mt-4">
          <span
            class="px-3 py-1 rounded-full border-2 border-ink text-[12px] font-extrabold"
            [ngClass]="{
              'bg-green-100 text-green-800': r.payment_status === 'ชำระครบ',
              'bg-yellow-100 text-yellow-800': r.payment_status === 'ค้างชำระ',
              'bg-surface-2 text-ink-3': r.payment_status === 'รอชำระ'
            }"
          >{{ r.payment_status }}</span>
          <span class="px-3 py-1 rounded-full border-2 border-ink bg-surface-2 text-[12px] font-bold">{{ r.job_status }}</span>
        </div>

        <p class="text-center text-[11px] text-ink-3 font-semibold mt-5 m-0">
          ออกโดยระบบ Naikit Sticker
        </p>

        <div class="flex justify-center mt-4 no-print">
          <button
            type="button"
            (click)="print()"
            class="px-4 py-2 border-2 border-ink rounded-md bg-white hover:bg-surface-2 cursor-pointer text-[13px] font-extrabold"
          >🖨️ พิมพ์ใบเสร็จ</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @media print {
      .no-print { display: none !important; }
      :host { background: #fff; }
    }
  `],
})
export class ReceiptComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private receiptSvc = inject(ReceiptService);

  loading = signal(true);
  error = signal('');
  receipt = signal<ReceiptProjection | null>(null);

  async ngOnInit(): Promise<void> {
    const code = (this.route.snapshot.paramMap.get('code') ?? '').trim();
    if (!code) { this.error.set('ลิงก์ไม่ถูกต้อง'); this.loading.set(false); return; }
    try {
      this.receipt.set(await this.receiptSvc.getReceipt(code));
    } catch (e: unknown) {
      this.error.set(e instanceof ReceiptError ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      this.loading.set(false);
    }
  }

  money(n: number): string {
    return '฿' + (n ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  fmtDate(ms: number): string {
    return new Date(ms).toLocaleDateString('th-TH', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  print(): void {
    window.print();
  }
}
