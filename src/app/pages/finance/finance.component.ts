import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Timestamp } from 'firebase/firestore';

import { AppStateService } from 'src/app/services/app-state.service';
import { JobsService } from 'src/app/services/jobs.service';
import { UsersService } from 'src/app/services/users.service';
import { CashService } from 'src/app/services/cash.service';
import { PaymentService } from 'src/app/services/payment.service';
import { PriceAuditService } from 'src/app/services/price-audit.service';
import { ModalController } from 'src/app/services/modal.service';
import { Job, JobEvent } from 'src/app/core/models/job';
import { CashSession } from 'src/app/core/models/cash';
import { PaymentRecord, RefundRecord } from 'src/app/core/models/payment';
import { PriceAudit } from 'src/app/core/models/price-audit';
import { WorksheetInfoComponent } from '../worksheet-info/worksheet-info.component';

interface SellerRow {
  uid: string;
  name: string;
  count: number;
  total: number;
  cashTotal: number;
  cashRatio: number; // 0..1
}

interface MethodRow {
  method: string;
  count: number;
  total: number;
}

interface AdjustRow {
  id: string;
  jobId: string;
  serial: string;
  actor: string;
  source: 'ปรับยอด (การเงิน)' | 'แก้รายการงาน';
  reason: string;
  beforeTotal: number;
  afterTotal: number;
  beforeDeposit: number;
  afterDeposit: number;
  at: Timestamp | null;
}

interface PriceVarianceRow {
  uid: string;
  name: string;
  jobCount: number;   // จำนวนงานที่ติดธง
  hardCount: number;
  underTotal: number; // Σ |variance| เฉพาะที่ขายต่ำกว่ากลาง (บาทที่อาจรั่ว)
}

const DELIVERED = 'ส่งมอบแล้ว';
const CASH = 'เงินสด';

/**
 * Finance Dashboard (F6) — หน้ารวมสำหรับตรวจเงิน (role finance/admin).
 * รวม: ยอดขายแยก seller×วิธีจ่าย + สัดส่วนเงินสด, payment_adjust audit log,
 * outlier scan, cash reconciliation รายวัน. ดู docs/FINANCE-CONTROLS.md F6
 */
@Component({
  selector: 'app-finance',
  templateUrl: './finance.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
})
export class FinanceComponent implements OnInit, OnDestroy {

  private jobs: Job[] = [];          // non-deleted, all (finance/admin)
  deletedJobs: Job[] = [];
  adjustEvents: JobEvent[] = [];
  editEvents: JobEvent[] = [];   // F6 — seller edits; filtered to total-changing ones
  cashSessions: CashSession[] = [];
  payments: PaymentRecord[] = [];
  refunds: RefundRecord[] = [];
  priceAudits: PriceAudit[] = []; // F7 — งานที่ติดธงราคา (severity soft/hard)

  // reconcile form
  recSellerUid = '';
  recDate = this.todayICT();
  recDeclared: number | null = null;
  recNote = '';
  recBusy = false;
  recMsg = '';
  recErr = false;
  loadError = '';

  private cleanups: Array<() => void> = [];

  constructor(
    private appState: AppStateService,
    private jobsSvc: JobsService,
    private users: UsersService,
    private cashSvc: CashService,
    private paymentSvc: PaymentService,
    private priceAuditSvc: PriceAuditService,
    private modalController: ModalController,
  ) {}

  ngOnInit(): void {
    const role = this.appState.role();
    const uid = this.appState.uid();
    if (!role || !uid) return;

    this.cleanups.push(this.users.attachListener());
    this.cleanups.push(this.jobsSvc.watchVisibleJobs(
      role,
      uid,
      (j) => { this.jobs = j; this.loadError = ''; },
      // A silent-empty dashboard could read as "nothing to audit" — surface it.
      () => { this.loadError = 'โหลดข้อมูลการเงินไม่สำเร็จ กรุณารีเฟรชหน้าหรือเข้าสู่ระบบใหม่'; },
    ));
    this.cleanups.push(this.jobsSvc.watchDeletedJobs((j) => (this.deletedJobs = j)));
    this.cleanups.push(this.jobsSvc.watchPaymentAdjustEvents((e) => (this.adjustEvents = e)));
    this.cleanups.push(this.jobsSvc.watchEditEvents((e) => (this.editEvents = e)));
    this.cleanups.push(this.cashSvc.watchSessions((s) => (this.cashSessions = s)));
    this.cleanups.push(this.paymentSvc.watchAllPayments((p) => (this.payments = p)));
    this.cleanups.push(this.paymentSvc.watchAllRefunds((r) => (this.refunds = r)));
    this.cleanups.push(this.priceAuditSvc.watchFlagged((a) => (this.priceAudits = a)));
  }

  ngOnDestroy(): void {
    this.cleanups.forEach((fn) => fn());
  }

  // ── Revenue (delivered jobs only) ──────────────────────────────────────────

  private get delivered(): Job[] {
    return this.jobs.filter((j) => j.status === DELIVERED);
  }

  get totalRevenue(): number {
    return this.delivered.reduce((s, j) => s + (j.payment?.total ?? 0), 0);
  }

  get cashRevenue(): number {
    return this.delivered
      .filter((j) => j.payment?.payment_method === CASH)
      .reduce((s, j) => s + (j.payment?.total ?? 0), 0);
  }

  get cashRatio(): number {
    const t = this.totalRevenue;
    return t > 0 ? this.cashRevenue / t : 0;
  }

  get deliveredCount(): number {
    return this.delivered.length;
  }

  /** ยอดขายแยกตามวิธีจ่าย (เฉพาะงานส่งมอบแล้ว). */
  get methodRows(): MethodRow[] {
    const map = new Map<string, MethodRow>();
    for (const j of this.delivered) {
      const method = j.payment?.payment_method || '— ไม่ระบุ —';
      const row = map.get(method) ?? { method, count: 0, total: 0 };
      row.count += 1;
      row.total += j.payment?.total ?? 0;
      map.set(method, row);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }

  /** ยอดขายแยกตาม seller + สัดส่วนเงินสด (ธงแดงคนเงินสดเยอะผิดปกติ). */
  get sellerRows(): SellerRow[] {
    const map = new Map<string, SellerRow>();
    for (const j of this.delivered) {
      const uid = j.seller_uid;
      const row = map.get(uid) ?? {
        uid, name: this.nameOf(uid), count: 0, total: 0, cashTotal: 0, cashRatio: 0,
      };
      const amt = j.payment?.total ?? 0;
      row.count += 1;
      row.total += amt;
      if (j.payment?.payment_method === CASH) row.cashTotal += amt;
      map.set(uid, row);
    }
    const rows = [...map.values()];
    for (const r of rows) r.cashRatio = r.total > 0 ? r.cashTotal / r.total : 0;
    return rows.sort((a, b) => b.cashRatio - a.cashRatio);
  }

  // ── Outliers (anti-fraud flags) ────────────────────────────────────────────

  /** ส่งมอบแล้วแต่ deposit = 0 (ไม่บันทึกมัดจำ). */
  get zeroDepositDelivered(): Job[] {
    return this.delivered.filter((j) => (j.payment?.deposit ?? 0) === 0);
  }

  /** ส่งมอบแล้วแต่ total = 0 (ยอดเป็นศูนย์ — น่าสงสัย). */
  get zeroTotalDelivered(): Job[] {
    return this.delivered.filter((j) => (j.payment?.total ?? 0) === 0);
  }

  /** งานที่มีส่วนลด > 0 (เรียงส่วนลดมากสุดก่อน). */
  get discountedJobs(): Job[] {
    return this.jobs
      .filter((j) => (j.payment?.discount ?? 0) > 0)
      .sort((a, b) => (b.payment?.discount ?? 0) - (a.payment?.discount ?? 0));
  }

  discountOf(j: Job): number { return j.payment?.discount ?? 0; }

  // ── F7 — Price variance vs ราคากลาง (covert audit) ─────────────────────────

  /** งานที่ขายต่ำกว่าราคากลาง (variance ติดลบ) เรียงต่ำสุดก่อน — เป้าหลักของการตรวจ. */
  get underpricedAudits(): PriceAudit[] {
    return this.priceAudits
      .filter((a) => a.variance_baht < 0)
      .sort((a, b) => a.variance_baht - b.variance_baht);
  }

  /** จำนวนงาน hard flag (เด่นสุด). */
  get hardFlagCount(): number {
    return this.priceAudits.filter((a) => a.severity === 'hard').length;
  }

  /** บาทที่อาจรั่วรวม = Σ ส่วนต่างที่ขายต่ำกว่ากลาง. */
  get totalUnderpriced(): number {
    return this.underpricedAudits.reduce((s, a) => s + Math.abs(a.variance_baht), 0);
  }

  /** ส่วนต่างราคากลางแยกตาม seller — คนกดราคาบ่อยลอยขึ้น (สัญญาณเชิงสถิติ). */
  get priceVarianceRows(): PriceVarianceRow[] {
    const map = new Map<string, PriceVarianceRow>();
    for (const a of this.priceAudits) {
      const row = map.get(a.seller_uid) ?? {
        uid: a.seller_uid, name: this.nameOf(a.seller_uid), jobCount: 0, hardCount: 0, underTotal: 0,
      };
      row.jobCount += 1;
      if (a.severity === 'hard') row.hardCount += 1;
      if (a.variance_baht < 0) row.underTotal += Math.abs(a.variance_baht);
      map.set(a.seller_uid, row);
    }
    return [...map.values()].sort((a, b) => b.underTotal - a.underTotal);
  }

  // ── F8 — Payments / Refund / reuse detection ───────────────────────────────

  /** payment ที่ bank_ref ซ้ำ (≥2 ใบ active ใช้ ref เดียว) — ธงสลิปซ้ำ. */
  get dupRefPayments(): PaymentRecord[] {
    const active = this.payments.filter((p) => p.status === 'active' && p.bank_ref);
    const count = new Map<string, number>();
    for (const p of active) count.set(p.bank_ref, (count.get(p.bank_ref) ?? 0) + 1);
    return active.filter((p) => (count.get(p.bank_ref) ?? 0) > 1);
  }

  /** payment ที่ slip_hash ซ้ำ แต่ bank_ref ต่าง — ภาพสลิปซ้ำ/ตัดต่อ. */
  get dupHashPayments(): PaymentRecord[] {
    const active = this.payments.filter((p) => p.status === 'active' && p.slip_hash);
    const byHash = new Map<string, Set<string>>();
    for (const p of active) {
      const s = byHash.get(p.slip_hash!) ?? new Set<string>();
      s.add(p.bank_ref);
      byHash.set(p.slip_hash!, s);
    }
    return active.filter((p) => (byHash.get(p.slip_hash!)?.size ?? 0) > 1);
  }

  get pendingRefunds(): RefundRecord[] { return this.refunds.filter((r) => r.status === 'pending'); }
  get refundLog(): RefundRecord[] { return this.refunds.filter((r) => r.status !== 'pending'); }

  /** F9/F10 — ยอดที่ลูกค้าต้องจ่ายร้าน = รับสุทธิ + ค่าส่ง + ค่าธรรมเนียม */
  receivableOf(j: Job): number {
    return (j.tax?.net_receivable ?? j.payment?.total ?? 0)
      + (j.payment?.shipping_fee ?? 0) + (j.payment?.transfer_fee ?? 0);
  }
  outstandingOf(j: Job): number { return this.receivableOf(j) - (j.paid_amount ?? 0); }

  /** F12 — เครดิตค้างเกินจำนวนนี้ = ธงแดง (ดู docs/F12-PAYMENT-LEDGER-DESIGN.md D6). */
  readonly AR_OVERDUE_DAYS = 30;

  /** จำนวนวันที่ค้างชำระ นับจากวันส่งมอบ (date_of_completion). 0 ถ้าไม่มีวันส่งมอบ. */
  overdueDaysOf(j: Job): number {
    const ts = j.date_of_completion;
    if (!ts) return 0;
    const ms = Date.now() - ts.seconds * 1000;
    return Math.max(0, Math.floor(ms / 86400000));
  }
  isOverdue(j: Job): boolean { return this.overdueDaysOf(j) > this.AR_OVERDUE_DAYS; }

  /** งานส่งมอบแล้วแต่ยังจ่ายไม่ครบ (ลูกหนี้/AR เทียบยอดรับสุทธิ) — เรียงค้างนานสุดก่อน. */
  get outstandingDelivered(): Job[] {
    return this.jobs
      .filter((j) => j.status === 'ส่งมอบแล้ว' && (j.paid_amount ?? 0) + 0.01 < this.receivableOf(j))
      .sort((a, b) => this.overdueDaysOf(b) - this.overdueDaysOf(a));
  }

  /** จำนวนลูกหนี้ที่ค้างเกินกำหนด (> 30 วัน) — ใช้โชว์ธงเตือนรวม. */
  get overdueCount(): number {
    return this.outstandingDelivered.filter((j) => this.isOverdue(j)).length;
  }

  /** งานที่ถูกหัก ณ ที่จ่าย แต่ยังไม่ได้ใบ 50 ทวิ. */
  get whtPendingCert(): Job[] {
    return this.jobs.filter((j) => (j.tax?.wht_amount ?? 0) > 0 && !(j.tax?.wht_cert_ref));
  }
  whtOf(j: Job): number { return j.tax?.wht_amount ?? 0; }

  get totalVat(): number { return this.delivered.reduce((s, j) => s + (j.tax?.vat_amount ?? 0), 0); }
  get totalWht(): number { return this.delivered.reduce((s, j) => s + (j.tax?.wht_amount ?? 0), 0); }

  /** bank reconcile (F8.7): payment โอน/เช็ค active ทั้งหมด (ไว้เทียบ statement). */
  get transferPayments(): PaymentRecord[] {
    return this.payments.filter((p) => p.status === 'active' && (p.method === 'โอน' || p.method === 'เช็ค'));
  }
  get transferTotal(): number {
    return this.transferPayments.reduce((s, p) => s + (p.allocated_total ?? 0), 0);
  }

  async approveRefund(r: RefundRecord): Promise<void> {
    if (!confirm(`อนุมัติคืนเงิน ฿${r.amount}?`)) return;
    try { await this.paymentSvc.approveRefund(r.id!); } catch (e) { alert((e as Error).message); }
  }
  async rejectRefund(r: RefundRecord): Promise<void> {
    const reason = prompt('เหตุผลที่ปฏิเสธ (ไม่บังคับ):') ?? '';
    try { await this.paymentSvc.rejectRefund(r.id!, reason); } catch (e) { alert((e as Error).message); }
  }
  async voidPayment(p: PaymentRecord): Promise<void> {
    const reason = prompt('เหตุผลที่ void payment:');
    if (!reason?.trim()) return;
    try { await this.paymentSvc.voidPayment(p.id!, reason.trim()); } catch (e) { alert((e as Error).message); }
  }
  serialFor(jobId: string): string {
    return this.jobs.concat(this.deletedJobs).find((j) => j.id === jobId)?.serial_number ?? jobId.slice(0, 6);
  }

  // ── Payment-adjust audit log ───────────────────────────────────────────────

  /**
   * รวมทุกการเปลี่ยน "ยอดเงิน" ของใบงานไว้ที่เดียว เพื่อให้คนตรวจไม่ต้องไล่ทีละใบ:
   *  - `payment_adjust` — การเงิน/แอดมินปรับ discount/deposit (payload: before/after)
   *  - `edit` ที่ total เปลี่ยน — seller แก้ work_items ก่อนคอนเฟิร์ม
   *    (payload: payment_before/payment_after; กรองเฉพาะที่ total ต่างจริง)
   * เรียงตามเวลาใหม่สุดก่อน; คอลัมน์ "ที่มา" บอกว่ามาจากช่องทางไหน.
   */
  get adjustRows(): AdjustRow[] {
    const byId = new Map(this.jobs.concat(this.deletedJobs).map((j) => [j.id, j]));
    const rowOf = (
      e: JobEvent,
      source: AdjustRow['source'],
      before: Record<string, number>,
      after: Record<string, number>,
      reason: string,
    ): AdjustRow => ({
      id: e.id,
      jobId: e.job_id,
      serial: byId.get(e.job_id)?.serial_number ?? e.job_id.slice(0, 6),
      actor: this.nameOf(e.actor_uid),
      source,
      reason,
      beforeTotal: Number(before['total']) || 0,
      afterTotal: Number(after['total']) || 0,
      beforeDeposit: Number(before['deposit']) || 0,
      afterDeposit: Number(after['deposit']) || 0,
      at: e.at ?? null,
    });

    const adjust = this.adjustEvents.map((e) =>
      rowOf(
        e,
        'ปรับยอด (การเงิน)',
        (e.payload?.['before'] ?? {}) as Record<string, number>,
        (e.payload?.['after'] ?? {}) as Record<string, number>,
        String(e.payload?.['reason'] ?? ''),
      ),
    );

    const edits = this.editEvents
      .filter((e) => {
        const b = e.payload?.['payment_before'] as Record<string, number> | undefined;
        const a = e.payload?.['payment_after'] as Record<string, number> | undefined;
        // เฉพาะ edit ที่กระทบ "ยอด" จริง — แก้ชื่อ/เบอร์/หมายเหตุ ไม่ขึ้น audit นี้
        return b && a && Number(b['total']) !== Number(a['total']);
      })
      .map((e) =>
        rowOf(
          e,
          'แก้รายการงาน',
          e.payload['payment_before'] as Record<string, number>,
          e.payload['payment_after'] as Record<string, number>,
          'แก้รายการงาน (work_items)',
        ),
      );

    return [...adjust, ...edits].sort(
      (x, y) => (y.at?.seconds ?? 0) - (x.at?.seconds ?? 0),
    );
  }

  // ── Cash reconciliation ────────────────────────────────────────────────────

  get sellers(): { uid: string; name: string }[] {
    return this.users.users()
      .filter((u) => u.role === 'seller' || u.role === 'admin')
      .map((u) => ({ uid: u.uid, name: u.display_name }));
  }

  async submitReconcile(): Promise<void> {
    this.recMsg = '';
    this.recErr = false;
    if (!this.recSellerUid || !/^\d{8}$/.test(this.recDate) || this.recDeclared == null) {
      this.recErr = true;
      this.recMsg = 'กรอกผู้ขาย วันที่ (YYYYMMDD) และยอดที่นับได้ให้ครบ';
      return;
    }
    this.recBusy = true;
    try {
      const res = await this.cashSvc.reconcile({
        seller_uid: this.recSellerUid,
        date: this.recDate,
        declared_total: Number(this.recDeclared),
        note: this.recNote || undefined,
      });
      const sign = res.variance === 0 ? 'ตรง' : res.variance > 0 ? `เกิน ${res.variance}` : `ขาด ${Math.abs(res.variance)}`;
      this.recErr = res.variance !== 0;
      this.recMsg = `กระทบยอดแล้ว: ระบบ ${res.system_total} (${res.job_count} งาน) · นับได้ ${res.declared_total} · ${sign}`;
      this.recNote = '';
    } catch (e) {
      this.recErr = true;
      this.recMsg = (e as Error)?.message ?? 'กระทบยอดไม่สำเร็จ';
    } finally {
      this.recBusy = false;
    }
  }

  async closeSession(s: CashSession): Promise<void> {
    if (s.status === 'closed') return;
    try {
      await this.cashSvc.close(s.seller_uid, s.date);
    } catch (e) {
      this.recErr = true;
      this.recMsg = (e as Error)?.message ?? 'ปิดรอบไม่สำเร็จ';
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  nameOf(uid: string | null | undefined): string {
    if (!uid) return '—';
    if (uid === this.appState.uid()) return this.appState.displayName() || '—';
    return this.users.users().find((x) => x.uid === uid)?.display_name || uid.slice(0, 6);
  }

  fmtDate(ts: Timestamp | null): string {
    if (!ts) return '—';
    return new Date(ts.seconds * 1000).toLocaleDateString('th-TH', {
      day: '2-digit', month: '2-digit', year: '2-digit',
    });
  }

  /** YYYYMMDD ของวันนี้ตาม ICT (Asia/Bangkok). */
  private todayICT(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date()).replace(/-/g, '');
  }

  async openJob(jobId: string): Promise<void> {
    if (!jobId) return;
    const modal = await this.modalController.create({
      component: WorksheetInfoComponent,
      componentProps: { jobId },
      cssClass: 'modal-fullscreen',
    });
    await modal.present();
  }

  trackById = (_i: number, x: { id?: string; uid?: string; method?: string }): string =>
    x.id ?? x.uid ?? x.method ?? String(_i);
}
