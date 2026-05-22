import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Timestamp } from 'firebase/firestore';
import { DESIGNER_OPTION } from 'src/app/data/data';
import { FirestoreService } from 'src/app/services/firestore.service';
import { WorksheetInfoComponent } from '../worksheet-info/worksheet-info.component';
import { ModalController } from 'src/app/services/modal.service';
import { NkBadgeTone } from 'src/app/shared/components';

@Component({
  selector: 'app-diary-summary',
  templateUrl: './diary-summary.component.html',
  styleUrls: ['./diary-summary.component.scss'],
})
export class DiarySummaryComponent implements OnInit {

  workSheets = [];
  date = new Date()
  designer = DESIGNER_OPTION.slice(1);
  form: FormGroup;
  searchTerm: string = '';
  selectedStatus: string = '';
  startDate: Date;
  endDate: Date;
  confirmedWorkSheets: any[] = [];

  /**
   * The 5 "post-confirm" statuses surfaced by the prototype's diary summary —
   * worksheets the seller already locked in. Drives the filter chips below.
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

  setFilter(key: string) {
    this.selectedFilter = key;
  }

  countOf(status: string): number {
    return this.confirmedWorkSheets.filter((w) => w.status === status).length;
  }

  get visibleRows(): any[] {
    if (this.selectedFilter === 'all') return this.confirmedWorkSheets;
    return this.confirmedWorkSheets.filter((w) => w.status === this.selectedFilter);
  }

  get urgentCount(): number {
    return this.confirmedWorkSheets.filter((w) => !!w.is_urgent).length;
  }

  get deliveredCount(): number {
    return this.confirmedWorkSheets.filter((w) => w.status === 'ส่งมอบแล้ว').length;
  }

  /**
   * String adapter for <input type="date">. The component stores `date` as a
   * Date; the input speaks ISO yyyy-MM-dd. Setting normalizes to noon to
   * dodge timezone drift across the day boundary.
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

  /** Period label for the SUMMARY block — Thai month + year (current). */
  get monthLabel(): string {
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const d = new Date(this.date);
    return `${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  }

  toneFor(status: string): NkBadgeTone {
    return this.statusLabels[status]?.tone || 'neutral';
  }

  trackByKey = (_i: number, w: any): string => w?.key ?? w?.serial_number ?? String(_i);

  constructor(
    private firestoreService: FirestoreService,
    private formBuilder: FormBuilder,
     private modalController: ModalController
  ) { }

  ngOnInit() {
    this.initForm();
  }

  initForm() {
    this.form = this.formBuilder.group({
      designer: ['', Validators.required],
    })
  }

  search() {
    if (this.form.valid) {
      this.firestoreService.unsubscribeSubscriptions();
      this.firestoreService.fetchWorkSheetSummaryDiary(this.date, this.form.value.designer.value).then((res: any[]) => {
        this.workSheets = res;
        // The redesigned summary screen is specifically about post-confirm
        // workflow (พร้อมผลิต → ส่งมอบแล้ว). Filter at the client to match
        // the prototype's intent; the fetch query is left as-is so callers
        // and Firestore indexes don't need to change.
        const allowed = new Set(this.confirmedStatuses as readonly string[]);
        this.confirmedWorkSheets = (res || []).filter((w) => allowed.has(w.status));
      });
    } else {
      this.form.markAllAsTouched();
    }
  }

  formatTime(timestamp: Timestamp) {
    const date = new Date(timestamp.seconds * 1000);
    const options: Intl.DateTimeFormatOptions = {
      // year: 'numeric',
      // month: 'long',
      // day: 'numeric',
      // hour: 'numeric',
      // minute: 'numeric',
      // second: 'numeric',
      // timeZoneName: 'short'
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      // hour: '2-digit',
      // minute: '2-digit',
      // second: '2-digit'
    };
    const formattedDate = date.toLocaleDateString('th-TH', options);
    return formattedDate;
  }

  onActivate(event) {
    if (event.type === "click") {
      // console.log(event.row)
    }
  }

  workSheetInfo(workSheet) {
    this.modalController.create({
      component: WorksheetInfoComponent,
      componentProps: {
        workSheet: workSheet
      },
      cssClass: 'modal-fullscreen',
    }).then(modal => modal.present());
  }

  getStatusClass(status: string): string {
    const classes = {
      'รอดำเนินการ': 'px-2 py-1 rounded-full bg-yellow-100 text-yellow-800',
      'กำลังดำเนินการ': 'px-2 py-1 rounded-full bg-blue-100 text-blue-800',
      'เสร็จสิ้น': 'px-2 py-1 rounded-full bg-green-100 text-green-800',
      'ยกเลิก': 'px-2 py-1 rounded-full bg-red-100 text-red-800'
    };
    return classes[status] || '';
  }

  getConfirmedCount(): number {
    return this.workSheets?.filter(ws => ws.status === 'เสร็จสิ้น').length || 0;
  }

  getPendingCount(): number {
    return this.workSheets?.filter(ws => ws.status === 'รอดำเนินการ').length || 0;
  }

  getStatusIcon(status: string): string {
    const icons = {
      'รอดำเนินการ': 'time-outline',
      'กำลังดำเนินการ': 'reload-outline',
      'เสร็จสิ้น': 'checkmark-circle-outline',
      'ยกเลิก': 'close-circle-outline'
    };
    return icons[status] || 'help-outline';
  }

  getDesignerCount(): number {
    if (!this.form.value.designer?.value) return 0;
    return this.workSheets?.filter(ws => ws.design_by === this.form.value.designer.value).length || 0;
  }

  resetFilters() {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.startDate = null;
    this.endDate = null;
    this.form.get('designer').reset();
    this.search();
  }

  onSearch() {
    // Implement search logic
  }

  exportWorkSheet(row: any) {
    // Implement PDF export logic
  }

  getTotalAmount(): number {
    return this.confirmedWorkSheets.reduce((sum, ws) => sum + (ws.total || 0), 0);
  }

  getDesignerConfirmedCount(): number {
    if (!this.form.value.designer?.value) return 0;
    return this.confirmedWorkSheets.filter(ws => ws.design_by === this.form.value.designer.value).length;
  }

  exportToExcel() {
    // TODO: Implement Excel export logic
    console.log('Exporting to Excel:', this.confirmedWorkSheets);
  }
}
