import { Component, OnDestroy, OnInit } from '@angular/core';
import { Timestamp } from 'firebase/firestore';
import { ModalController } from 'src/app/services/modal.service';
import { AppStateService } from 'src/app/services/app-state.service';
import { JobsService } from 'src/app/services/jobs.service';
import { UsersService } from 'src/app/services/users.service';
import { Job } from 'src/app/core/models/job';
import { WorksheetInfoComponent } from '../worksheet-info/worksheet-info.component';
import { NkBadgeTone } from 'src/app/shared/components';

/** Flattened, display-ready row derived from a v2 `Job`. */
interface ReportRow {
  id: string;
  serial_number: string;
  customer_name: string;
  is_urgent: boolean;
  status: string;
  seller_name: string;
  design_name: string;
  total: number;
  created_at: Timestamp | null;
  date_of_acceptance: Timestamp | null;
  work_items: Job['work_items'];
}

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss'],
})
export class ReportComponent implements OnInit, OnDestroy {

  /** Raw jobs visible to the current user (admin = all, seller = own). */
  private rawJobs: Job[] = [];

  currentSearch = '';
  selectedStatusFilter: string | null = null;

  private jobsCleanup?: () => void;
  private usersCleanup?: () => void;

  /**
   * 8-status breakdown — drives the brutal grid at the top of the report.
   * Same ordering / short labels as worksheet-info Timeline so the language
   * is consistent across the app.
   */
  readonly statusList: { key: string; short: string; tone: NkBadgeTone }[] = [
    { key: 'รอออกแบบ',      short: 'รอแบบ',     tone: 'status-design' },
    { key: 'กำลังออกแบบ',    short: 'ออกแบบ',    tone: 'status-designing' },
    { key: 'รอคอนเฟิร์มแบบ', short: 'รอคอนเฟิร์ม', tone: 'status-await' },
    { key: 'คอนเฟิร์มแล้ว',   short: 'พร้อมผลิต', tone: 'status-confirmed' },
    { key: 'รอผลิต',         short: 'รอผลิต',    tone: 'status-printq' },
    { key: 'กำลังผลิต',      short: 'ผลิต',      tone: 'status-printing' },
    { key: 'รอส่งมอบ',       short: 'รอส่ง',     tone: 'status-deliverq' },
    { key: 'ส่งมอบแล้ว',     short: 'ส่งแล้ว',    tone: 'status-delivered' },
  ];

  /** Status-palette lookup — same hex values as TimelineComponent + BadgeComponent. */
  private static readonly STATUS_PALETTE: Record<string, { bg: string; fg: string; dot: string }> = {
    'รอออกแบบ':      { bg: '#FFE9E9', fg: '#B91C1C', dot: '#DC2626' },
    'กำลังออกแบบ':    { bg: '#E0F2FE', fg: '#075985', dot: '#0284C7' },
    'รอคอนเฟิร์มแบบ': { bg: '#FFF7CC', fg: '#854D0E', dot: '#CA8A04' },
    'คอนเฟิร์มแล้ว':   { bg: '#DCFCE7', fg: '#166534', dot: '#16A34A' },
    'รอผลิต':         { bg: '#EDE9FE', fg: '#5B21B6', dot: '#7C3AED' },
    'กำลังผลิต':      { bg: '#E0E7FF', fg: '#3730A3', dot: '#4F46E5' },
    'รอส่งมอบ':       { bg: '#FFEDD5', fg: '#9A3412', dot: '#EA580C' },
    'ส่งมอบแล้ว':     { bg: '#CCFBF1', fg: '#115E59', dot: '#0D9488' },
  };

  constructor(
    private modalController: ModalController,
    private appState: AppStateService,
    private jobs: JobsService,
    private users: UsersService,
  ) { }

  ngOnInit() {
    const role = this.appState.role();
    const uid = this.appState.uid();
    if (!role || !uid) return;

    // Only admin may read the full users collection (firestore.rules); attach
    // the shared listener so seller_uid / design_uid resolve to display names.
    if (role === 'admin') {
      this.usersCleanup = this.users.attachListener();
    }

    this.jobsCleanup = this.jobs.watchVisibleJobs(role, uid, (jobs) => {
      this.rawJobs = jobs;
    });
  }

  ngOnDestroy() {
    this.jobsCleanup?.();
    this.usersCleanup?.();
  }

  paletteOf(status: string): { bg: string; fg: string; dot: string } {
    return ReportComponent.STATUS_PALETTE[status] || { bg: '#F4F4F4', fg: '#525252', dot: '#A3A3A3' };
  }

  toneFor(status: string): NkBadgeTone {
    return this.statusList.find((s) => s.key === status)?.tone || 'neutral';
  }

  countOf(status: string): number {
    return this.rawJobs.filter((w) => w.status === status).length;
  }

  setStatusFilter(status: string) {
    this.selectedStatusFilter = this.selectedStatusFilter === status ? null : status;
  }

  clearStatusFilter() {
    this.selectedStatusFilter = null;
  }

  /** No-op: search term is two-way bound via ngModel; rows recompute reactively. */
  onWorkSheetSearchChange(_event?: unknown) { /* intentionally empty */ }

  /** Final rows shown in the table — combines tile-filter + search filter. */
  get visibleRows(): ReportRow[] {
    const q = this.currentSearch.trim().toLowerCase();
    return this.rawJobs
      .filter((j) => {
        if (this.selectedStatusFilter && j.status !== this.selectedStatusFilter) return false;
        if (q) {
          const hay = `${j.serial_number} ${j.customer_name}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map((j) => this.toRow(j));
  }

  private toRow(j: Job): ReportRow {
    return {
      id: j.id,
      serial_number: j.serial_number,
      customer_name: j.customer_name,
      is_urgent: !!j.is_urgent,
      status: j.status,
      seller_name: this.nameOf(j.seller_uid),
      design_name: j.design_uid ? this.nameOf(j.design_uid) : '',
      total: j.payment?.total ?? 0,
      created_at: j.created_at ?? null,
      date_of_acceptance: j.date_of_acceptance ?? null,
      work_items: j.work_items ?? [],
    };
  }

  /**
   * Resolve a uid to a display name. Self resolves from the session; everyone
   * else from the admin-only users listener (empty for sellers, who only ever
   * see their own jobs anyway).
   */
  private nameOf(uid: string | null | undefined): string {
    if (!uid) return '—';
    if (uid === this.appState.uid()) return this.appState.displayName() || '—';
    const u = this.users.users().find((x) => x.uid === uid);
    return u?.display_name || '—';
  }

  /** Short MM-DD label for the table's "วันสั่ง" column. */
  shortDate(ts: Timestamp | null): string {
    if (!ts) return '—';
    const d = new Date(ts.seconds * 1000);
    if (isNaN(d.getTime())) return '—';
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}-${dd}`;
  }

  formatTime(timestamp: Timestamp): string {
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  trackByKey = (_i: number, w: ReportRow): string => w?.id ?? String(_i);

  async workSheetInfo(row: ReportRow) {
    if (!row?.id) return;
    const modal = await this.modalController.create({
      component: WorksheetInfoComponent,
      componentProps: { jobId: row.id },
      cssClass: 'modal-fullscreen',
    });
    await modal.present();
  }
}
