import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { SESSION_STORAGE_KEY, parseSession } from 'src/app/interfaces/session.interface';
import { FirestoreService } from 'src/app/services/firestore.service';
import { ServiceService } from 'src/app/services/service.service';
import { WorksheetInfoComponent } from '../worksheet-info/worksheet-info.component';

/**
 * Home / Dashboard — unified neo-brutalist kanban view.
 *
 * Replaces the previous ion-segment switcher between seller/graphic/production
 * sub-pages. The prototype's ProtoHomeScreen (assets/100cc77b-…js) is a single
 * board across all 8 worksheet statuses, with a team filter chipped on top
 * (cosmetic — narrows the visible cards to the team's relevant statuses).
 *
 * Data source: `fetchWorkSheetForAdmin()` returns all 8 statuses. Sub-pages'
 * own subscriptions are unaffected (they still self-fetch when entered, though
 * no route currently lands directly on /seller, /graphic, /production).
 *
 * Card click opens the existing WorksheetInfoComponent modal (full-screen),
 * matching the prototype's "open ws" navigation intent.
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

// Which statuses each team primarily owns. Used by the team-filter chips to
// narrow the visible kanban columns without changing data subscriptions.
const TEAM_STATUSES: Record<TeamKey, Status[]> = {
  all: [...STATUS_ORDER],
  seller: ['รอคอนเฟิร์มแบบ', 'คอนเฟิร์มแล้ว', 'รอส่งมอบ', 'ส่งมอบแล้ว'],
  graphic: ['รอออกแบบ', 'กำลังออกแบบ', 'รอคอนเฟิร์มแบบ', 'คอนเฟิร์มแล้ว'],
  production: ['คอนเฟิร์มแล้ว', 'รอผลิต', 'กำลังผลิต', 'รอส่งมอบ'],
};

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  workSheets: any[] = [];

  /** Active team filter — defaults to current user's role when known. */
  team: TeamKey = 'all';

  /** Mobile single-status filter — 'all' or a status string. */
  mobileTab: 'all' | Status = 'all';

  /** Free-text search (serial_number + customer_name). */
  search = '';

  readonly statusOrder = STATUS_ORDER;
  readonly mobileTabs: { key: 'all' | Status; label: string }[] = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'รอออกแบบ', label: 'รอแบบ' },
    { key: 'กำลังผลิต', label: 'ผลิต' },
    { key: 'รอส่งมอบ', label: 'ส่งมอบ' },
  ];

  /** Today, formatted in Thai for the page-header subtitle. */
  todayLabel = '';

  private sub: Subscription | null = null;

  constructor(
    private firestore: FirestoreService,
    private service: ServiceService,
    private modalCtrl: ModalController,
    private router: Router,
  ) {
    this.todayLabel = this.formatTodayThai();
  }

  ngOnInit() {
    // Default team chip to the user's role if it matches a known team.
    const session = parseSession(localStorage.getItem(SESSION_STORAGE_KEY));
    if (session?.role && (session.role in TEAM_STATUSES)) {
      this.team = session.role as TeamKey;
    }

    this.service.presentLoadingWithOutTime('Loading...');
    this.firestore.unsubscribeSubscriptions();
    this.firestore.fetchWorkSheetForAdmin();
    this.sub = this.firestore.workSheetForAdminChange.subscribe((data: any[]) => {
      this.workSheets = this.sort(data || []);
      this.service.dismissLoading();
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  // ── Filtering ─────────────────────────────────────────────────────────────

  /** Apply the search + team filters (used by both kanban + mobile list). */
  get filtered(): any[] {
    const q = this.search.trim().toLowerCase();
    const teamStatuses = new Set<Status>(TEAM_STATUSES[this.team]);
    return this.workSheets.filter((ws) => {
      if (!teamStatuses.has(ws.status)) return false;
      if (!q) return true;
      const serial = String(ws.serial_number || '').toLowerCase();
      const customer = String(ws.customer_name || '').toLowerCase();
      return serial.includes(q) || customer.includes(q);
    });
  }

  /** Subset of statuses to render as kanban columns under the current team. */
  get visibleColumns(): Status[] {
    return TEAM_STATUSES[this.team];
  }

  byStatus(status: Status): any[] {
    return this.filtered.filter((w) => w.status === status);
  }

  // ── Mobile list ───────────────────────────────────────────────────────────

  get mobileList(): any[] {
    if (this.mobileTab === 'all') return this.filtered;
    return this.filtered.filter((w) => w.status === this.mobileTab);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  get totalCount(): number { return this.filtered.length; }
  get urgentCount(): number { return this.filtered.filter((w) => !!w.is_urgent).length; }
  get pendingDesignCount(): number { return this.filtered.filter((w) => w.status === 'รอออกแบบ').length; }
  get printingCount(): number { return this.filtered.filter((w) => w.status === 'กำลังผลิต').length; }
  get deliveredCount(): number { return this.filtered.filter((w) => w.status === 'ส่งมอบแล้ว').length; }

  get totalRevenue(): string {
    const sum = this.filtered.reduce((s, w) => s + (Number(w.total) || 0), 0);
    if (sum >= 1000) return `฿${(sum / 1000).toFixed(1)}K`;
    return `฿${sum.toLocaleString()}`;
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  setTeam(key: string) { this.team = key as TeamKey; }
  setMobileTab(key: string) { this.mobileTab = key as 'all' | Status; }

  trackByKey = (_idx: number, ws: any): string => ws?.key ?? ws?.serial_number ?? String(_idx);

  createWorkSheet() {
    this.router.navigate(['/naikit-sticker/create-work-sheet']);
  }

  async openWorksheet(ws: any) {
    if (!ws) return;
    const modal = await this.modalCtrl.create({
      component: WorksheetInfoComponent,
      componentProps: { workSheet: ws },
      cssClass: 'modal-fullscreen',
    });
    await modal.present();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private sort(list: any[]): any[] {
    // Urgent first, then by serial_number ascending. Matches the seller view's
    // original sort so visual ordering is consistent across the migration.
    return [...list].sort((a, b) => {
      if (a.is_urgent && !b.is_urgent) return -1;
      if (!a.is_urgent && b.is_urgent) return 1;
      const sa = String(a.serial_number || '');
      const sb = String(b.serial_number || '');
      return sa.localeCompare(sb);
    });
  }

  private formatTodayThai(): string {
    const d = new Date();
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  }
}
