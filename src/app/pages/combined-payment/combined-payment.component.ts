import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppStateService } from 'src/app/services/app-state.service';
import { JobsService } from 'src/app/services/jobs.service';
import { PaymentService } from 'src/app/services/payment.service';
import { PageHeaderComponent, SkeletonComponent, EmptyStateComponent } from 'src/app/shared/components';
import { Job } from 'src/app/core/models/job';

interface CustomerGroup { key: string; customer_name: string; phone: string; jobs: Job[]; outstanding: number; }

/**
 * บันทึกการจ่ายรวม (F8 multi-job/one-slip) — ลูกค้าคนเดียว หลายใบงาน จ่ายสลิปเดียว
 * → 1 payment doc + หลาย allocations (ไม่ใช่หลาย doc ref ซ้ำ ที่จะโดนธง fraud).
 * เข้าถึง: seller(งานตัวเอง) / finance / admin — ตรง role ของ createPayment.
 */
@Component({
  selector: 'app-combined-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, SkeletonComponent, EmptyStateComponent],
  templateUrl: './combined-payment.component.html',
})
export class CombinedPaymentComponent implements OnInit, OnDestroy {
  private appState = inject(AppStateService);
  private jobsSvc = inject(JobsService);
  private paymentSvc = inject(PaymentService);

  jobs = signal<Job[]>([]);
  loading = signal(true);
  loadError = signal('');

  search = '';
  /** jobId → เลือกจ่าย */
  selected: Record<string, boolean> = {};
  /** jobId → ยอดที่ allocate (default = ยอดค้าง) */
  alloc: Record<string, number | null> = {};

  // ── slip form ──
  method: 'เงินสด' | 'โอน' | 'เช็ค' = 'โอน';
  amount: number | null = null;
  bankRef = '';
  slipFile: File | null = null;
  payDate = new Date().toISOString().slice(0, 10);

  submitting = signal(false);
  error = signal('');
  successMsg = signal('');

  private detach?: () => void;
  private role = computed(() => this.appState.role());

  ngOnInit() {
    const role = this.appState.role();
    const uid = this.appState.uid();
    if (!role || !uid) { this.loading.set(false); return; }
    this.detach = this.jobsSvc.watchVisibleJobs(
      role, uid,
      (js) => { this.jobs.set(js); this.loading.set(false); },
      (e) => { this.loadError.set(e.message); this.loading.set(false); },
    );
  }
  ngOnDestroy() { this.detach?.(); }

  // ── outstanding ──
  receivableOf(j: Job): number {
    const p = j.payment;
    return (j.tax?.net_receivable ?? p?.total ?? 0) + (p?.shipping_fee ?? 0) + (p?.transfer_fee ?? 0);
  }
  outstandingOf(j: Job): number {
    return Math.round((this.receivableOf(j) - (j.paid_amount ?? 0)) * 100) / 100;
  }

  /** งานค้างชำระ (outstanding > 0, ไม่ถูกลบ) จัดกลุ่มตามลูกค้า (ชื่อ+เบอร์) + กรอง search */
  groups = computed<CustomerGroup[]>(() => {
    const term = this.search.trim().toLowerCase();
    const map = new Map<string, CustomerGroup>();
    for (const j of this.jobs()) {
      if (j.is_deleted) continue;
      if (this.outstandingOf(j) <= 0.01) continue;
      const name = j.customer_name ?? '';
      const phone = j.phone ?? '';
      if (term && !(name.toLowerCase().includes(term) || phone.toLowerCase().includes(term))) continue;
      const key = `${name}|${phone}`;
      if (!map.has(key)) map.set(key, { key, customer_name: name || '(ไม่ระบุชื่อ)', phone, jobs: [], outstanding: 0 });
      const g = map.get(key)!;
      g.jobs.push(j);
      g.outstanding = Math.round((g.outstanding + this.outstandingOf(j)) * 100) / 100;
    }
    // กลุ่มที่มีหลายงานขึ้นก่อน (เคสเป้าหมาย) แล้วเรียงยอดค้างมากสุด
    return [...map.values()].sort((a, b) => (b.jobs.length - a.jobs.length) || (b.outstanding - a.outstanding));
  });

  // ── selection ──
  toggle(j: Job) {
    const on = !this.selected[j.id];
    this.selected[j.id] = on;
    if (on && (this.alloc[j.id] == null)) this.alloc[j.id] = this.outstandingOf(j);
    this.syncAmount();
  }
  selectGroup(g: CustomerGroup) {
    const allOn = g.jobs.every((j) => this.selected[j.id]);
    for (const j of g.jobs) {
      this.selected[j.id] = !allOn;
      if (!allOn && this.alloc[j.id] == null) this.alloc[j.id] = this.outstandingOf(j);
    }
    this.syncAmount();
  }
  isGroupAll(g: CustomerGroup): boolean { return g.jobs.length > 0 && g.jobs.every((j) => this.selected[j.id]); }

  selectedJobs = (): Job[] => this.jobs().filter((j) => this.selected[j.id]);
  get allocTotal(): number {
    return Math.round(this.selectedJobs().reduce((s, j) => s + (Number(this.alloc[j.id]) || 0), 0) * 100) / 100;
  }
  /** amount (ยอดสลิป) auto = ผลรวม allocation เมื่อผู้ใช้ยังไม่แตะ */
  private amountTouched = false;
  onAmountInput() { this.amountTouched = true; }
  private syncAmount() { if (!this.amountTouched) this.amount = this.allocTotal || null; }
  onAllocInput() { this.syncAmount(); }

  onSlipFile(e: Event) { this.slipFile = (e.target as HTMLInputElement).files?.[0] ?? null; }

  get isSlipMethod(): boolean { return this.method === 'โอน' || this.method === 'เช็ค'; }

  async submit() {
    this.error.set(''); this.successMsg.set('');
    const sel = this.selectedJobs();
    if (sel.length === 0) { this.error.set('เลือกใบงานอย่างน้อย 1 ใบ'); return; }
    const amt = Number(this.amount);
    if (!amt || amt <= 0) { this.error.set('ระบุยอดสลิป'); return; }
    // allocation ต่องาน > 0 และไม่เกินยอดค้าง
    for (const j of sel) {
      const a = Number(this.alloc[j.id]) || 0;
      if (a <= 0) { this.error.set(`ใส่ยอดจ่ายของ ${j.serial_number}`); return; }
      if (a > this.outstandingOf(j) + 0.01) { this.error.set(`${j.serial_number}: ยอดจ่าย (${a}) เกินยอดค้าง (${this.outstandingOf(j)})`); return; }
    }
    if (this.allocTotal > amt + 0.01) { this.error.set(`ยอดจัดสรรรวม (${this.allocTotal}) เกินยอดสลิป (${amt})`); return; }
    if (this.isSlipMethod && !this.bankRef.trim()) { this.error.set('โอน/เช็ค ต้องระบุเลขอ้างอิง'); return; }
    if (this.isSlipMethod && !this.slipFile) { this.error.set('โอน/เช็ค ต้องแนบสลิป'); return; }

    this.submitting.set(true);
    try {
      let slip_url: string | null = null;
      let slip_hash: string | null = null;
      if (this.slipFile) {
        const file = this.slipFile;
        [slip_url, slip_hash] = await Promise.all([
          this.paymentSvc.uploadSlip(sel[0].id, file),
          this.paymentSvc.hashFile(file),
        ]);
      }
      const res = await this.paymentSvc.createPayment({
        method: this.method,
        amount: amt,
        bank_ref: this.bankRef.trim(),
        slip_url, slip_hash,
        paid_at: new Date(this.payDate).toISOString(),
        allocations: sel.map((j) => ({ job_id: j.id, amount: Math.round((Number(this.alloc[j.id]) || 0) * 100) / 100 })),
        customer_name: sel[0].customer_name ?? '',
      });
      this.successMsg.set(`บันทึกแล้ว — จัดสรร ฿${res.allocated_total.toLocaleString()} ลง ${sel.length} ใบงาน (1 สลิป)`);
      this.resetForm();
    } catch (e) {
      this.error.set((e as Error).message || 'บันทึกไม่สำเร็จ');
    } finally {
      this.submitting.set(false);
    }
  }

  private resetForm() {
    this.selected = {}; this.alloc = {}; this.amount = null; this.amountTouched = false;
    this.bankRef = ''; this.slipFile = null;
  }
}
