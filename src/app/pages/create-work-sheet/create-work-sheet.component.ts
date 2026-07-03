import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from 'src/app/services/modal.service';
import { ToastController } from 'src/app/services/service.service';
import { v4 as uuidv4 } from 'uuid';
import { WorkItemModalComponent } from './work-item-modal/work-item-modal.component';
import { Router, ActivatedRoute } from '@angular/router';
import { StorageService } from 'src/app/services/storage.service';
import { PaymentService } from 'src/app/services/payment.service';
import { JobAdminError, JobsService } from '../../services/jobs.service';
import {
  CreateJobPayload,
  Job,
  Payment,
  UnitOfLength,
  WorkItem,
} from '../../core/models/job';

interface WorkItemFormValue {
  id?: string;
  type?: string;
  width?: number | string;
  height?: number | string;
  unit_of_length?: string;
  option?: string;
  quantity?: number | string;
  total?: number | string;
  remark?: string;
}

/**
 * Map the Thai unit labels the modal stores ('มม.' / 'ซม.' / 'นิ้ว' / 'เมตร')
 * onto the SCHEMA enum the BE expects. Unknown values fall back to 'cm.'
 * because that's the default in the modal — keeps the form forgiving.
 */
function mapUnitOfLength(thai: string | undefined): UnitOfLength {
  switch (thai) {
    case 'มม.': return 'mm.';
    case 'ซม.': return 'cm.';
    case 'นิ้ว': return 'inch';
    case 'เมตร': return 'm.';
    default: return 'cm.';
  }
}

// File-upload safety limits. Kept here (vs constants file) so a reviewer can
// see them next to the upload code.
const MAX_REFERENCE_FILES = 10;
const MAX_TOTAL_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB combined
const MAX_SINGLE_FILE_BYTES = 10 * 1024 * 1024;  // 10MB per file
// MIME -> allowed extensions. Used for a consistency check; this is NOT
// magic-byte sniffing — see TODO below. A malicious client can still spoof
// both MIME and extension, so the storage rules also enforce content-type.
const ALLOWED_TYPES: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'application/pdf': ['pdf'],
};

@Component({
  selector: 'app-create-work-sheet',
  templateUrl: './create-work-sheet.component.html',
  styleUrls: ['./create-work-sheet.component.scss'],
})
export class CreateWorkSheetComponent implements OnInit {
  @ViewChild('worksheetInput') worksheetInput: ElementRef;
  @ViewChild('referenceInput') referenceInput: ElementRef;

  form: FormGroup;

  worksheetForm: FormGroup;
  isDragging = false;
  isSubmitting = false;
  totalAmount = 0;
  isWorkSheetDragging = false;
  isReferenceDragging = false;
  workSheetPreviews: string[] = [];
  workSheetFiles: File[] = [];
  referencePreviews: string[] = [];  // เพิ่มบรรทัดนี้
  referenceFiles: File[] = [];

  /** Per-submission UUID used as a storage-path bucket — generated lazily on
   *  first upload, regenerated after a successful submit so the next job
   *  doesn't write into the previous job's bucket. */
  private uploadBucketId: string | null = null;

  /**
   * Wizard step state — drives the prototype's 4-step layout. The underlying
   * `worksheetForm` is one FormGroup; only the visible step changes. Submit
   * still validates the whole form (any step can be invalid).
   *
   * 1 = ลูกค้า, 2 = รายการงาน, 3 = ชำระเงิน, 4 = ไฟล์แนบ
   */
  step: 1 | 2 | 3 | 4 = 1;
  readonly stepLabels = ['ลูกค้า', 'รายการงาน', 'ชำระเงิน', 'ไฟล์แนบ'];
  /** Arrow-fn ref passed to <app-page-header [onBack]> — preserves `this`. */
  goBack = () => this.cancel();
  readonly contactOptions = [
    { value: 'หน้าร้าน', label: '🏪 หน้าร้าน' },
    { value: 'เฟสบุ๊ค',  label: '📘 เฟสบุ๊ค' },
    { value: 'ไลน์',     label: '💬 ไลน์' },
    { value: 'อีเมล',    label: '📧 อีเมล' },
  ];

  /** Edit mode — เปิดผ่าน route create-work-sheet/:jobId */
  editMode = false;
  editJobId: string | null = null;

  /** F16 — สลิปมัดจำ (บังคับเมื่อมัดจำ > 0 และวิธีจ่ายเป็น โอน/เช็ค) */
  depositSlipFile: File | null = null;

  constructor(
    private jobsService: JobsService,
    private storageService: StorageService,
    private paymentService: PaymentService,
    private modalController: ModalController,
    private toastController: ToastController,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.initNewForm();
  }

  ngOnInit() {
    const jobId = this.route.snapshot.paramMap.get('jobId');
    if (jobId) {
      this.editMode = true;
      this.editJobId = jobId;
      void this.loadJobForEdit(jobId);
    }
  }

  /** โหลด job มา prefill (edit mode). */
  private async loadJobForEdit(jobId: string): Promise<void> {
    const job = await this.jobsService.getJob(jobId);
    if (!job) {
      const t = await this.toastController.create({ message: 'ไม่พบใบงาน', duration: 2500, position: 'top', color: 'danger' });
      await t.present();
      this.router.navigate(['/naikit-sticker/home']);
      return;
    }
    this.worksheetForm.patchValue({
      contact: job.contact ?? '',
      customer_name: job.customer_name ?? '',
      line_name: job.line_name ?? '',
      phone: job.phone ?? '',
      is_urgent: !!job.is_urgent,
      remark: job.remark ?? '',
      date_of_acceptance: job.date_of_acceptance ? new Date(job.date_of_acceptance.seconds * 1000) : '',
      payment: {
        discount: job.payment?.discount ?? 0,
        shipping_fee: job.payment?.shipping_fee ?? 0,
        transfer_fee: job.payment?.transfer_fee ?? 0,
        other_fee: job.payment?.other_fee ?? 0,
        other_fee_note: job.payment?.other_fee_note ?? '',
        deposit: job.payment?.deposit ?? 0,
        payment_method: job.payment?.payment_method ?? '',
      },
      tax: {
        vat_mode: job.tax?.vat_mode ?? 'none',
        wht_rate: job.tax?.wht_rate ?? 0,
      },
    });
    // rebuild work_items FormArray
    const arr = this.workItems;
    arr.clear();
    for (const wi of job.work_items ?? []) {
      arr.push(this.fb.group({
        type: [wi.type], width: [wi.width], height: [wi.height],
        unit_of_length: [wi.unit_of_length], option: [wi.option],
        quantity: [wi.quantity], total: [wi.total],
      }));
    }
    this.calculateTotal();
  }

  // ── Wizard navigation ─────────────────────────────────────────────────────

  /** Go to the next step (clamped to 4). */
  nextStep() {
    if (this.step < 4) this.step = (this.step + 1) as 1 | 2 | 3 | 4;
  }

  /** Go to the previous step (clamped to 1). */
  prevStep() {
    if (this.step > 1) this.step = (this.step - 1) as 1 | 2 | 3 | 4;
  }

  /** Allow clicking on a done/current step in the stepper to jump back. */
  goToStep(num: number) {
    if (num >= 1 && num <= 4 && num <= this.step) {
      this.step = num as 1 | 2 | 3 | 4;
    }
  }

  /** Chip handler for the ช่องทางติดต่อ row in Step 1. */
  setContact(value: string) {
    this.worksheetForm.get('contact')?.setValue(value);
  }

  /** Urgency strip handler — sets the `is_urgent` boolean. */
  setUrgent(value: boolean) {
    this.worksheetForm.get('is_urgent')?.setValue(value);
  }

  /** Count of work items — used by the Step 2 chip "N รายการ". */
  get workItemCount(): number {
    return this.workItems?.length ?? 0;
  }

  /** Sum of qty across all work items — shown in the table footer. */
  get workItemQtyTotal(): number {
    let total = 0;
    for (let i = 0; i < this.workItemCount; i++) {
      const v = this.workItems.at(i).value;
      total += Number(v?.quantity) || 0;
    }
    return total;
  }

  /** Sum of total across all work items — shown in the table footer. */
  get workItemPriceTotal(): number {
    let total = 0;
    for (let i = 0; i < this.workItemCount; i++) {
      const v = this.workItems.at(i).value;
      total += Number(v?.total) || 0;
    }
    return total;
  }

  /** ส่วนลด (Step 3 input). */
  get paymentDiscount(): number {
    const p = this.worksheetForm.get('payment')?.value || {};
    return Number(p.discount) || 0;
  }

  /**
   * ยอดรวมที่ต้องชำระ = ผลรวม work_items − ส่วนลด (read-only ใน Step 3).
   * ตรงกับ BE: total เป็น server-authoritative = Σ items − discount.
   * ดู docs/FINANCE-CONTROLS.md
   */
  get paymentTotal(): number {
    return Math.max(0, this.workItemPriceTotal - this.paymentDiscount);
  }

  /** คงเหลือ = (total + other_fee) - deposit, used by Step 3 payment summary. */
  get paymentRemaining(): number {
    const p = this.worksheetForm.get('payment')?.value || {};
    return Math.max(0, this.paymentTotal + this.otherFee - (Number(p.deposit) || 0));
  }

  /** F10 — ค่าส่ง / ค่าธรรมเนียม (บวกเพิ่มเข้ายอดที่ลูกค้าจ่าย, นอกฐาน VAT/WHT). */
  get shippingFee(): number {
    return Number(this.worksheetForm.get('payment')?.value?.shipping_fee) || 0;
  }
  get transferFee(): number {
    return Number(this.worksheetForm.get('payment')?.value?.transfer_fee) || 0;
  }
  /** ค่าใช้จ่ายอื่นๆ (บริการ เช่น ค่าออกแบบ) — อยู่ในฐาน VAT/WHT (ต่างจากค่าส่ง/ค่าธรรมเนียม). */
  get otherFee(): number {
    return Number(this.worksheetForm.get('payment')?.value?.other_fee) || 0;
  }
  get otherFeeNote(): string {
    return String(this.worksheetForm.get('payment')?.value?.other_fee_note ?? '');
  }

  // ── F16 — หลักฐานมัดจำโอน/เช็ค (mirror BE createJob guard) ─────────────────
  get depositValue(): number {
    return Number(this.worksheetForm.get('payment')?.value?.deposit) || 0;
  }
  get depositBankRef(): string {
    return String(this.worksheetForm.get('payment')?.value?.deposit_bank_ref ?? '');
  }
  /** มัดจำ > 0 + วิธีจ่ายโอน/เช็ค → ต้องมีเลขอ้างอิง + สลิป (เฉพาะตอนสร้าง — editMode ล็อกเงินอยู่แล้ว) */
  get needsDepositEvidence(): boolean {
    const method = String(this.worksheetForm.get('payment')?.value?.payment_method ?? '');
    return !this.editMode && this.depositValue > 0 && (method === 'โอน' || method === 'เช็ค');
  }

  onDepositSlipSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && !this.isValidFile(file)) {
      input.value = '';
      this.depositSlipFile = null;
      return;
    }
    this.depositSlipFile = file;
  }

  private initNewForm() {
    // Fields that the BE owns (serial_number / seller_uid / status / created_*
    // / *_date / *_uid / design_images / print_images) are no longer in this
    // form — createJob populates them server-side.
    this.worksheetForm = this.fb.group({
      contact: ['', Validators.required],
      customer_name: ['', Validators.required],
      line_name: [''],
      phone: [''],
      workItems: this.fb.array([]),
      total: [0],
      deposit: [0],
      payment: this.fb.group({
        total: [0],
        discount: [0],
        shipping_fee: [0],
        transfer_fee: [0],
        other_fee: [0],
        other_fee_note: [''],
        deposit: [0],
        deposit_bank_ref: [''],  // F16 — เลขอ้างอิงมัดจำโอน/เช็ค
        date_of_payment: [new Date()],
        payment_method: [''],
        remaining: [0],
      }),
      date_of_acceptance: ['', Validators.required],
      is_urgent: [false],
      remark: [''],
      tax: this.fb.group({
        vat_mode: ['none'],
        wht_rate: [0],
      }),
    });
  }

  // ── F9 — VAT/WHT live calc (mirror BE computeTax) ──────────────────────────
  readonly VAT_RATE = 7;
  private r2(n: number): number { return Math.round(n * 100) / 100; }
  get vatMode(): string { return this.worksheetForm.get('tax')?.get('vat_mode')?.value || 'none'; }
  get whtRate(): number { return Number(this.worksheetForm.get('tax')?.get('wht_rate')?.value) || 0; }
  /** ยอดบริการที่คิดภาษี = ยอดงาน − ส่วนลด + ค่าใช้จ่ายอื่นๆ (mirror BE taxableTotal). */
  get taxableServiceTotal(): number { return this.r2(this.paymentTotal + this.otherFee); }
  get taxBase(): number {
    return this.vatMode === 'inclusive' ? this.r2(this.taxableServiceTotal / (1 + this.VAT_RATE / 100)) : this.r2(this.taxableServiceTotal);
  }
  get vatAmount(): number {
    if (this.vatMode === 'exclusive') return this.r2((this.taxableServiceTotal * this.VAT_RATE) / 100);
    if (this.vatMode === 'inclusive') return this.r2(this.taxableServiceTotal - this.taxBase);
    return 0;
  }
  get grandTotal(): number {
    return this.vatMode === 'exclusive' ? this.r2(this.taxableServiceTotal + this.vatAmount) : this.r2(this.taxableServiceTotal);
  }
  get whtAmount(): number { return this.r2((this.taxBase * this.whtRate) / 100); }
  get netReceivable(): number { return this.r2(this.grandTotal - this.whtAmount); }
  /** F10 — ยอดที่ลูกค้าต้องจ่าย = รับสุทธิ + ค่าส่ง + ค่าธรรมเนียม */
  get netPayable(): number { return this.r2(this.netReceivable + this.shippingFee + this.transferFee); }

  get workItems() {
    return this.worksheetForm.get('workItems') as FormArray;
  }

  async addWorkItem() {
    const modal = await this.modalController.create({
      component: WorkItemModalComponent,
      cssClass: 'work-item-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      const workItemsArray = this.workItems;
      workItemsArray.push(this.fb.group(data));
      this.calculateTotal();
    }
  }

  async editWorkItem(index: number) {
    const modal = await this.modalController.create({
      component: WorkItemModalComponent,
      componentProps: {
        editData: this.workItems.at(index).value
      },
      cssClass: 'work-item-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      this.workItems.at(index).patchValue(data);
      this.calculateTotal();
    }
  }

  removeWorkItem(index: number) {
    this.workItems.removeAt(index);
    this.calculateTotal();
    // if (this.workItems.length === 0) {
    //   this.addWorkItem();
    // }
  }

  onDragOver(event: DragEvent, type: 'worksheet' | 'reference') {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'worksheet') {
      this.isWorkSheetDragging = true;
    } else {
      this.isReferenceDragging = true;
    }
  }

  onDragLeave(event: DragEvent, type: 'worksheet' | 'reference') {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'worksheet') {
      this.isWorkSheetDragging = false;
    } else {
      this.isReferenceDragging = false;
    }
  }

  onDrop(event: DragEvent, type: 'worksheet' | 'reference') {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'worksheet') {
      this.isWorkSheetDragging = false;
    } else {
      this.isReferenceDragging = false;
    }

    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(Array.from(files), type);
    }
  }

  onFileSelected(event: Event, type: 'worksheet' | 'reference') {
    const element = event.target as HTMLInputElement;
    const files = element.files;
    if (files) {
      this.handleFiles(Array.from(files), type);
      // รีเซ็ต input หลังจากอัพโหลด
      element.value = '';
    }
  }

  private handleFiles(files: File[], type: 'worksheet' | 'reference') {
    if (type === 'worksheet' && files.length > 0) {
      // สำหรับใบงาน เลือกเฉพาะไฟล์แรก
      const file = files[0];
      if (this.isValidFile(file)) {
        this.workSheetFiles = [file]; // เก็บแค่ไฟล์เดียว
        this.workSheetPreviews = []; // เคลียร์ preview เก่า
        this.createPreview(file, type);
      }
    } else if (type === 'reference') {
      // สำหรับรูปอ้างอิง ทำงานแบบเดิม
      const validFiles = files.filter(file => this.isValidFile(file));
      validFiles.forEach(file => {
        this.referenceFiles.push(file);
        this.createPreview(file, type);
      });
    }
  }

  private isValidFile(file: File): boolean {
    if (file.size <= 0 || file.size > MAX_SINGLE_FILE_BYTES) return false;
    const allowedExts = ALLOWED_TYPES[file.type];
    if (!allowedExts) return false;
    // Extension must match the MIME family. Real magic-byte sniffing requires
    // reading the file header (e.g. via FileReader) — leaving as a follow-up.
    // TODO(A4-followup): add async magic-byte sniff for at least JPEG/PNG/PDF.
    const dotIdx = file.name.lastIndexOf('.');
    if (dotIdx < 0) return false;
    const ext = file.name.slice(dotIdx + 1).toLowerCase();
    return allowedExts.includes(ext);
  }

  /**
   * Sanitize a string to be safe for use as a Cloud Storage path segment.
   * Strips path separators, parent-dir traversal, leading dots, and control
   * characters; whitelists [A-Za-z0-9_-] plus the Thai Unicode block
   * (U+0E00..U+0E7F) so Thai month names / serial numbers survive intact.
   * Returns 'unknown' if nothing is left.
   */
  private sanitizePathSegment(input: string): string {
    if (!input) return 'unknown';
    const cleaned = input
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/\.\./g, '')
      .replace(/[^A-Za-z0-9_\-฀-๿]/g, '_')
      .replace(/^\.+/, '');
    return cleaned.length > 0 ? cleaned.slice(0, 64) : 'unknown';
  }

  private createPreview(file: File, type: 'worksheet' | 'reference') {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        if (type === 'worksheet') {
          this.workSheetPreviews.push(e.target.result);
        } else {
          this.referencePreviews.push(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      const pdfPreview = 'assets/icons/pdf-icon.png';
      if (type === 'worksheet') {
        this.workSheetPreviews.push(pdfPreview);
      } else {
        this.referencePreviews.push(pdfPreview);
      }
    }
  }

  removeFile(preview: string, type: 'worksheet' | 'reference') {
    if (type === 'worksheet') {
      const index = this.workSheetPreviews.indexOf(preview);
      if (index > -1) {
        this.workSheetPreviews.splice(index, 1);
        this.workSheetFiles.splice(index, 1);
        this.worksheetInput.nativeElement.value = '';
      }
    } else {
      const index = this.referencePreviews.indexOf(preview);
      if (index > -1) {
        this.referencePreviews.splice(index, 1);
        this.referenceFiles.splice(index, 1);
        this.referenceInput.nativeElement.value = '';
      }
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.worksheetForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  async submit() {
    if (!this.validateForm()) {
      return;
    }
    if (this.editMode) { await this.submitEdit(); return; }

    // ค่าใช้จ่ายอื่นๆ ต้องมีหมายเหตุ (mirror BE) — เช็คก่อนอัปรูป กัน round-trip เสียเปล่า
    if (this.otherFee > 0 && !this.otherFeeNote.trim()) {
      const t = await this.toastController.create({
        message: 'กรุณาระบุหมายเหตุค่าใช้จ่ายอื่นๆ (เช่น ค่าออกแบบ)',
        duration: 3000, position: 'top', color: 'danger', cssClass: 'custom-toast', icon: 'alert-circle',
      });
      await t.present();
      this.step = 3; // กลับไป Step ชำระเงิน
      return;
    }

    // F16 — มัดจำโอน/เช็ค ต้องมีเลขอ้างอิง + สลิป (mirror BE)
    if (this.needsDepositEvidence && (!this.depositBankRef.trim() || !this.depositSlipFile)) {
      const t = await this.toastController.create({
        message: 'มัดจำแบบโอน/เช็ค ต้องระบุเลขอ้างอิงและแนบสลิป',
        duration: 3000, position: 'top', color: 'danger', cssClass: 'custom-toast', icon: 'alert-circle',
      });
      await t.present();
      this.step = 3;
      return;
    }

    this.isSubmitting = true;
    try {
      // Upload images first — storage paths use a UUID instead of serial
      // because the serial is now generated server-side by createJob.
      const workSheetImages = await this.uploadFiles(this.workSheetFiles, 'worksheet');
      const referenceImages = await this.uploadFiles(this.referenceFiles, 'reference');

      const payload = this.buildCreateJobPayload(
        workSheetImages.length > 0 ? workSheetImages[0].url : null,
        referenceImages.map((i) => i.url),
      );

      // F16 — อัปสลิปมัดจำใต้ bucket UUID เดียวกับรูปใบงาน (path jobs/{bucket}/slip
      // เปิดใน storage.rules อยู่แล้ว — ยังไม่มี jobId จริงตอนนี้) + sha256 กันสลิปซ้ำ
      if (this.needsDepositEvidence && this.depositSlipFile) {
        if (!this.uploadBucketId) this.uploadBucketId = uuidv4();
        const [slipUrl, slipHash] = await Promise.all([
          this.paymentService.uploadSlip(this.uploadBucketId, this.depositSlipFile),
          this.paymentService.hashFile(this.depositSlipFile),
        ]);
        payload.deposit_bank_ref = this.depositBankRef.trim();
        payload.deposit_slip_url = slipUrl;
        payload.deposit_slip_hash = slipHash;
      }

      const res = await this.jobsService.createJob(payload);

      const toast = await this.toastController.create({
        message: `บันทึกใบงาน ${res.serial_number} สำเร็จ`,
        duration: 2500,
        position: 'top',
        color: 'success',
        cssClass: 'custom-toast',
        icon: 'checkmark-circle',
      });
      await toast.present();
      this.resetForm();
      this.router.navigate(['/naikit-sticker/home']);
    } catch (error: unknown) {
      const message =
        error instanceof JobAdminError
          ? error.message
          : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
      const toast = await this.toastController.create({
        message,
        duration: 3000,
        position: 'top',
        color: 'danger',
        cssClass: 'custom-toast',
        icon: 'alert-circle',
      });
      await toast.present();
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Edit mode — ส่งเฉพาะ field ที่ seller แก้ได้ผ่าน editJob (ไม่รวม payment;
   * BE recompute total/remaining จาก work_items + คง discount/deposit/method เดิม,
   * และ guard: แก้ได้ก่อนคอนเฟิร์ม + ลด total ต่ำกว่าที่จ่ายแล้วไม่ได้).
   */
  private async submitEdit() {
    if (!this.editJobId) return;
    this.isSubmitting = true;
    try {
      const v = this.worksheetForm.value;
      const work_items: WorkItem[] = (v.workItems as WorkItemFormValue[]).map((wi) => {
        const quantity = Number(wi.quantity) || 1;
        const itemTotal = Number(wi.total) || 0;
        return {
          type: String(wi.type ?? ''),
          width: Number(wi.width) || 0,
          height: Number(wi.height) || 0,
          unit_of_length: mapUnitOfLength(wi.unit_of_length),
          option: String(wi.option ?? ''),
          quantity,
          unit_price: quantity > 0 ? itemTotal / quantity : 0,
          total: itemTotal,
        };
      });
      const patch: Record<string, unknown> = {
        customer_name: String(v.customer_name ?? '').trim(),
        contact: v.contact,
        phone: String(v.phone ?? '').trim() || undefined,
        line_name: String(v.line_name ?? '').trim() || undefined,
        is_urgent: !!v.is_urgent,
        remark: String(v.remark ?? '').trim(),
        date_of_acceptance: v.date_of_acceptance ? new Date(v.date_of_acceptance).toISOString() : undefined,
        work_items,
        vat_mode: this.vatMode,
        wht_rate: this.whtRate,
      };
      await this.jobsService.editJob(this.editJobId, patch);
      const toast = await this.toastController.create({
        message: 'แก้ไขใบงานสำเร็จ', duration: 2500, position: 'top', color: 'success',
        cssClass: 'custom-toast', icon: 'checkmark-circle',
      });
      await toast.present();
      this.router.navigate(['/naikit-sticker/home']);
    } catch (error: unknown) {
      const message = error instanceof JobAdminError ? error.message : 'แก้ไขไม่สำเร็จ ลองใหม่อีกครั้ง';
      const toast = await this.toastController.create({
        message, duration: 3000, position: 'top', color: 'danger', cssClass: 'custom-toast', icon: 'alert-circle',
      });
      await toast.present();
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Map the form value into the BE `createJob` payload shape. Two non-obvious
   * conversions happen here:
   *   - work_items: Thai unit labels ('ซม.' / 'นิ้ว' / …) → SCHEMA enum
   *     ('cm.' / 'inch' / …), and unit_price is derived from total/quantity
   *     because the modal only captures total.
   *   - date_of_acceptance + payment.date_of_payment: serialized to ISO so
   *     the BE `parseDate()` accepts them.
   */
  private buildCreateJobPayload(
    worksheetImageUrl: string | null,
    referenceImageUrls: string[],
  ): CreateJobPayload {
    const v = this.worksheetForm.value;
    // Payment numerics come from the Step-3 "payment" formGroup inputs. Even
    // type="number" controls can hand back strings, so coerce explicitly — the
    // BE rejects a non-number payment.total ("payment.total ต้องเป็นตัวเลข").
    const paymentForm = v.payment ?? {};
    const deposit = Number(paymentForm.deposit ?? v.deposit) || 0;
    const discount = Number(paymentForm.discount) || 0;
    const shipping_fee = Number(paymentForm.shipping_fee) || 0;
    const transfer_fee = Number(paymentForm.transfer_fee) || 0;
    const other_fee = Number(paymentForm.other_fee) || 0;
    const other_fee_note = String(paymentForm.other_fee_note ?? '').trim();

    const work_items: WorkItem[] = (v.workItems as WorkItemFormValue[]).map((wi) => {
      const quantity = Number(wi.quantity) || 1;
      const itemTotal = Number(wi.total) || 0;
      const unit_price = quantity > 0 ? itemTotal / quantity : 0;
      return {
        type: String(wi.type ?? ''),
        width: Number(wi.width) || 0,
        height: Number(wi.height) || 0,
        unit_of_length: mapUnitOfLength(wi.unit_of_length),
        option: String(wi.option ?? ''),
        quantity,
        unit_price,
        total: itemTotal,
      };
    });

    // total เป็น server-authoritative ฝั่ง BE (= Σ items − discount) — ส่งค่าที่
    // คำนวณตรงกันไปด้วยเพื่อ display ความสอดคล้อง แต่ BE จะคิดใหม่เองอยู่ดี.
    // ดู docs/FINANCE-CONTROLS.md
    const itemsTotal = work_items.reduce((sum, w) => sum + w.total, 0);
    const total = Math.max(0, itemsTotal - discount);
    const remaining = Math.max(0, total + other_fee - deposit);

    const payment: Payment = {
      total,
      discount,
      shipping_fee,
      transfer_fee,
      other_fee,
      other_fee_note,
      deposit,
      remaining,
      payment_method: (paymentForm.payment_method ?? '') as Payment['payment_method'],
      date_of_payment: paymentForm.date_of_payment
        ? new Date(paymentForm.date_of_payment).toISOString()
        : null,
    };

    return {
      customer_name: String(v.customer_name ?? '').trim(),
      contact: v.contact as CreateJobPayload['contact'],
      phone: String(v.phone ?? '').trim() || undefined,
      line_name: String(v.line_name ?? '').trim() || undefined,
      is_urgent: !!v.is_urgent,
      remark: String(v.remark ?? '').trim() || undefined,
      date_of_acceptance: new Date(v.date_of_acceptance).toISOString(),
      work_items,
      payment,
      worksheet_image: worksheetImageUrl,
      reference_images: referenceImageUrls,
      vat_mode: this.vatMode as CreateJobPayload['vat_mode'],
      wht_rate: this.whtRate,
    };
  }

  async uploadFiles(files: File[], type: 'worksheet' | 'reference') {
    if (!files || files.length === 0) return [];

    try {
      const date = new Date();
      const year = date.getFullYear().toString();
      const month_name = this.sanitizePathSegment(
        date.toLocaleString('th-TH', { month: 'long' })
      );
      const imageUrls: string[] = [];

      // Enforce upload caps. For reference uploads only — worksheet always
      // takes a single file.
      let filesToUpload: File[];
      if (type === 'worksheet') {
        filesToUpload = [files[0]];
      } else {
        if (files.length > MAX_REFERENCE_FILES) {
          throw new Error(`เลือกได้สูงสุด ${MAX_REFERENCE_FILES} ไฟล์`);
        }
        const totalBytes = files.reduce((s, f) => s + (f.size || 0), 0);
        if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
          throw new Error('ขนาดไฟล์รวมเกิน 25MB');
        }
        filesToUpload = files;
      }

      // Uploads happen before the BE generates the serial_number (createJob
      // returns it later), so the storage path uses a per-submission UUID
      // bucket instead. Memoized on `this.uploadBucketId` so worksheet +
      // reference uploads share the same bucket.
      if (!this.uploadBucketId) {
        this.uploadBucketId = uuidv4();
      }
      const safeSerial = this.uploadBucketId;
      const subdir = type === 'worksheet' ? 'worksheet' : 'reference';

      for (const file of filesToUpload) {
        // Re-validate per file (defense in depth — handleFiles also filters,
        // but submit() might be called with files added another way).
        if (!this.isValidFile(file)) {
          throw new Error(`ไฟล์ไม่ถูกต้อง: ${file.name}`);
        }
        // Rename: ${uuid}-${sanitized-original}. Prevents collisions and any
        // path injection from `file.name`.
        const safeName = this.sanitizePathSegment(
          file.name.replace(/\.[^.]+$/, '')
        );
        const dotIdx = file.name.lastIndexOf('.');
        const ext = dotIdx >= 0
          ? this.sanitizePathSegment(file.name.slice(dotIdx + 1).toLowerCase())
          : 'bin';
        const finalName = `${uuidv4()}-${safeName}.${ext}`;
        const imagePath = `images/${year}/${month_name}/${safeSerial}/${subdir}/${finalName}`;

        const imageUrl = await this.storageService.uploadImage(file, imagePath);
        imageUrls.push(imageUrl);
      }

      // แปลงเป็น array ของ image objects
      const images = imageUrls.map((url) => ({
        id: uuidv4(),
        url: url,
        type: type, // เพิ่ม type เพื่อแยกประเภทรูป
        date: new Date()
      }));

      return images;

    } catch (error) {
      console.error('Upload failed:', error);
      throw error; // ส่งต่อ error ไปให้ caller จัดการ
    }
  }

  resetForm() {
    this.worksheetForm.reset();
    this.workItems.clear();
    this.workSheetFiles = [];
    this.workSheetPreviews = [];
    this.referenceFiles = [];
    this.referencePreviews = [];
    this.totalAmount = 0;
    this.uploadBucketId = null;
    this.depositSlipFile = null;
    this.initNewForm();
  }

  get isFormValid(): boolean {
    return this.worksheetForm.valid && this.workItems.length > 0;
  }

  calculateTotal() {
    this.totalAmount = this.workItems.controls.reduce((sum, item) => {
      return sum + (item.get('total')?.value || 0);
    }, 0);
    this.worksheetForm.patchValue({ total: this.totalAmount });
  }

  validateForm(): boolean {
    if (this.worksheetForm.invalid) {
      Object.keys(this.worksheetForm.controls).forEach(key => {
        const control = this.worksheetForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return false;
    }
    if (this.workItems.length === 0) {
      // แสดง alert หรือ toast แจ้งเตือน
      return false;
    }
    return true;
  }

  cancel() {
    // นำทางกลับไปหน้าก่อนหน้า
    this.router.navigate(['../']);
  }

}

