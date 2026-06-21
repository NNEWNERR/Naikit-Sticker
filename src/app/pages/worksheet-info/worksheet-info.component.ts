import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Timestamp } from 'firebase/firestore';

import { AppStateService } from 'src/app/services/app-state.service';
import { CommentsService } from 'src/app/services/comments.service';
import { JobsService } from 'src/app/services/jobs.service';
import { UsersService } from 'src/app/services/users.service';
import { ModalController } from 'src/app/services/modal.service';
import {
  BadgeComponent,
  EmptyStateComponent,
  PageHeaderComponent,
  SkeletonComponent,
  TimelineComponent,
  TimelineStep,
} from 'src/app/shared/components';
import { Job, JobAction, JobComment, JobEvent } from 'src/app/core/models/job';

const ACTION_LABELS: Record<JobAction, string> = {
  create:           'สร้างใบงาน',
  edit:             'แก้ไขข้อมูล',
  claim_design:     'รับงานออกแบบ',
  claim_print:      'รับงานผลิต',
  submit_design:    'ส่งแบบ',
  confirm_design:   'คอนเฟิร์มแบบ',
  request_revision: 'ขอแก้ไขแบบ',
  start_print:      'ส่งเข้าผลิต',
  upload_print:     'อัพโหลดงานพิมพ์',
  mark_delivered:   'ส่งมอบแล้ว',
  payment_adjust:   'ปรับยอดเงิน (การเงิน)',
  comment_add:      'เพิ่มหมายเหตุ',
  comment_delete:   'ลบหมายเหตุ',
  admin_reassign:   'มอบหมายงาน (admin)',
  delete:           'ลบใบงาน',
  restore:          'กู้คืนใบงาน',
};

const ROLE_LABELS: Record<string, string> = {
  seller:     'ฝ่ายขาย',
  graphic:    'กราฟิก',
  production: 'ผลิต',
  admin:      'แอดมิน',
};

@Component({
  selector: 'app-worksheet-info',
  templateUrl: './worksheet-info.component.html',
  styleUrls: ['./worksheet-info.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    TimelineComponent,
    BadgeComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
})
export class WorksheetInfoComponent implements OnInit, OnDestroy {
  @Input() jobId!: string;

  private jobsSvc = inject(JobsService);
  private commentsSvc = inject(CommentsService);
  private modalCtrl = inject(ModalController);
  private appState = inject(AppStateService);
  private usersSvc = inject(UsersService);

  job = signal<Job | null>(null);
  jobLoading = signal(true);
  events = signal<JobEvent[]>([]);
  comments = signal<JobComment[]>([]);

  actionLoading = signal(false);
  actionError = signal('');

  mobilePanel: 'sales' | 'graphic' | 'production' = 'sales';
  showAuditLog = false;
  commentText = '';
  commentLoading = false;
  revisionNote = '';
  showRevisionInput = false;

  /** Files staged for design image upload (submitDesign). */
  designFiles: File[] = [];
  /** Files staged for print image upload (uploadPrint). */
  printFiles: File[] = [];
  /** Optional payment slips staged for markDelivered. */
  slipFiles: File[] = [];

  /** F2/F6 — finance adjustPayment form state. */
  showAdjust = false;
  adjDeposit: number | null = null;
  adjDiscount: number | null = null;
  adjMethod = '';
  adjReason = '';
  readonly paymentMethods = ['เงินสด', 'โอน', 'เช็ค', 'เครดิต', 'อื่นๆ'];

  private detachJob?: () => void;
  private detachEvents?: () => void;
  private detachComments?: () => void;
  private detachUsers?: () => void;

  readonly timelineSteps: TimelineStep[] = [
    { key: 'รอออกแบบ',      short: 'รอแบบ' },
    { key: 'กำลังออกแบบ',    short: 'ออกแบบ' },
    { key: 'รอคอนเฟิร์มแบบ', short: 'คอนเฟิร์ม' },
    { key: 'คอนเฟิร์มแล้ว',   short: 'พร้อมผลิต' },
    { key: 'รอผลิต',         short: 'รอผลิต' },
    { key: 'กำลังผลิต',      short: 'ผลิต' },
    { key: 'รอส่งมอบ',       short: 'รอส่ง' },
    { key: 'ส่งมอบแล้ว',     short: 'ส่งแล้ว' },
  ];

  goBack = () => this.modalCtrl.dismiss();

  // ── Session shortcuts ──────────────────────────────────────────────────

  private uid   = computed(() => this.appState.uid());
  private role  = computed(() => this.appState.role());

  // ── Action visibility ──────────────────────────────────────────────────

  canClaimDesign = computed(() => {
    const j = this.job(); const r = this.role();
    return !!j && !j.is_deleted && (r === 'graphic' || r === 'admin')
      && j.status === 'รอออกแบบ' && j.design_uid === null;
  });

  canSubmitDesign = computed(() => {
    const j = this.job(); const r = this.role(); const uid = this.uid();
    return !!j && !j.is_deleted && j.status === 'กำลังออกแบบ'
      && (r === 'admin' || j.design_uid === uid);
  });

  canConfirmDesign = computed(() => {
    const j = this.job(); const r = this.role(); const uid = this.uid();
    return !!j && !j.is_deleted && j.status === 'รอคอนเฟิร์มแบบ'
      && (r === 'admin' || (r === 'seller' && j.seller_uid === uid));
  });

  canRequestRevision = computed(() => this.canConfirmDesign());

  canSendToProduction = computed(() => {
    const j = this.job(); const r = this.role(); const uid = this.uid();
    return !!j && !j.is_deleted && j.status === 'คอนเฟิร์มแล้ว'
      && (r === 'admin' || (r === 'graphic' && j.design_uid === uid));
  });

  canClaimPrint = computed(() => {
    const j = this.job(); const r = this.role();
    return !!j && !j.is_deleted && j.status === 'รอผลิต'
      && (r === 'production' || r === 'admin') && j.print_uid === null;
  });

  canUploadPrint = computed(() => {
    const j = this.job(); const r = this.role(); const uid = this.uid();
    return !!j && !j.is_deleted && j.status === 'กำลังผลิต'
      && (r === 'admin' || j.print_uid === uid);
  });

  canMarkDelivered = computed(() => {
    const j = this.job(); const r = this.role(); const uid = this.uid();
    return !!j && !j.is_deleted && j.status === 'รอส่งมอบ'
      && (r === 'admin' || j.seller_uid === uid || j.print_uid === uid);
  });

  canDelete = computed(() => this.role() === 'admin' && !!this.job() && !this.job()!.is_deleted);
  canRestore = computed(() => this.role() === 'admin' && !!this.job()?.is_deleted);

  /** F2/F6 — finance/admin ปรับยอดเงินหลังสร้าง (มี audit before/after + reason). */
  canAdjustPayment = computed(() => {
    const j = this.job(); const r = this.role();
    return !!j && !j.is_deleted && (r === 'finance' || r === 'admin');
  });

  hasAnyAction = computed(() =>
    this.canClaimDesign() || this.canSubmitDesign() || this.canConfirmDesign() ||
    this.canRequestRevision() || this.canSendToProduction() || this.canClaimPrint() ||
    this.canUploadPrint() || this.canMarkDelivered() || this.canDelete() || this.canRestore()
  );

  // ── Display helpers ────────────────────────────────────────────────────

  get badgeTone():
    | 'status-design' | 'status-designing' | 'status-await' | 'status-confirmed'
    | 'status-printq' | 'status-printing' | 'status-deliverq' | 'status-delivered'
    | 'neutral' {
    switch (this.job()?.status) {
      case 'รอออกแบบ':      return 'status-design';
      case 'กำลังออกแบบ':    return 'status-designing';
      case 'รอคอนเฟิร์มแบบ': return 'status-await';
      case 'คอนเฟิร์มแล้ว':   return 'status-confirmed';
      case 'รอผลิต':         return 'status-printq';
      case 'กำลังผลิต':      return 'status-printing';
      case 'รอส่งมอบ':       return 'status-deliverq';
      case 'ส่งมอบแล้ว':     return 'status-delivered';
      default:               return 'neutral';
    }
  }

  get paymentRemaining(): number {
    const p = this.job()?.payment;
    return (Number(p?.total) || 0) - (Number(p?.deposit) || 0);
  }

  formatTs(ts: Timestamp | null | undefined, withTime = false): string {
    if (!ts) return '—';
    const d = ts.toDate();
    const opts: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: '2-digit', day: '2-digit',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    };
    return d.toLocaleDateString('th-TH', opts);
  }

  formatRelative(ts: Timestamp | null | undefined): string {
    if (!ts) return '';
    const diff = Date.now() - ts.toMillis();
    const s = Math.floor(diff / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d} วันที่แล้ว`;
    if (h > 0) return `${h} ชั่วโมงที่แล้ว`;
    if (m > 0) return `${m} นาทีที่แล้ว`;
    return `${s} วินาทีที่แล้ว`;
  }

  actionLabel(action: JobAction): string {
    return ACTION_LABELS[action] ?? action;
  }

  roleLabel(role: string): string {
    return ROLE_LABELS[role] ?? role;
  }

  /**
   * Resolve a uid to a display name. Returns null when no uid (caller shows its
   * own "unassigned" label). Self resolves from the session; others from the
   * admin-only users listener. Non-admins can't read other users' docs
   * (firestore.rules), so an assigned-but-unresolvable uid falls back to a
   * generic label instead of leaking the raw Firebase uid.
   */
  personName(uid: string | null | undefined): string | null {
    if (!uid) return null;
    if (uid === this.appState.uid()) return this.appState.displayName() || 'คุณ';
    return this.usersSvc.users().find((u) => u.uid === uid)?.display_name ?? 'ผู้ใช้งาน';
  }

  openImage(url: string) {
    window.open(url, '_blank');
  }

  setMobilePanel(k: string) {
    if (k === 'sales' || k === 'graphic' || k === 'production') {
      this.mobilePanel = k;
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  ngOnInit() {
    this.detachJob = this.jobsSvc.watchJob(
      this.jobId,
      (j) => {
        this.job.set(j);
        this.jobLoading.set(false);
      },
      () => this.jobLoading.set(false),
    );
    this.detachEvents = this.jobsSvc.watchJobEvents(
      this.jobId,
      (evts) => this.events.set(evts),
    );
    this.detachComments = this.commentsSvc.watchComments(
      this.jobId,
      (c) => this.comments.set(c),
    );
    // Only admin may read the full users collection (firestore.rules) — attach
    // so design/print/confirm uids resolve to names. Others resolve self only.
    if (this.appState.role() === 'admin') {
      this.detachUsers = this.usersSvc.attachListener();
    }
  }

  ngOnDestroy() {
    this.detachJob?.();
    this.detachEvents?.();
    this.detachComments?.();
    this.detachUsers?.();
  }

  // ── Workflow actions ───────────────────────────────────────────────────

  async onClaimDesign() {
    await this._run(() => this.jobsSvc.claimDesign(this.jobId));
  }

  async onSubmitDesign() {
    if (this.designFiles.length === 0) {
      this.actionError.set('กรุณาเลือกรูปแบบงานอย่างน้อย 1 รูป');
      return;
    }
    await this._run(async () => {
      const urls = await this.jobsSvc.uploadImages(this.jobId, 'design', this.designFiles);
      await this.jobsSvc.submitDesign(this.jobId, urls);
      this.designFiles = [];
    });
  }

  async onConfirmDesign() {
    await this._run(() => this.jobsSvc.confirmDesign(this.jobId));
  }

  async onRequestRevision() {
    await this._run(() => this.jobsSvc.requestRevision(this.jobId, this.revisionNote || undefined));
    this.revisionNote = '';
    this.showRevisionInput = false;
  }

  async onSendToProduction() {
    await this._run(() => this.jobsSvc.sendToProduction(this.jobId));
  }

  async onClaimPrint() {
    await this._run(() => this.jobsSvc.claimPrint(this.jobId));
  }

  async onUploadPrint() {
    if (this.printFiles.length === 0) {
      this.actionError.set('กรุณาเลือกรูปงานพิมพ์อย่างน้อย 1 รูป');
      return;
    }
    await this._run(async () => {
      const urls = await this.jobsSvc.uploadImages(this.jobId, 'print', this.printFiles);
      await this.jobsSvc.uploadPrint(this.jobId, urls);
      this.printFiles = [];
    });
  }

  async onMarkDelivered() {
    await this._run(async () => {
      // Slips are optional — upload only if the user attached any.
      const urls = this.slipFiles.length
        ? await this.jobsSvc.uploadImages(this.jobId, 'slip', this.slipFiles)
        : [];
      await this.jobsSvc.markDelivered(this.jobId, urls);
      this.slipFiles = [];
    });
  }

  // ── Finance: adjust payment (F2/F6) ────────────────────────────────────

  openAdjust() {
    const p = this.job()?.payment;
    this.adjDeposit = p?.deposit ?? 0;
    this.adjDiscount = p?.discount ?? 0;
    this.adjMethod = p?.payment_method ?? '';
    this.adjReason = '';
    this.actionError.set('');
    this.showAdjust = true;
  }

  cancelAdjust() {
    this.showAdjust = false;
  }

  async onAdjustPayment() {
    if (!this.adjReason.trim()) {
      this.actionError.set('กรุณาระบุเหตุผลการปรับยอด');
      return;
    }
    await this._run(async () => {
      await this.jobsSvc.adjustPayment(this.jobId, {
        reason: this.adjReason.trim(),
        deposit: this.adjDeposit ?? undefined,
        discount: this.adjDiscount ?? undefined,
        payment_method: this.adjMethod || undefined,
      });
      this.showAdjust = false;
    });
  }

  async onDeleteJob() {
    if (!confirm('ลบใบงานนี้? (ยังกู้คืนได้ภายหลัง)')) return;
    await this._run(() => this.jobsSvc.deleteJob(this.jobId));
  }

  async onRestoreJob() {
    await this._run(() => this.jobsSvc.restoreJob(this.jobId));
  }

  // ── File input handlers ────────────────────────────────────────────────

  onDesignFilesChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.designFiles = Array.from(input.files ?? []);
  }

  onPrintFilesChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.printFiles = Array.from(input.files ?? []);
  }

  onSlipFilesChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.slipFiles = Array.from(input.files ?? []);
  }

  // ── Comments ───────────────────────────────────────────────────────────

  async onAddComment() {
    const text = this.commentText.trim();
    if (!text) return;
    this.commentLoading = true;
    try {
      await this.commentsSvc.addComment(this.jobId, text);
      this.commentText = '';
    } catch (e) {
      this.actionError.set((e as Error).message);
    } finally {
      this.commentLoading = false;
    }
  }

  async onDeleteComment(commentId: string) {
    try {
      await this.commentsSvc.deleteComment(commentId);
    } catch (e) {
      this.actionError.set((e as Error).message);
    }
  }

  canDeleteComment(comment: JobComment): boolean {
    return this.role() === 'admin' || comment.user_uid === this.uid();
  }

  // ── Private ────────────────────────────────────────────────────────────

  private async _run(fn: () => Promise<unknown>) {
    this.actionLoading.set(true);
    this.actionError.set('');
    try {
      await fn();
    } catch (e: unknown) {
      this.actionError.set((e as Error).message || 'เกิดข้อผิดพลาด');
    } finally {
      this.actionLoading.set(false);
    }
  }
}
