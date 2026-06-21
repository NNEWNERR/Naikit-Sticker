import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Timestamp } from 'firebase/firestore';

import { AppStateService } from 'src/app/services/app-state.service';
import { JobsService } from 'src/app/services/jobs.service';
import { UsersService } from 'src/app/services/users.service';
import { CashService } from 'src/app/services/cash.service';
import { ModalController } from 'src/app/services/modal.service';
import { Job, JobEvent } from 'src/app/core/models/job';
import { CashSession } from 'src/app/core/models/cash';
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
  reason: string;
  beforeTotal: number;
  afterTotal: number;
  beforeDeposit: number;
  afterDeposit: number;
  at: Timestamp | null;
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
  imports: [CommonModule, FormsModule],
})
export class FinanceComponent implements OnInit, OnDestroy {

  private jobs: Job[] = [];          // non-deleted, all (finance/admin)
  deletedJobs: Job[] = [];
  adjustEvents: JobEvent[] = [];
  cashSessions: CashSession[] = [];

  // reconcile form
  recSellerUid = '';
  recDate = this.todayICT();
  recDeclared: number | null = null;
  recNote = '';
  recBusy = false;
  recMsg = '';
  recErr = false;

  private cleanups: Array<() => void> = [];

  constructor(
    private appState: AppStateService,
    private jobsSvc: JobsService,
    private users: UsersService,
    private cashSvc: CashService,
    private modalController: ModalController,
  ) {}

  ngOnInit(): void {
    const role = this.appState.role();
    const uid = this.appState.uid();
    if (!role || !uid) return;

    this.cleanups.push(this.users.attachListener());
    this.cleanups.push(this.jobsSvc.watchVisibleJobs(role, uid, (j) => (this.jobs = j)));
    this.cleanups.push(this.jobsSvc.watchDeletedJobs((j) => (this.deletedJobs = j)));
    this.cleanups.push(this.jobsSvc.watchPaymentAdjustEvents((e) => (this.adjustEvents = e)));
    this.cleanups.push(this.cashSvc.watchSessions((s) => (this.cashSessions = s)));
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

  // ── Payment-adjust audit log ───────────────────────────────────────────────

  get adjustRows(): AdjustRow[] {
    const byId = new Map(this.jobs.concat(this.deletedJobs).map((j) => [j.id, j]));
    return this.adjustEvents.map((e) => {
      const before = (e.payload?.['before'] ?? {}) as Record<string, number>;
      const after = (e.payload?.['after'] ?? {}) as Record<string, number>;
      return {
        id: e.id,
        jobId: e.job_id,
        serial: byId.get(e.job_id)?.serial_number ?? e.job_id.slice(0, 6),
        actor: this.nameOf(e.actor_uid),
        reason: String(e.payload?.['reason'] ?? ''),
        beforeTotal: Number(before['total']) || 0,
        afterTotal: Number(after['total']) || 0,
        beforeDeposit: Number(before['deposit']) || 0,
        afterDeposit: Number(after['deposit']) || 0,
        at: e.at ?? null,
      };
    });
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
