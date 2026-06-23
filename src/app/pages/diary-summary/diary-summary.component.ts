import { Component, OnDestroy, OnInit } from '@angular/core';
import { Timestamp } from 'firebase/firestore';
import { AppStateService } from 'src/app/services/app-state.service';
import { JobsService } from 'src/app/services/jobs.service';
import { UsersService } from 'src/app/services/users.service';
import { Job } from 'src/app/core/models/job';
import { WorksheetInfoComponent } from '../worksheet-info/worksheet-info.component';
import { ModalController } from 'src/app/services/modal.service';
import { NkBadgeTone } from 'src/app/shared/components';

/** Flattened, display-ready row derived from a v2 `Job`. */
interface DiaryRow {
  id: string;
  serial_number: string;
  customer_name: string;
  is_urgent: boolean;
  status: string;
  seller_name: string;
  design_name: string;
  total: number;
  date_of_acceptance: Timestamp | null;
  work_items: Job['work_items'];
}

@Component({
  selector: 'app-diary-summary',
  templateUrl: './diary-summary.component.html',
  styleUrls: ['./diary-summary.component.scss'],
})
export class DiarySummaryComponent implements OnInit, OnDestroy {

  /** The selected "นัดรับ" day — diary shows post-confirm jobs due this date. */
  date = new Date();

  /** Raw jobs visible to the current user (admin = all, seller = own). */
  private rawJobs: Job[] = [];
  loadError = '';

  private jobsCleanup?: () => void;
  private usersCleanup?: () => void;

  /**
   * The 5 "post-confirm" statuses surfaced by the diary summary — worksheets
   * the seller already locked in. Drives the filter chips below.
   */
  readonly confirmedStatuses = ['คอนเฟิร์มแล้ว', 'รอผลิต', 'กำลังผลิต', 'รอส่งมอบ', 'ส่งมอบแล้ว'] as const;

  readonly statusLabels: Record<string, { short: string; tone: NkBadgeTone }> = {
    'คอนเฟิร์มแล้ว': { short: 'พร้อมผลิต', tone: 'status-confirmed' },
    'รอผลิต':       { short: 'รอผลิต',    tone: 'status-printq' },
    'กำลังผลิต':    { short: 'ผลิต',      tone: 'status-printing' },
    'รอส่งมอบ':     { short: 'รอส่ง',     tone: 'status-deliverq' },
    'ส่งมอบแล้ว':   { short: 'ส่งแล้ว',    tone: 'status-delivered' },
  };

  /** Currently active chip — 'all' shows every confirmed worksheet. */
  selectedFilter: 'all' | string = 'all';

  constructor(
    private appState: AppStateService,
    private jobs: JobsService,
    private users: UsersService,
    private modalController: ModalController,
  ) { }

  ngOnInit() {
    const role = this.appState.role();
    const uid = this.appState.uid();
    if (!role || !uid) return;

    // admin + finance may read the full users collection (firestore.rules).
    if (role === 'admin' || role === 'finance') {
      this.usersCleanup = this.users.attachListener();
    }

    this.jobsCleanup = this.jobs.watchVisibleJobs(
      role,
      uid,
      (jobs) => {
        this.rawJobs = jobs;
        this.loadError = '';
      },
      () => { this.loadError = 'โหลดสมุดงานไม่สำเร็จ กรุณารีเฟรชหน้าหรือเข้าสู่ระบบใหม่'; },
    );
  }

  ngOnDestroy() {
    this.jobsCleanup?.();
    this.usersCleanup?.();
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  /** Post-confirm worksheets due on the selected นัดรับ date, role-scoped. */
  get confirmedWorkSheets(): DiaryRow[] {
    const allowed = new Set<string>(this.confirmedStatuses);
    return this.rawJobs
      .filter((j) => allowed.has(j.status) && this.isSameDay(j.date_of_acceptance, this.date))
      .map((j) => this.toRow(j));
  }

  get visibleRows(): DiaryRow[] {
    if (this.selectedFilter === 'all') return this.confirmedWorkSheets;
    return this.confirmedWorkSheets.filter((w) => w.status === this.selectedFilter);
  }

  setFilter(key: string) {
    this.selectedFilter = key;
  }

  countOf(status: string): number {
    return this.confirmedWorkSheets.filter((w) => w.status === status).length;
  }

  get urgentCount(): number {
    return this.confirmedWorkSheets.filter((w) => w.is_urgent).length;
  }

  get deliveredCount(): number {
    return this.confirmedWorkSheets.filter((w) => w.status === 'ส่งมอบแล้ว').length;
  }

  getTotalAmount(): number {
    return this.confirmedWorkSheets.reduce((sum, w) => sum + (w.total || 0), 0);
  }

  toneFor(status: string): NkBadgeTone {
    return this.statusLabels[status]?.tone || 'neutral';
  }

  trackByKey = (_i: number, w: DiaryRow): string => w?.id ?? String(_i);

  // ── Date input adapter ────────────────────────────────────────────────────

  /**
   * String adapter for <input type="date">. The component stores `date` as a
   * Date; the input speaks ISO yyyy-MM-dd. Setting normalizes to noon to dodge
   * timezone drift across the day boundary.
   */
  get dateInputValue(): string {
    const d = this.date instanceof Date ? this.date : new Date(this.date);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  set dateInputValue(v: string) {
    if (!v) return;
    const parsed = new Date(v + 'T12:00:00');
    if (!isNaN(parsed.getTime())) {
      this.date = parsed;
    }
  }

  resetFilters() {
    this.date = new Date();
    this.selectedFilter = 'all';
  }

  /** Period label for the SUMMARY block — Thai month + พ.ศ. of selected date. */
  get monthLabel(): string {
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const d = new Date(this.date);
    return `${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private isSameDay(ts: Timestamp | null | undefined, day: Date): boolean {
    if (!ts) return false;
    const d = new Date(ts.seconds * 1000);
    return d.getFullYear() === day.getFullYear()
        && d.getMonth() === day.getMonth()
        && d.getDate() === day.getDate();
  }

  private toRow(j: Job): DiaryRow {
    return {
      id: j.id,
      serial_number: j.serial_number,
      customer_name: j.customer_name,
      is_urgent: !!j.is_urgent,
      status: j.status,
      seller_name: this.nameOf(j.seller_uid),
      design_name: j.design_uid ? this.nameOf(j.design_uid) : '',
      total: j.payment?.total ?? 0,
      date_of_acceptance: j.date_of_acceptance ?? null,
      work_items: j.work_items ?? [],
    };
  }

  private nameOf(uid: string | null | undefined): string {
    if (!uid) return '—';
    if (uid === this.appState.uid()) return this.appState.displayName() || '—';
    const u = this.users.users().find((x) => x.uid === uid);
    return u?.display_name || '—';
  }

  async workSheetInfo(row: DiaryRow) {
    if (!row?.id) return;
    const modal = await this.modalController.create({
      component: WorksheetInfoComponent,
      componentProps: { jobId: row.id },
      cssClass: 'modal-fullscreen',
    });
    await modal.present();
  }

  async exportToExcel() {
    const rows = this.confirmedWorkSheets;
    if (rows.length === 0) return;
    const XLSX = await import('xlsx');
    const data = rows.map((w) => ({
      'เลขใบงาน': w.serial_number,
      'ลูกค้า': w.customer_name,
      'สถานะ': w.status,
      'ด่วน': w.is_urgent ? '⚡' : '',
      'ผู้ขาย': w.seller_name,
      'ผู้ออกแบบ': w.design_name || '-',
      'ยอด (บาท)': w.total,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'สรุปงานคอนเฟิร์ม');
    XLSX.writeFile(wb, `naikit-diary-${this.dateInputValue}.xlsx`);
  }
}
