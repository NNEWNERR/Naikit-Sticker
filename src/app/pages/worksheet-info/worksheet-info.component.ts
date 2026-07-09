import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
import { ALL_JOB_STATUSES, Job, JobAction, JobComment, JobEvent, JobStatus, Material, ProductionInput, ProductionTask, WorkItem } from 'src/app/core/models/job';
import { PaymentRecord, RefundRecord } from 'src/app/core/models/payment';
import { PaymentService } from 'src/app/services/payment.service';
import { MaterialCatalogService } from 'src/app/services/material-catalog.service';
import { canProduceMachines, choosableMachines, eligibleMachinesOf } from 'src/app/core/data/work-item-catalog';
import { ReceiptQrModalComponent } from 'src/app/components/modals/receipt-qr/receipt-qr.modal';
import { PrintLogFormComponent } from './print-log-form/print-log-form.component';
import { DefectFormComponent } from './defect-form/defect-form.component';
import { DefectService } from 'src/app/services/defect.service';
import { Defect } from 'src/app/core/models/job';

const ACTION_LABELS: Record<JobAction, string> = {
  create:           'สร้างใบงาน',
  edit:             'แก้ไขข้อมูล',
  claim_design:     'รับงานออกแบบ',
  assign_design:    'มอบหมายงานออกแบบ',
  transfer_design:  'ส่งต่องานออกแบบ',
  claim_print:      'รับงานผลิต',
  submit_design:    'ส่งแบบ',
  confirm_design:   'คอนเฟิร์มแบบ',
  request_revision: 'ขอแก้ไขแบบ',
  start_print:      'ส่งเข้าผลิต',
  upload_print:     'อัพโหลดงานพิมพ์',
  edit_production:  'แก้บันทึกการพิมพ์',
  mark_delivered:   'ส่งมอบแล้ว',
  payment_adjust:   'ปรับยอดเงิน (การเงิน)',
  rate_card_upsert: 'แก้ราคากลาง',
  material_upsert:  'แก้วัสดุ',
  defect_record:    'บันทึกงานเสีย',
  defect_void:      'ยกเลิกงานเสีย',
  receipt_regenerate: 'ออกลิงก์ใบเสร็จใหม่',
  admin_set_status: 'ปรับสถานะ (admin)',
  payment_record:   'บันทึกการจ่าย',
  payment_void:     'ยกเลิกการจ่าย (เช็คเด้ง/ปลอม)',
  refund_request:   'ขอคืนเงิน',
  refund_approve:   'อนุมัติคืนเงิน',
  refund_reject:    'ปฏิเสธคำขอคืนเงิน',
  comment_add:      'เพิ่มหมายเหตุ',
  comment_delete:   'ลบหมายเหตุ',
  admin_reassign:   'มอบหมายงาน (admin)',
  delete:           'ลบใบงาน',
  restore:          'กู้คืนใบงาน',
};

const MACHINE_LABELS: Record<string, string> = {
  fuji:          'FUJI',
  vinyl:         'ไวนิล',
  large_sticker: 'สติ๊กเกอร์ใหญ่',
  uv:            'สติกเกอร์ UV',
  cut_sticker:   'สติกเกอร์ตัด',
  other:         'อื่นๆ',
};

const ROLE_LABELS: Record<string, string> = {
  seller:     'ฝ่ายขาย',
  graphic:    'กราฟิก',
  production: 'ผลิต',
  admin:      'แอดมิน',
  finance:    'การเงิน',
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
    PrintLogFormComponent,
    DefectFormComponent,
  ],
})
export class WorksheetInfoComponent implements OnInit, OnDestroy {
  @Input() jobId!: string;

  private jobsSvc = inject(JobsService);
  private commentsSvc = inject(CommentsService);
  private modalCtrl = inject(ModalController);
  private appState = inject(AppStateService);
  private usersSvc = inject(UsersService);
  private paymentSvc = inject(PaymentService);
  private materialSvc = inject(MaterialCatalogService);
  private defectSvc = inject(DefectService);
  private router = inject(Router);

  job = signal<Job | null>(null);
  jobLoading = signal(true);
  events = signal<JobEvent[]>([]);
  comments = signal<JobComment[]>([]);
  payments = signal<PaymentRecord[]>([]);
  refunds = signal<RefundRecord[]>([]);

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
  /** Files staged for print upload, keyed by machine (F13 — per-task). */
  printFilesByMachine: Record<string, File[]> = {};
  /** F15 — production inputs (วัสดุ/เศษ) ที่คนพิมพ์กรอก keyed by task key. */
  productionByTask: Record<string, ProductionInput[]> = {};
  /** F15 — materials master (dropdown ฟอร์มบันทึกการพิมพ์). */
  materials = signal<Material[]>([]);
  /** F15 — งานเสียของใบงานนี้ (finance/admin เห็นทั้งหมด; ผู้บันทึกเห็นของตัวเอง). */
  defects = signal<Defect[]>([]);
  workItems(): WorkItem[] { return this.job()?.work_items ?? []; }
  /** F15 — ใครเห็นปุ่มบันทึกงานเสีย: ทีมผลิต/กราฟิก/admin + seller เจ้าของงาน */
  canRecordDefect(): boolean {
    const role = this.appState.role();
    const j = this.job();
    if (!j) return false;
    if (role === 'admin' || role === 'production' || role === 'graphic') return true;
    return role === 'seller' && j.seller_uid === this.appState.uid();
  }
  onDefectSaved(): void { this.actionError.set(''); }
  /** Optional payment slips staged for markDelivered. */
  slipFiles: File[] = [];

  /** F2/F6 — finance adjustPayment form state. (F12 D5: ไม่แก้มัดจำที่นี่แล้ว) */
  showAdjust = false;
  adjDiscount: number | null = null;
  adjShipping: number | null = null;
  adjTransfer: number | null = null;
  adjOther: number | null = null;
  adjOtherNote = '';
  adjMethod = '';
  adjReason = '';
  readonly paymentMethods = ['เงินสด', 'โอน', 'เช็ค', 'เครดิต', 'อื่นๆ'];

  private detachJob?: () => void;
  private detachEvents?: () => void;
  private detachComments?: () => void;
  private detachUsers?: () => void;
  private detachPayments?: () => void;
  private detachRefunds?: () => void;
  private detachDefects?: () => void;

  // F8/F12 — record payment form (รองรับเงินสดด้วย — F12 D3)
  showPayForm = false;
  payMethod: 'เงินสด' | 'โอน' | 'เช็ค' = 'โอน';
  payAmount: number | null = null;
  payBankRef = '';
  payDate = new Date().toISOString().slice(0, 10);
  paySlipFile: File | null = null;

  // F8 — request refund form
  showRefundForm = false;
  refundAmount: number | null = null;
  refundMethod: 'เงินสด' | 'โอน' = 'โอน';
  refundReason = '';

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

  /** seller เจ้าของ/admin มอบหมายงานให้กราฟิก — เฉพาะงานยังไม่มีคนรับ */
  canAssignDesign = computed(() => {
    const j = this.job(); const r = this.role(); const uid = this.uid();
    return !!j && !j.is_deleted && j.status === 'รอออกแบบ' && j.design_uid === null
      && (r === 'admin' || (r === 'seller' && j.seller_uid === uid));
  });

  /** กราฟิกที่ถืองาน/admin ส่งต่อให้กราฟิกคนอื่น — ระหว่างกำลังออกแบบ */
  canTransferDesign = computed(() => {
    const j = this.job(); const r = this.role(); const uid = this.uid();
    return !!j && !j.is_deleted && j.status === 'กำลังออกแบบ'
      && (r === 'admin' || (r === 'graphic' && j.design_uid === uid));
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

  // ── F13 — งานผลิตต่อเครื่อง (per-machine task) ────────────────────────────
  productionTasks = computed<ProductionTask[]>(() => this.job()?.print_tasks ?? []);
  hasProductionTasks = computed(() => this.productionTasks().length > 0);

  /** claim งานนี้ได้ไหม (FUJI=graphic / non-FUJI=production) — task ยัง 'รอผลิต'. ทีมใดทีมหนึ่งที่ทำเครื่องใน eligible ได้. */
  canClaimTask(t: ProductionTask): boolean {
    const j = this.job();
    return !!j && !j.is_deleted && (j.status === 'รอผลิต' || j.status === 'กำลังผลิต')
      && t.status === 'รอผลิต' && canProduceMachines(this.role(), t.eligible_machines);
  }
  /** แนบงานพิมพ์ได้ไหม — task 'กำลังผลิต' + ทีมที่ทำเครื่องนี้ได้ (ไม่ต้องเป็น print_uid เดิม). */
  canUploadTask(t: ProductionTask): boolean {
    const j = this.job();
    return !!j && !j.is_deleted && j.status === 'กำลังผลิต'
      && t.status === 'กำลังผลิต' && canProduceMachines(this.role(), t.eligible_machines);
  }
  /** มี action ผลิตที่ทำได้อย่างน้อย 1 task. */
  private hasProductionAction(): boolean {
    return this.productionTasks().some((t) => this.canClaimTask(t) || this.canUploadTask(t));
  }
  machineLabel(machine: string): string { return MACHINE_LABELS[machine] ?? machine; }
  /** ป้ายชื่อ task: ถ้า claim แล้วโชว์เครื่องที่เลือก, ยังไม่ claim โชว์ตัวเลือก (เช่น "FUJI / สติ๊กเกอร์ใหญ่"). */
  taskLabel(t: ProductionTask): string {
    if (t.machine) return MACHINE_LABELS[t.machine] ?? t.machine;
    return (t.eligible_machines ?? []).map((m) => MACHINE_LABELS[m] ?? m).join(' / ');
  }
  /** เครื่องที่ role นี้เลือกได้ตอน claim — >1 ตัวต้องเลือกก่อนกดรับงาน (เช่น สติ๊กเกอร์ใหญ่ vs UV). */
  claimOptions(t: ProductionTask): string[] { return choosableMachines(this.role(), t.eligible_machines); }
  /** เครื่องที่เลือกไว้ต่อ task (key = task.key) ก่อนกดรับงาน */
  claimMachineByTask: Record<string, string> = {};
  /** ชื่อผู้รับผลิต task นี้ — ใช้ denormalized print_uid_name ก่อน (non-admin เห็นชื่อจริง),
   *  fallback personName (self/admin resolve ได้), ถ้ายังไม่ claim → null. */
  taskPrinter(t: ProductionTask): string | null {
    if (!t.print_uid) return null;
    return t.print_uid_name || this.personName(t.print_uid);
  }

  // ยึดว่าผู้ขายเป็นคนส่งมอบ/รับเงิน — graphic/production ส่งมอบไม่ได้ (ตรงกับ BE markDelivered)
  canMarkDelivered = computed(() => {
    const j = this.job(); const r = this.role(); const uid = this.uid();
    return !!j && !j.is_deleted && j.status === 'รอส่งมอบ'
      && (r === 'admin' || (r === 'seller' && j.seller_uid === uid));
  });

  canDelete = computed(() => this.role() === 'admin' && !!this.job() && !this.job()!.is_deleted);
  canRestore = computed(() => this.role() === 'admin' && !!this.job()?.is_deleted);

  /** แก้ไขใบงาน: admin ทุก status; seller(เจ้าของ) เฉพาะก่อนคอนเฟิร์ม (ตรงกับ BE editJob guard). */
  canEditJob = computed(() => {
    const j = this.job(); const r = this.role(); const uid = this.uid();
    if (!j || j.is_deleted) return false;
    if (r === 'admin') return true;
    const beforeConfirm = ['รอออกแบบ', 'กำลังออกแบบ', 'รอคอนเฟิร์มแบบ'];
    return r === 'seller' && j.seller_uid === uid && beforeConfirm.includes(j.status);
  });

  onEditJob() {
    this.modalCtrl.dismiss();
    this.router.navigate(['/naikit-sticker/create-work-sheet', this.jobId]);
  }

  /** F2/F6 — finance/admin ปรับยอดเงินหลังสร้าง (มี audit before/after + reason). */
  canAdjustPayment = computed(() => {
    const j = this.job(); const r = this.role();
    return !!j && !j.is_deleted && (r === 'finance' || r === 'admin');
  });

  /** F14 — เปิด QR ใบเสร็จให้ลูกค้า: ฝ่ายขาย(เจ้าของ)/แอดมิน/การเงิน */
  canShowReceipt = computed(() => {
    const j = this.job(); const r = this.role(); const uid = this.uid();
    return !!j && !j.is_deleted &&
      (r === 'admin' || r === 'finance' || (r === 'seller' && j.seller_uid === uid));
  });

  /** F14 — สร้าง code ใหม่ (ตรงกับ BE regenerateReceiptCode): admin หรือ seller เจ้าของ */
  canRegenerateReceipt = computed(() => {
    const j = this.job(); const r = this.role(); const uid = this.uid();
    return !!j && !j.is_deleted && (r === 'admin' || (r === 'seller' && j.seller_uid === uid));
  });

  async openReceiptQr() {
    const j = this.job();
    if (!j) return;
    const modal = await this.modalCtrl.create({
      component: ReceiptQrModalComponent,
      componentProps: {
        jobId: this.jobId,
        receiptCode: j.receipt_code ?? '',
        serialNumber: j.serial_number,
        canRegenerate: this.canRegenerateReceipt(),
      },
    });
    await modal.present();
  }

  hasAnyAction = computed(() =>
    this.canClaimDesign() || this.canAssignDesign() || this.canTransferDesign() ||
    this.canSubmitDesign() || this.canConfirmDesign() ||
    this.canRequestRevision() || this.canSendToProduction() || this.hasProductionAction() ||
    this.canMarkDelivered() || this.canDelete() || this.canRestore()
  );

  // ── มอบหมาย/ส่งต่องานออกแบบ (graphic picker) ─────────────────────────────
  showGraphicPicker = false;
  pickerMode: 'assign' | 'transfer' = 'assign';
  graphics = signal<{ uid: string; display_name: string; avatar_url: string | null }[]>([]);
  graphicsLoading = signal(false);

  async openGraphicPicker(mode: 'assign' | 'transfer') {
    this.pickerMode = mode;
    this.showGraphicPicker = true;
    this.actionError.set('');
    this.graphicsLoading.set(true);
    try {
      const list = await this.jobsSvc.listGraphics();
      // ส่งต่อ: ไม่โชว์ตัวเอง (กราฟิกที่ถืองานอยู่)
      this.graphics.set(mode === 'transfer' ? list.filter((g) => g.uid !== this.uid()) : list);
    } catch (e) {
      this.actionError.set((e as Error).message || 'โหลดรายชื่อกราฟิกไม่สำเร็จ');
    } finally {
      this.graphicsLoading.set(false);
    }
  }
  closeGraphicPicker() { this.showGraphicPicker = false; }

  async onPickGraphic(uid: string) {
    await this._run(async () => {
      if (this.pickerMode === 'assign') await this.jobsSvc.assignDesign(this.jobId, uid);
      else await this.jobsSvc.transferDesign(this.jobId, uid);
      this.showGraphicPicker = false;
    });
  }

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

  /** คงเหลือ (ตามบิล) = (total + other_fee) − deposit — สูตรเดียวกับ BE (SCHEMA.md);
   *  คำนวณเองแทนการอ่าน p.remaining เพราะ doc เก่าที่ผ่าน editJob ช่วงที่ BE ลืมบวก
   *  other_fee อาจเก็บค่าผิดค้างไว้ */
  get paymentRemaining(): number {
    const p = this.job()?.payment;
    return (Number(p?.total) || 0) + (Number(p?.other_fee) || 0) - (Number(p?.deposit) || 0);
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

  /** เป้าหมายของ event มอบหมาย/ส่งต่อ (อ่านจาก payload — denormalized ไม่ติด rules) */
  eventTarget(e: JobEvent): string {
    if (e.action !== 'assign_design' && e.action !== 'transfer_design') return '';
    const to = (e.payload?.['to_design_name'] as string) || '';
    return to ? `→ ${to}` : '';
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
    // admin + finance may read the full users collection (firestore.rules).
    if (this.appState.role() === 'admin' || this.appState.role() === 'finance') {
      this.detachUsers = this.usersSvc.attachListener();
    }
    this.detachPayments = this.paymentSvc.watchPaymentsForJob(this.jobId, (p) => this.payments.set(p));
    // F15 — โหลด materials สำหรับ dropdown ฟอร์มบันทึกการพิมพ์ (best-effort; ไม่ block หน้า)
    this.materialSvc.list().then((m) => this.materials.set(m)).catch(() => undefined);
    // F15 — งานเสียของใบงานนี้ (live)
    this.detachDefects = this.defectSvc.watchForJob(this.jobId, (d) => this.defects.set(d));
    this.detachRefunds = this.paymentSvc.watchRefundsForJob(this.jobId, (r) => this.refunds.set(r));
  }

  ngOnDestroy() {
    this.detachJob?.();
    this.detachEvents?.();
    this.detachComments?.();
    this.detachUsers?.();
    this.detachPayments?.();
    this.detachRefunds?.();
    this.detachDefects?.();
  }

  // ── F15 — งานเสีย ──────────────────────────────────────────────────────
  get isAdmin(): boolean { return this.appState.role() === 'admin'; }

  async onVoidDefect(d: Defect): Promise<void> {
    const reason = prompt('เหตุผลที่ยกเลิกงานเสียนี้ (เช่น บันทึกผิด/ซ้ำ):')?.trim();
    if (!reason) return;
    await this._run(() => this.defectSvc.void(d.id, reason));
  }

  // ── F8 — Payment / Refund ──────────────────────────────────────────────

  isFinanceOrAdmin = computed(() => this.role() === 'finance' || this.role() === 'admin');

  /** ผู้บันทึก/ขอ payment ได้: seller(เจ้าของ) / finance / admin */
  private canHandleMoney = computed(() => {
    const j = this.job(); const r = this.role(); const uid = this.uid();
    return !!j && !j.is_deleted && (r === 'finance' || r === 'admin' || (r === 'seller' && j.seller_uid === uid));
  });
  canRecordPayment = computed(() => this.canHandleMoney());
  canRequestRefund = computed(() => this.canHandleMoney() && (this.job()?.paid_amount ?? 0) > 0);

  get paidAmount(): number { return this.job()?.paid_amount ?? 0; }
  /** F9/F10 — ยอดที่ลูกค้าต้องจ่ายร้าน = รับสุทธิ + ค่าส่ง + ค่าธรรมเนียม */
  get receivable(): number {
    const p = this.job()?.payment;
    return (this.job()?.tax?.net_receivable ?? p?.total ?? 0)
      + (p?.shipping_fee ?? 0) + (p?.transfer_fee ?? 0);
  }
  get outstanding(): number { return Math.max(0, this.receivable - this.paidAmount); }
  get tax() { return this.job()?.tax; }

  pendingRefunds = computed(() => this.refunds().filter((r) => r.status === 'pending'));
  activePayments = computed(() => this.payments().filter((p) => !p.is_deleted && p.status === 'active'));

  openPayForm() {
    this.payAmount = this.outstanding || null;
    this.payMethod = 'โอน';
    this.payBankRef = '';
    this.payDate = new Date().toISOString().slice(0, 10);
    this.paySlipFile = null;
    this.actionError.set('');
    this.showPayForm = true;
  }
  onSlipFileChange(e: Event) {
    this.paySlipFile = (e.target as HTMLInputElement).files?.[0] ?? null;
  }

  async onRecordPayment() {
    const amt = Number(this.payAmount);
    if (!amt || amt <= 0) { this.actionError.set('ระบุจำนวนเงิน'); return; }
    // F12 D3 — เงินสดไม่ต้องมีเลขอ้างอิง/สลิป; โอน/เช็คบังคับ
    const isSlipMethod = this.payMethod === 'โอน' || this.payMethod === 'เช็ค';
    if (isSlipMethod && !this.payBankRef.trim()) { this.actionError.set('ระบุเลขอ้างอิงโอน/เช็ค'); return; }
    if (isSlipMethod && !this.paySlipFile) { this.actionError.set('แนบสลิป'); return; }
    await this._run(async () => {
      let slip_url: string | null = null;
      let slip_hash: string | null = null;
      if (this.paySlipFile) {
        const file = this.paySlipFile;
        [slip_url, slip_hash] = await Promise.all([
          this.paymentSvc.uploadSlip(this.jobId, file),
          this.paymentSvc.hashFile(file),
        ]);
      }
      await this.paymentSvc.createPayment({
        method: this.payMethod,
        amount: amt,
        bank_ref: this.payBankRef.trim(),
        slip_url,
        slip_hash,
        paid_at: new Date(this.payDate).toISOString(),
        allocations: [{ job_id: this.jobId, amount: amt }],
        customer_name: this.job()?.customer_name ?? '',
      });
      this.showPayForm = false;
    });
  }

  openRefundForm() {
    this.refundAmount = this.paidAmount || null;
    this.refundMethod = 'โอน';
    this.refundReason = '';
    this.actionError.set('');
    this.showRefundForm = true;
  }
  async onRequestRefund() {
    const amt = Number(this.refundAmount);
    if (!amt || amt <= 0) { this.actionError.set('ระบุจำนวนเงินคืน'); return; }
    if (!this.refundReason.trim()) { this.actionError.set('ระบุเหตุผล'); return; }
    await this._run(async () => {
      await this.paymentSvc.requestRefund({
        job_id: this.jobId, amount: amt, method: this.refundMethod, reason: this.refundReason.trim(),
      });
      this.showRefundForm = false;
    });
  }

  async onVoidPayment(p: PaymentRecord) {
    const reason = prompt('เหตุผลที่ void (เช็คเด้ง/ปลอม/ยกเลิก):');
    if (!reason?.trim()) return;
    await this._run(() => this.paymentSvc.voidPayment(p.id!, reason.trim()));
  }
  async onApproveRefund(r: RefundRecord) {
    if (!confirm(`อนุมัติคืนเงิน ฿${r.amount}?`)) return;
    await this._run(() => this.paymentSvc.approveRefund(r.id!));
  }
  async onRejectRefund(r: RefundRecord) {
    const reason = prompt('เหตุผลที่ปฏิเสธ (ไม่บังคับ):') ?? '';
    await this._run(() => this.paymentSvc.rejectRefund(r.id!, reason));
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

  // F13 — claim/upload "ต่อ task" (ตัวเลือกเดียว BE เลือกให้; >1 ตัว เช่น สติ๊กเกอร์ใหญ่/UV ต้องส่ง machine ที่เลือก)
  async onClaimTask(taskKey: string) {
    const machine = this.claimMachineByTask[taskKey] || undefined;
    await this._run(() => this.jobsSvc.claimPrint(this.jobId, taskKey, machine));
  }

  // ── F15 — แก้บันทึกการพิมพ์ (editProduction) ────────────────────────────
  /** work_item ที่มีบันทึกการพิมพ์แล้ว (โชว์สรุป + ปุ่มแก้) */
  printLogs = computed(() =>
    (this.job()?.work_items ?? [])
      .map((wi, index) => ({ wi, index }))
      .filter((e) => !!e.wi.production),
  );
  /** index ของ item ที่กำลังแก้ (null = ปิดฟอร์ม) */
  editProdIndex: number | null = null;
  editProdInputs: ProductionInput[] = [];
  editProdReason = '';
  /** prefill ให้ print-log-form (keyed by index) — สร้างตอนเปิดฟอร์ม */
  editProdInitial: Record<number, ProductionInput> = {};

  /** สิทธิ์แก้: ทีมที่ดูแลเครื่องของ item นั้น (mirror BE) + admin — ต้องมี production เดิม */
  canEditProduction(wi: WorkItem): boolean {
    if (!wi.production) return false;
    return canProduceMachines(this.role(), eligibleMachinesOf(wi.type));
  }

  openEditProduction(index: number) {
    const wi = this.job()?.work_items?.[index];
    const p = wi?.production;
    if (!p) return;
    this.editProdInitial = {
      [index]: {
        work_item_index: index,
        material_id: p.material_id,
        backing: p.backing,
        roll_width_m: p.roll_width_m,
        length_used_m: p.length_used_m,
        qty_printed: p.qty_printed,
        roll_run_id: p.roll_run_id,
      },
    };
    this.editProdInputs = [];
    this.editProdReason = '';
    this.actionError.set('');
    this.editProdIndex = index;
  }

  cancelEditProduction() {
    this.editProdIndex = null;
    this.editProdInputs = [];
    this.editProdReason = '';
  }

  // ── Admin: override สถานะ (admin_set_status escape hatch) ────────────────
  readonly allStatuses = ALL_JOB_STATUSES;
  showSetStatus = false;
  setStatusValue: JobStatus | '' = '';
  setStatusReason = '';

  openSetStatus() {
    this.setStatusValue = '';
    this.setStatusReason = '';
    this.actionError.set('');
    this.showSetStatus = true;
  }

  cancelSetStatus() {
    this.showSetStatus = false;
  }

  async onAdminSetStatus() {
    if (!this.setStatusValue || !this.setStatusReason.trim()) {
      this.actionError.set('เลือกสถานะใหม่และระบุเหตุผลก่อนบันทึก');
      return;
    }
    if (!confirm(`ปรับสถานะ "${this.job()?.status}" → "${this.setStatusValue}" ข้ามขั้นตอนปกติ?`)) return;
    await this._run(async () => {
      await this.jobsSvc.adminSetStatus(this.jobId, this.setStatusValue as JobStatus, this.setStatusReason.trim());
      this.cancelSetStatus();
    });
  }

  async onSaveEditProduction() {
    if (!this.editProdReason.trim()) {
      this.actionError.set('กรุณาระบุเหตุผลการแก้บันทึกการพิมพ์');
      return;
    }
    if (this.editProdInputs.length === 0) {
      this.actionError.set('กรอกข้อมูลบันทึกการพิมพ์ให้ครบก่อนบันทึก');
      return;
    }
    await this._run(async () => {
      await this.jobsSvc.editProduction(this.jobId, this.editProdInputs, this.editProdReason.trim());
      this.cancelEditProduction();
    });
  }

  async onUploadTask(taskKey: string) {
    const files = this.printFilesByMachine[taskKey] ?? [];
    if (files.length === 0) {
      this.actionError.set('กรุณาเลือกรูปงานพิมพ์อย่างน้อย 1 รูป');
      return;
    }
    await this._run(async () => {
      const urls = await this.jobsSvc.uploadImages(this.jobId, 'print', files);
      await this.jobsSvc.uploadPrint(this.jobId, taskKey, urls, this.productionByTask[taskKey]);
      this.printFilesByMachine[taskKey] = [];
      delete this.productionByTask[taskKey];
    });
  }

  async onMarkDelivered() {
    if (this.outstanding > 0 && !confirm(`ยังค้างชำระ ฿${this.outstanding.toLocaleString()} — ส่งมอบแบบค้างชำระ (เครดิต/ลูกหนี้)?`)) return;
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
    this.adjDiscount = p?.discount ?? 0;
    this.adjShipping = p?.shipping_fee ?? 0;
    this.adjTransfer = p?.transfer_fee ?? 0;
    this.adjOther = p?.other_fee ?? 0;
    this.adjOtherNote = p?.other_fee_note ?? '';
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
    if ((this.adjOther ?? 0) > 0 && !this.adjOtherNote.trim()) {
      this.actionError.set('กรุณาระบุหมายเหตุค่าใช้จ่ายอื่นๆ');
      return;
    }
    await this._run(async () => {
      await this.jobsSvc.adjustPayment(this.jobId, {
        reason: this.adjReason.trim(),
        discount: this.adjDiscount ?? undefined,
        shipping_fee: this.adjShipping ?? undefined,
        transfer_fee: this.adjTransfer ?? undefined,
        other_fee: this.adjOther ?? undefined,
        other_fee_note: this.adjOtherNote.trim() || undefined,
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

  onPrintFilesChange(taskKey: string, event: Event) {
    const input = event.target as HTMLInputElement;
    this.printFilesByMachine[taskKey] = Array.from(input.files ?? []);
  }
  printFilesCount(taskKey: string): number {
    return this.printFilesByMachine[taskKey]?.length ?? 0;
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
