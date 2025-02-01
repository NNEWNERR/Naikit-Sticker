import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Timestamp } from 'firebase/firestore';
import { SettingAddComponent } from 'src/app/components/modals/setting-add/setting-add.component';
import { SettingEditComponent } from 'src/app/components/modals/setting-edit/setting-edit.component';
import { FirestoreService } from 'src/app/services/firestore.service';
import { ServiceService } from 'src/app/services/service.service';
import { EditWorkSheetComponent } from '../edit-work-sheet/edit-work-sheet.component';
import { CreateWorkSheetComponent } from '../create-work-sheet/create-work-sheet.component';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SEGMENT_OPTION, STATUS_OPTION, SELLER_OPTION, DESIGNER_OPTION } from 'src/app/data/data';
import { WorksheetInfoComponent } from '../worksheet-info/worksheet-info.component';

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss'],
})
export class ReportComponent implements OnInit {
  segment_option = SEGMENT_OPTION;
  statuses = STATUS_OPTION;
  sellers = SELLER_OPTION;
  designers = DESIGNER_OPTION;
  workSheet = [];
  filterWorkSheet = [];
  currentSearch = '';
  currentStatus = 'ทั้งหมด';
  currentSeller = 'ทั้งหมด';
  currentGraphic = 'ทั้งหมด';
  form: FormGroup;
  statusCount = {
    total: 0,
    pending: 0,
    working: 0,
    confirming: 0,
    confirmed: 0,
    inProduction: 0,
    workingInProduction: 0,
    inDelivery: 0,
    delivered: 0
  };

  get statusKeys() {
    return Object.keys(this.statusCount);
  }

  search: any
  public data = [];
  public results = [...this.data];
  subscription;

  constructor(
    private serviceService: ServiceService,
    private modalController: ModalController,
    private firestoreService: FirestoreService,
    private formBuilder: FormBuilder
  ) { }

  ngOnInit() {
    this.serviceService.presentLoadingWithOutTime('Loading...');
    this.firestoreService.unsubscribeSubscriptions()
    this.initForm();
    this.firestoreService.fetchDataAllJob();
    this.initForm();
    this.firestoreService.allJobsChange.subscribe((data) => {
      this.workSheet = data;
      this.filterWorkSheet = data;
      this.filteringWorkSheet('all');
      this.countStatuses(this.filterWorkSheet);
      if (this.currentSearch) {
        this.onWorkSheetSearchChange({ detail: { value: this.currentSearch } });
      }
    })
  }

  // ngOnDestroy() {
  //   this.firestoreService.unsubscribeSubscriptions()
  // }


  initForm() {
    this.form = this.formBuilder.group({
      text_search: [''],
      status: [this.statuses ? this.statuses[0] : ''],
      seller: [this.sellers ? this.sellers[0] : ''],
      graphic: [this.designers ? this.designers[0] : '']
    })
  }

  closeModal() {
    this.modalController.dismiss();
  }

  handleInput(event) {
    const query = event.target.value.toLowerCase();
    this.results = this.data.filter((d) => d.serial_number.toLowerCase().indexOf(query) > -1 || d.customer_name.toLowerCase().indexOf(query) > -1);
  }

  onActivate(event) {
    if (event.type === "click") {
      // console.log(event.row)
    }
  }

  createWorkSheet() {
    this.modalController.create({
      component: CreateWorkSheetComponent,
      cssClass: 'my-custom-class',
    }).then(modal => modal.present());
  }

  editWorkSheet(workSheet) {
    this.modalController.create({
      component: EditWorkSheetComponent,
      componentProps: {
        type: 'job',
        workSheet: workSheet
      },
      cssClass: 'my-custom-class',
    }).then(modal => modal.present());
  }

  formatTimeFull(timestamp: Timestamp) {
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
      hour: '2-digit',
      minute: '2-digit',
      // second: '2-digit'
    };
    const formattedDate = date.toLocaleDateString('th-TH', options);
    return formattedDate;
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


  filteringWorkSheetBySeller(seller) {
    this.currentSeller = seller.value;
    this.currentStatus = 'ทั้งหมด';
    this.filteringWorkSheet('seller');
  }

  filteringWorkSheet(by) {
    let filterWorkSheet = [];
    filterWorkSheet = this.workSheet.filter(workSheet => this.currentStatus === 'ทั้งหมด' ? true : workSheet.status === this.currentStatus);
    filterWorkSheet = filterWorkSheet.filter(workSheet => this.currentSeller === 'ทั้งหมด' ? true : workSheet.seller_name === this.currentSeller);
    filterWorkSheet = filterWorkSheet.filter(workSheet => this.currentGraphic === 'ทั้งหมด' ? true : workSheet.design_by === this.currentGraphic);
    this.filterWorkSheet = filterWorkSheet;
    // console.log('by', by);
    if (by !== 'status') {
      this.countStatuses(this.filterWorkSheet);
    }
  }

  countStatuses(workSheets) {
    const counts = workSheets.reduce(
      (acc, workSheet) => {
        acc.total++;
        switch (workSheet.status) {
          case 'รอออกแบบ':
            acc.pending++;
            break;
          case 'กำลังออกแบบ':
            acc.working++;
            break;
          case 'รอคอนเฟิร์มแบบ':
            acc.confirming++;
            break;
          case 'คอนเฟิร์มแล้ว':
            acc.confirmed++;
            break;
          case 'รอผลิต':
            acc.inProduction++;
            break;
          case 'กำลังผลิต':
            acc.workingInProduction++;
            break;
          case 'รอส่งมอบ':
            acc.inDelivery++;
            break;
          case 'ส่งมอบแล้ว':
            acc.delivered++;
            break;
        }
        return acc;
      },
      {
        total: 0,
        pending: 0,
        working: 0,
        confirming: 0,
        confirmed: 0,
        inProduction: 0,
        workingInProduction: 0,
        inDelivery: 0,
        delivered: 0
      }
    );
    this.statusCount = counts;
    this.serviceService.dismissLoading();
  }

  filteringWorkSheetByGraphic(graphic) {
    this.currentGraphic = graphic.value;
    this.currentStatus = 'ทั้งหมด';
    this.filteringWorkSheet('graphic');
  }

  onWorkSheetSearchChange(event) {
    this.currentSearch = event;
    this.filterWorkSheet = this.workSheet.filter(workSheet => workSheet.serial_number.toLowerCase().includes(this.currentSearch.toLowerCase()) ||
      workSheet.customer_name.toLowerCase().includes(this.currentSearch.toLowerCase()));
  }

  filteringWorkSheetByStatus(status) {
    switch (status) {
      case 'total':
        this.currentStatus = 'ทั้งหมด';
        break;
      case 'pending':
        this.currentStatus = 'รอออกแบบ';
        break;
      case 'working':
        this.currentStatus = 'กำลังออกแบบ';
        break;
      case 'confirming':
        this.currentStatus = 'รอคอนเฟิร์มแบบ';
        break;
      case 'confirmed':
        this.currentStatus = 'คอนเฟิร์มแล้ว';
        break;
      case 'inProduction':
        this.currentStatus = 'รอผลิต';
        break;
      case 'workingInProduction':
        this.currentStatus = 'กำลังผลิต';
        break;
      case 'inDelivery':
        this.currentStatus = 'รอส่งมอบ';
        break;
      case 'delivered':
        this.currentStatus = 'ส่งมอบแล้ว';
        break;
      default:
        this.currentStatus = 'ทั้งหมด';
        break;
    }
    this.filteringWorkSheet('status');
  }

  statusName(status) {
    switch (status) {
      case 'total':
        return 'ทั้งหมด';
      case 'pending':
        return 'รอออกแบบ';
      case 'working':
        return 'กำลังออกแบบ';
      case 'confirming':
        return 'รอคอนเฟิร์มแบบ';
      case 'confirmed':
        return 'คอนเฟิร์มแล้ว';
      case 'inProduction':
        return 'รอผลิต';
      case 'workingInProduction':
        return 'กำลังผลิต';
      case 'inDelivery':
        return 'รอส่งมอบ';
      case 'delivered':
        return 'ส่งมอบแล้ว';
      default:
        return status;
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

  selectClass(status) {
    let color = '';
    this.statuses.forEach((s) => {
      if (s.value === status) {
        color = s.class;
      }
    });
    return color;
  }
}
