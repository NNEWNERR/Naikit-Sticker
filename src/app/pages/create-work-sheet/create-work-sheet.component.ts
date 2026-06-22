import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from 'src/app/services/modal.service';
import { ToastController, AlertController } from 'src/app/services/service.service';
import { v4 as uuidv4 } from 'uuid';
import { WorkItemModalComponent } from './work-item-modal/work-item-modal.component';
import { Router, ActivatedRoute } from '@angular/router';
import { StorageService } from 'src/app/services/storage.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { thSarabunFont } from '../../shared/fonts/th-sarabun-font';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { WorksheetPreviewModalComponent } from '../../components/worksheet-preview-modal/worksheet-preview-modal.component';
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

  contacts = [
    {
      title: 'หน้าร้าน',
      value: 'front',
      disabled: false,
    },
    {
      title: 'โทรศัพท์',
      value: 'phone',
      disabled: false,
    },
    {
      title: 'เฟสบุ๊ค',
      value: 'facebook',
      disabled: false,
    },
    {
      title: 'ไลน์',
      value: 'line',
      disabled: false,
    },
    {
      title: 'อีเมล',
      value: 'email',
      disabled: false,
    },
  ];

  // contacts = ['หน้าร้าน', 'โทรศัพท์', 'เฟสบุ๊ค', 'ไลน์', 'อีเมล']
  // designers = ฟลุ๊ค ไนซ์ เลย์ เอก เยาว์
  // printers = ฟลุ๊ค ไนซ์ เลย์ เอก เยาว์ นิว ซี ฮอล อัน ดาว(พ) เลย์(ช)

  payments = [
    {
      title: 'เงินสด',
      value: 'เงินสด',
      disabled: false,
    },
    {
      title: 'โอน',
      value: 'โอน',
      disabled: false,
    },
    {
      title: 'เช็ค',
      value: 'เช็ค',
      disabled: false,
    },
    {
      title: 'เครดิต',
      value: 'เครดิต',
      disabled: false,
    },
    {
      title: 'อื่นๆ',
      value: 'อื่นๆ',
      disabled: false,
    },
  ];

  designers = [
    {
      title: 'admin',
      value: 'admin',
      disabled: false,
    },
    {
      title: 'ฟลุ๊ค',
      value: 'ฟลุ๊ค',
      disabled: false,
    },
    {
      title: 'ไนซ์',
      value: 'ไนซ์',
      disabled: false,
    },
    {
      title: 'เลย์',
      value: 'เลย์',
      disabled: false,
    },
    {
      title: 'เอก',
      value: 'เอก',
      disabled: false,
    },
    {
      title: 'เยาว์',
      value: 'เยาว์',
      disabled: false,
    },
  ];

  is_ergents = [
    {
      title: 'ไม่ด่วน',
      value: 'ไม่ด่วน',
      disabled: false,
    },
    {
      title: 'ด่วน',
      value: 'ด่วน',
      disabled: false,
    },
  ];

  printers = [
    {
      title: 'admin',
      value: 'admin',
      disabled: false,
    },
    {
      title: 'ฟลุ๊ค',
      value: 'ฟลุ๊ค',
      disabled: false,
    },
    {
      title: 'ไนซ์',
      value: 'ไนซ์',
      disabled: false,
    },
    {
      title: 'เลย์',
      value: 'เลย์',
      disabled: false,
    },
    {
      title: 'เอก',
      value: 'เอก',
      disabled: false,
    },
    {
      title: 'เยาว์',
      value: 'เยาว์',
      disabled: false,
    },
    {
      title: 'นิว',
      value: 'นิว',
      disabled: false,
    },
    {
      title: 'ซี',
      value: 'ซี',
      disabled: false,
    },
    {
      title: 'อัน',
      value: 'อัน',
      disabled: false,
    },
    {
      title: 'ดาว',
      value: 'ดาว',
      disabled: false,
    },
    {
      title: 'เลย์(ช)',
      value: 'เลย์(ช)',
      disabled: false,
    },
  ];

  worksheetForm: FormGroup;
  filePreviews: string[] = [];
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

  constructor(
    private jobsService: JobsService,
    private storageService: StorageService,
    private modalController: ModalController,
    private toastController: ToastController,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private alertController: AlertController,
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

  /** คงเหลือ = total - deposit, used by Step 3 payment summary. */
  get paymentRemaining(): number {
    const p = this.worksheetForm.get('payment')?.value || {};
    return Math.max(0, this.paymentTotal - (Number(p.deposit) || 0));
  }

  /** F10 — ค่าส่ง / ค่าธรรมเนียม (บวกเพิ่มเข้ายอดที่ลูกค้าจ่าย, นอกฐาน VAT/WHT). */
  get shippingFee(): number {
    return Number(this.worksheetForm.get('payment')?.value?.shipping_fee) || 0;
  }
  get transferFee(): number {
    return Number(this.worksheetForm.get('payment')?.value?.transfer_fee) || 0;
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
        deposit: [0],
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
  get taxBase(): number {
    return this.vatMode === 'inclusive' ? this.r2(this.paymentTotal / (1 + this.VAT_RATE / 100)) : this.r2(this.paymentTotal);
  }
  get vatAmount(): number {
    if (this.vatMode === 'exclusive') return this.r2((this.paymentTotal * this.VAT_RATE) / 100);
    if (this.vatMode === 'inclusive') return this.r2(this.paymentTotal - this.taxBase);
    return 0;
  }
  get grandTotal(): number {
    return this.vatMode === 'exclusive' ? this.r2(this.paymentTotal + this.vatAmount) : this.r2(this.paymentTotal);
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
      .replace(/[ -]/g, '')
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

  previewFile(preview: string, type: 'worksheet' | 'reference') {
    const files = type === 'worksheet' ? this.workSheetFiles : this.referenceFiles;
    const index = (type === 'worksheet' ? this.workSheetPreviews : this.referencePreviews).indexOf(preview);

    // Preview thumbnails are rendered from the *Previews arrays in the template;
    // nothing to compute here once the index is resolved.
    void index;
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
    const remaining = Math.max(0, total - deposit);

    const payment: Payment = {
      total,
      discount,
      shipping_fee,
      transfer_fee,
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
    this.filePreviews = [];
    this.workSheetFiles = [];
    this.workSheetPreviews = [];
    this.referenceFiles = [];
    this.referencePreviews = [];
    this.totalAmount = 0;
    this.uploadBucketId = null;
    this.initNewForm();
  }

  formatDate(date: Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  get isFormValid(): boolean {
    return this.worksheetForm.valid && this.workItems.length > 0;
  }

  get hasDeposit(): boolean {
    return (this.worksheetForm.get('deposit')?.value || 0) > 0;
  }

  onDepositChange() {
    const deposit = this.worksheetForm.get('deposit')?.value || 0;
    if (deposit > this.totalAmount) {
      this.worksheetForm.patchValue({ deposit: this.totalAmount });
    }
  }

  async handleFileUpload(files: FileList) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        try {
          const base64 = await this.convertToBase64(file);
          this.filePreviews.push(base64);
        } catch (error) {
          console.error('File conversion error:', error);
        }
      }
    }
  }

  private convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  calculateTotal() {
    this.totalAmount = this.workItems.controls.reduce((sum, item) => {
      return sum + (item.get('total')?.value || 0);
    }, 0);
    this.worksheetForm.patchValue({ total: this.totalAmount });
  }

  calculateBalance() {
    const total = this.worksheetForm.get('total')?.value || 0;
    const deposit = this.worksheetForm.get('deposit')?.value || 0;
    return total - deposit;
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

  showOption(index: number, item: any) {
    // no-op (debug logging removed)
    void index; void item;
  }

  //#endregion

  cancel() {
    // นำทางกลับไปหน้าก่อนหน้า
    this.router.navigate(['../']);
  }

  async clearForm() {
    const alert = await this.alertController.create({
      header: 'ยืนยันการล้างแบบ',
      message: 'คุณต้องการล้างข้อมูลทั้งหมดใช่หรือไม่?',
      buttons: [
        {
          text: 'ยกเลิก',
          role: 'cancel'
        },
        {
          text: 'ยืนยัน',
          handler: () => {
            this.worksheetForm.reset();
            this.workSheetFiles = [];
            this.workSheetPreviews = [];
            this.referenceFiles = [];
            this.referencePreviews = [];
          }
        }
      ]
    });
    await alert.present();
  }


  async exportToPDF() {
    try {
      if (true) {
        const formData = this.worksheetForm.value;
        
        // เพิ่มข้อมูลรูปภาพ
        const previewData = {
          ...formData,
          worksheet_preview: this.workSheetPreviews?.[0], // รูปใบงาน
          reference_previews: this.referencePreviews || [], // รูปอ้างอิง
        };

        // แสดง Modal ยืนยันข้อมูล
        const modal = await this.modalController.create({
          component: WorksheetPreviewModalComponent,
          componentProps: {
            worksheetData: previewData
          },
          cssClass: 'modal-fullscreen'
        });

        await modal.present();

        // รอผลลัพธ์จาก Modal
        const { data } = await modal.onDidDismiss();
        
        if (data?.confirmed) {
          // await this.submit();
          
          const toast = await this.toastController.create({
            message: 'บันทึกข้อมูลสำเร็จ',
            duration: 2000,
            position: 'top',
            color: 'success'
          });
          await toast.present();
          
          this.router.navigate(['/worksheets']);
        }
      } else {
        const toast = await this.toastController.create({
          message: 'กรุณากรอกข้อมูลให้ครบถ้วน',
          duration: 2000,
          position: 'top',
          color: 'warning'
        });
        await toast.present();
      }
    } catch (error) {
      console.error('Error:', error);
      const toast = await this.toastController.create({
        message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
        duration: 2000,
        position: 'top',
        color: 'danger'
      });
      await toast.present();
    }
  }

  async exportExcel() {
    try {
      const formData = this.worksheetForm.value;
      const workItems = formData?.workItems ?? [];

      // สร้างฟังก์ชันสำหรับจัดรูปแบบวันที่
      const formatThaiDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
      };

      const worksheet = XLSX.utils.aoa_to_sheet([
        ['', '', 'ใบสั่งงาน', '', `เลขที่ ${formData.serial_number}`],
        [],
        ['สั่งทาง', formData.contact || ''],
        ['หน่วยงาน/ผู้สั่งงาน', formData.customer_name || '', 'โทร', formData.phone || '', 'ไลน์', formData.line_name || ''],
        [],
        ['ประเภทงาน'],
        ['ลำดับ', 'ประเภท', 'ขนาด', 'ตัวเลือก', 'จำนวน', 'ราคา'],
        ...workItems.map((item, index) => [
          index + 1,
          item.type,
          `${item.height} × ${item.width} ${item.unit_of_length}`,
          item.option,
          item.quantity,
          item.total
        ]),
        [],
        ['อื่นๆ', formData.remark || ''],
        ['ยอดรวม', formData.payment?.total || '', '', '', 'วันที่รับเงิน', formatThaiDate(formData.payment?.date_of_payment)],
        ['มัดจำ', formData.payment?.deposit || '', '', '', 'วิธีชำระเงิน', formData.payment?.payment_method || ''],
        ['คงเหลือ', formData.payment?.remaining || ''],
        [],
        ['วันที่รับงาน', formatThaiDate(formData.date_of_acceptance)],
        ['งานด่วน', formData.is_urgent ? '✓' : ''],
        ['สถานะ', formData.status || ''],
        [],
        ['ผู้ออกแบบ', '', 'วันที่ออกแบบ', ''],
        ['ผู้พิมพ์', '', 'วันที่พิมพ์', ''],
        ['ผู้รับงาน', formData.seller || ''],
        [],
      ]);

      // กำหนดความกว้างของคอลัมน์
      worksheet['!cols'] = [
        { wch: 8 },   // ลำดับ
        { wch: 12 },  // ประเภท
        { wch: 15 },  // ขนาด
        { wch: 15 },  // ตัวเลือก
        { wch: 8 },   // จำนวน
        { wch: 10 },  // ราคา
      ];

      // จัดสไตล์หัวข้อหลัก
      const headerCells = ['A6'];
      headerCells.forEach(cell => {
        if (worksheet[cell]) {
          worksheet[cell].s = {
            font: { bold: true, color: { rgb: "FF0000" } },  // สีแดง
            alignment: { horizontal: 'left' }
          };
        }
      });

      // จัดรูปแบบสีของข้อความสำหรับหัวข้อ
      const redTextCells = ['A3', 'A17', 'A18', 'A19'];
      redTextCells.forEach(cell => {
        if (worksheet[cell]) {
          worksheet[cell].s = {
            font: { color: { rgb: "FF0000" } }
          };
        }
      });

      // จัดรูปแบบสำหรับหัวตาราง
      const tableHeaderRow = 7; // แถวที่มีหัวตาราง
      for (let i = 0; i < 6; i++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: tableHeaderRow, c: i })];
        if (cell) {
          cell.s = {
            font: { bold: true },
            alignment: { horizontal: 'center' }
          };
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ใบสั่งงาน');
      XLSX.writeFile(workbook, `ใบสั่งงาน_${formData.serial_number || 'no_id'}.xlsx`);

      const toast = await this.toastController.create({
        message: 'Export Excel สำเร็จ',
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      await toast.present();

    } catch (error) {
      console.error('Error:', error);
      const toast = await this.toastController.create({
        message: 'เกิดข้อผิดพลาด',
        duration: 2000,
        position: 'top',
        color: 'danger'
      });
      await toast.present();
    }
  }

}

