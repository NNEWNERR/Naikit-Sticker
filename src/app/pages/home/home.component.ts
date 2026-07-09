import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from 'src/app/services/modal.service';
import { AppStateService } from 'src/app/services/app-state.service';
import { JobsService } from 'src/app/services/jobs.service';
import { WorksheetInfoComponent } from '../worksheet-info/worksheet-info.component';
import { Job } from 'src/app/core/models/job';
import { Role } from 'src/app/core/models/session';
import { MACHINE_GROUPS, machinesForTypes } from 'src/app/core/data/work-item-catalog';

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

// ทุก role เห็นทุกคอลัมน์ — data query (watchMyJobs) + firestore.rules คุมว่า "งานไหน"
// อยู่แล้ว, คอลัมน์ไม่ควรซ่อนสถานะ (ไม่งั้น seller ไม่เห็นงานตัวเองที่ยัง 'รอออกแบบ',
// graphic ไม่เห็น 'คอนเฟิร์มแล้ว' → ส่งผลิตไม่ได้). คอลัมน์ที่ไม่มีงานจะว่างเฉยๆ.
const ROLE_DEFAULT_COLUMNS: Record<Role, readonly Status[]> = {
  // seller/graphic เห็นทุกสถานะ: query ดึงงานตัวเองได้ทุก stage (seller=seller_uid,
  // graphic=design_uid+FUJI) → คอลัมน์ต้องครบ ไม่งั้นงานตัวเองหาย.
  seller:     STATUS_ORDER,
  graphic:    STATUS_ORDER,
  // production: query ดึงเฉพาะคิวผลิต (คอนเฟิร์มแล้ว→รอส่งมอบ) + งานที่ตน claim. คอลัมน์
  // ออกแบบ (รอออกแบบ/กำลังออกแบบ/รอคอนเฟิร์มแบบ) ว่างเสมอ → ตัดออกให้เหลือคิวที่ผลิต
  // ทำได้จริง (ตรงกับ MOBILE_TABS.production). ส่งเข้าผลิต=กราฟิก → ไม่ต้องมี 'คอนเฟิร์มแล้ว'.
  production: ['รอผลิต', 'กำลังผลิต', 'รอส่งมอบ'],
  admin:      STATUS_ORDER,
  finance:    STATUS_ORDER,
  stock:      [], // F17 — ไม่เห็น jobs (redirect ไป /stock ใน ngOnInit)
};

const MOBILE_TABS: Record<Role, { key: 'all' | Status; label: string }[]> = {
  seller:     [
    { key: 'all',          label: 'ทั้งหมด' },
    { key: 'รอออกแบบ',     label: 'รอแบบ' },
    { key: 'กำลังออกแบบ',  label: 'ออกแบบ' },
    { key: 'รอคอนเฟิร์มแบบ', label: 'คอนเฟิร์ม' },
    { key: 'รอส่งมอบ',      label: 'ส่งมอบ' },
    { key: 'ส่งมอบแล้ว',    label: 'เสร็จ' },
  ],
  graphic:    [
    { key: 'all',          label: 'ทั้งหมด' },
    { key: 'รอออกแบบ',     label: 'รอแบบ' },
    { key: 'กำลังออกแบบ',  label: 'ออกแบบ' },
    { key: 'รอคอนเฟิร์มแบบ', label: 'รอ confirm' },
    { key: 'คอนเฟิร์มแล้ว',  label: 'พร้อมผลิต' },
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
  finance:    [
    { key: 'all',          label: 'ทั้งหมด' },
    { key: 'รอออกแบบ',     label: 'รอแบบ' },
    { key: 'กำลังผลิต',    label: 'ผลิต' },
    { key: 'รอส่งมอบ',     label: 'ส่งมอบ' },
  ],
  stock:      [{ key: 'all', label: 'ทั้งหมด' }], // F17 — ไม่ถูก render (redirect)
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

  /** Soft filter ตามเครื่อง/ประเภทผลิต (FUJI/ไวนิล/สติ๊กเกอร์ใหญ่/สติกเกอร์ตัด/อื่นๆ). */
  machineFilter = 'all';

  search = '';
  todayLabel = '';
  isLoading = true;
  loadError = '';

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

  // ── Machine/type soft filter ────────────────────────────────────────────────
  // โชว์ให้ฝ่ายผลิต/กราฟิก/แอดมิน (คนที่เกี่ยวกับเครื่องพิมพ์) — seller/finance ไม่ต้อง
  get showMachineFilter(): boolean {
    const r = this.currentRole;
    return r === 'production' || r === 'graphic' || r === 'admin';
  }
  get machineOptions(): { key: string; label: string }[] {
    return [{ key: 'all', label: 'ทุกเครื่อง' }, ...MACHINE_GROUPS.map((m) => ({ key: m.value, label: m.label }))];
  }
  setMachine(key: string) { this.machineFilter = key; }
  /** ใบงานเกี่ยวกับเครื่องที่เลือกไหม (อิงประเภทของ work_items — ใบหลายประเภทเข้าได้หลายเครื่อง). */
  private matchesMachine(j: Job): boolean {
    if (this.machineFilter === 'all') return true;
    return machinesForTypes((j.work_items ?? []).map((w) => w.type)).includes(this.machineFilter);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit() {
    const role = this.currentRole;
    const uid  = this.appState.uid() ?? '';

    // F17 — role stock ไม่มีสิทธิ์อ่าน jobs (rules) → home ว่างเปล่า; ส่งไปหน้าสต๊อกเลย
    if (role === 'stock') {
      void this.router.navigate(['/naikit-sticker/stock'], { replaceUrl: true });
      return;
    }

    // Pre-set team chip for admin; non-admin have fixed column view
    if (role !== 'admin') {
      this.team = (role as TeamKey) in TEAM_STATUSES ? (role as TeamKey) : 'all';
    }

    this.isLoading = true;
    this.loadError = '';
    this.detachJobs = this.jobsSvc.watchMyJobs(
      role,
      uid,
      (jobs) => {
        this.jobs = this.sort(jobs);
        this.isLoading = false;
        this.loadError = '';
      },
      () => {
        // Listener rejected — stop the skeleton and tell the user instead of spinning forever.
        this.isLoading = false;
        this.loadError = 'โหลดรายการใบงานไม่สำเร็จ กรุณารีเฟรชหน้าหรือเข้าสู่ระบบใหม่';
      },
    );
  }

  ngOnDestroy() {
    this.detachJobs?.();
  }

  // ── Filtering ─────────────────────────────────────────────────────────────

  get filtered(): Job[] {
    const q = this.search.trim().toLowerCase();
    return this.jobs.filter((j) => {
      if (!this.matchesMachine(j)) return false;
      if (!q) return true;
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

  get canRecordPayment(): boolean {
    return this.currentRole === 'seller' || this.currentRole === 'finance' || this.currentRole === 'admin';
  }
  goCombinedPayment() {
    this.router.navigate(['/naikit-sticker/combined-payment']);
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
