import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Timestamp } from 'firebase/firestore';
import { DESIGNER_OPTION } from 'src/app/data/data';
import { FirestoreService } from 'src/app/services/firestore.service';
import { WorksheetInfoComponent } from '../worksheet-info/worksheet-info.component';
import { ModalController } from '@ionic/angular';

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
      this.firestoreService.fetchWorkSheetSummaryDiary(this.date, this.form.value.designer.value).then((res) => {
        this.workSheets = res;
        this.confirmedWorkSheets = res;
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
