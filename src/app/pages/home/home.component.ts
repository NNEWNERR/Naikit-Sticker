import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from 'src/app/services/modal.service';
import { AppStateService } from 'src/app/services/app-state.service';
import { JobsService } from 'src/app/services/jobs.service';
import { WorksheetInfoComponent } from '../worksheet-info/worksheet-info.component';
import { Job } from 'src/app/core/models/job';
import { Role } from 'src/app/core/models/session';

/**
 * Home / Dashboard — role-aware kanban.
 *
 * Data source: `JobsService.watchMyJobs()` runs Firestore queries appropriate
 * for the caller's role (admin = all; seller = own; graphic = queue + claimed;
 * production = queue + claimed). No FirestoreService involved.
 *
 * Kanban columns are pre-set to the role's relevant statuses; admin gets the
 * full team-filter chip strip.
 */

const STATUS_ORDER = [
  'รอออกแบบ',
  'กำลังออกแบบ',
  'รอคอนเฟิร์มแบบ',
  'คอนเฟิร์มแล้ว',
  'รอผลิต',
  'กำลังผลิต',
  'รอส่งมอบ',
  'ส่งมอบแล้ว',
] as const;

type Status = typeof STATUS_ORDER[number];
type TeamKey = 'all' | 'seller' | 'graphic' | 'production';

const TEAM_STATUSES: Record<TeamKey, readonly Status[]> = {
  all:        STATUS_ORDER,
  seller:     ['รอคอนเฟิร์มแบบ', 'คอนเฟิร์มแล้ว', 'รอส่งมอบ', 'ส่งมอบแล้ว'],
  graphic:    ['รอออกแบบ', 'กำลังออกแบบ', 'รอคอนเฟิร์มแบบ'],
  production: ['คอนเฟิร์มแล้ว', 'รอผลิต', 'กำลังผลิต', 'รอส่งมอบ'],
};

const ROLE_DEFAULT_COLUMNS: Record<Role, readonly Status[]> = {
  seller:     STATUS_ORDER,
  graphic:    TEAM_STATUSES.graphic,
  production: TEAM_STATUSES.production,
  admin:      STATUS_ORDER,
};

const MOBILE_TABS: Record<Role, { key: 'all' | Status; label: string }[]> = {
  seller:     [
    { key: 'all',          label: 'ทั้งหมด' },
    { key: 'รอคอนเฟิร์มแบบ', label: 'คอนเฟิร์ม' },
    { key: 'รอส่งมอบ',      label: 'ส่งมอบ' },
    { key: 'ส่งมอบแล้ว',    label: 'เสร็จ' },
  ],
  graphic:    [
    { key: 'all',          label: 'ทั้งหมด' },
    { key: 'รอออกแบบ',     label: 'รอแบบ' },
    { key: 'กำลังออกแบบ',  label: 'ออกแบบ' },
    { key: 'รอคอนเฟิร์มแบบ', label: 'รอ confirm' },
  ],
  production: [
    { key: 'all',          label: 'ทั้งหมด' },
    { key: 'รอผลิต',       label: 'รอผลิต' },
    { key: 'กำลังผลิต',    label: 'ผลิต' },
    { key: 'รอส่งมอบ',     label: 'ส่งมอบ' },
  ],
  admin:      [
    { key: 'all',          label: 'ทั้งหมด' },
    { key: 'รอออกแบบ',     label: 'รอแบบ' },
    { key: 'กำลังผลิต',    label: 'ผลิต' },
    { key: 'รอส่งมอบ',     label: 'ส่งมอบ' },
  ],
};

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  jobs: Job[] = [];

  /** Admin-only team filter (selects kanban column set). */
  team: TeamKey = 'all';

  /** Mobile single-status filter. */
  mobileTab: 'all' | Status = 'all';

  search = '';
  todayLabel = '';
  isLoading = true;

  readonly statusOrder = STATUS_ORDER;

  private detachJobs?: () => void;

  constructor(
    private jobsSvc: JobsService,
    private modalCtrl: ModalController,
    private router: Router,
    private appState: AppStateService,
  ) {
    this.todayLabel = this.formatTodayThai();
  }

  // ── Role helpers ──────────────────────────────────────────────────────────

  get currentRole(): Role { return this.appState.role() ?? 'seller'; }
  get isAdmin(): boolean  { return this.currentRole === 'admin'; }
  get canCreate(): boolean { return this.currentRole === 'seller' || this.currentRole === 'admin'; }

  get mobileTabs() { return MOBILE_TABS[this.currentRole]; }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit() {
    const role = this.currentRole;
    const uid  = this.appState.uid() ?? '';

    // Pre-set team chip for admin; non-admin have fixed column view
    if (role !== 'admin') {
      this.team = (role as TeamKey) in TEAM_STATUSES ? (role as TeamKey) : 'all';
    }

    this.isLoading = true;
    this.detachJobs = this.jobsSvc.watchMyJobs(role, uid, (jobs) => {
      this.jobs = this.sort(jobs);
      this.isLoading = false;
    });
  }

  ngOnDestroy() {
    this.detachJobs?.();
  }

  // ── Filtering ─────────────────────────────────────────────────────────────

  get filtered(): Job[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.jobs;
    return this.jobs.filter((j) => {
      const serial   = j.serial_number?.toLowerCase() ?? '';
      const customer = j.customer_name?.toLowerCase() ?? '';
      return serial.includes(q) || customer.includes(q);
    });
  }

  get visibleColumns(): readonly Status[] {
    if (this.isAdmin) return TEAM_STATUSES[this.team];
    return ROLE_DEFAULT_COLUMNS[this.currentRole];
  }

  byStatus(status: Status): Job[] {
    return this.filtered.filter((j) => j.status === status);
  }

  get mobileList(): Job[] {
    if (this.mobileTab === 'all') return this.filtered;
    return this.filtered.filter((j) => j.status === this.mobileTab);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  get totalCount():         number { return this.filtered.length; }
  get urgentCount():        number { return this.filtered.filter((j) => !!j.is_urgent).length; }
  get pendingDesignCount(): number { return this.filtered.filter((j) => j.status === 'รอออกแบบ').length; }
  get printingCount():      number { return this.filtered.filter((j) => j.status === 'กำลังผลิต').length; }
  get deliveredCount():     number { return this.filtered.filter((j) => j.status === 'ส่งมอบแล้ว').length; }

  get totalRevenue(): string {
    const sum = this.filtered.reduce((s, j) => s + (Number(j.payment?.total) || 0), 0);
    if (sum >= 1000) return `฿${(sum / 1000).toFixed(1)}K`;
    return `฿${sum.toLocaleString()}`;
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  setTeam(key: string)      { this.team = key as TeamKey; }
  setMobileTab(key: string) { this.mobileTab = key as 'all' | Status; }

  trackByKey = (_idx: number, j: Job): string => j.id ?? String(_idx);

  createWorkSheet() {
    this.router.navigate(['/naikit-sticker/create-work-sheet']);
  }

  async openWorksheet(ws: Job | any) {
    if (!ws) return;
    const jobId: string = (ws as Job).id ?? (ws as any).key ?? '';
    if (!jobId) return;
    const modal = await this.modalCtrl.create({
      component: WorksheetInfoComponent,
      componentProps: { jobId },
      cssClass: 'modal-fullscreen',
    });
    await modal.present();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private sort(list: Job[]): Job[] {
    return [...list].sort((a, b) => {
      if (a.is_urgent && !b.is_urgent) return -1;
      if (!a.is_urgent && b.is_urgent) return 1;
      return (a.serial_number ?? '').localeCompare(b.serial_number ?? '');
    });
  }

  private formatTodayThai(): string {
    const d = new Date();
    const days   = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  }
}
