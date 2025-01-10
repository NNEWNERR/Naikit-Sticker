import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import { Amphures } from 'src/app/common/constant/thai-data/thai_amphures';
import { Geographies } from 'src/app/common/constant/thai-data/thai_geographies';
import { Provinces } from 'src/app/common/constant/thai-data/thai_provinces';
import { Tambons } from 'src/app/common/constant/thai-data/thai_tambons';
import { CreateWorkSheetComponent } from 'src/app/pages/create-work-sheet/create-work-sheet.component';
import { JobInfoComponent } from 'src/app/components/modals/job-info/job-info.component';
import { db } from 'src/app/services/firebase-config';
import { FirestoreService } from 'src/app/services/firestore.service';
import { ServiceService } from 'src/app/services/service.service';
import { EditWorkSheetComponent } from '../edit-work-sheet/edit-work-sheet.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  param_id = this.route.snapshot.queryParamMap.get('job_id');
  sites = [];
  jobPending = [];
  jobBooked = [];
  jobCompleted = [];
  jobRejectedCanceled = [];
  workSheets = [];
  workSheetForAdmin = [];
  workSheetForSeller = [];
  workSheetForGraphic = [];
  workSheetForProduction = [];
  segment = 'seller';
  segment_option = [
    {
      title: 'ฝ่ายขาย',
      value: 'seller'
    },
    {
      title: 'กราฟิก',
      value: 'graphic'
    },
    {
      title: 'ผลิต',
      value: 'production'
    },
    {
      title: 'ยกเลิกแล้ว',
      value: 'rejected-canceled'
    }
  ]
  constructor(
    private route: ActivatedRoute,
    private firestoreService: FirestoreService,
    private service: ServiceService,
    private modalController: ModalController
  ) { }

  async ngOnInit() {
    this.firestoreService.fetchWorkSheet();
    this.firestoreService.fetchWorkSheetForAdmin();
    this.firestoreService.fetchWorkSheetForSeller();
    this.firestoreService.fetchWorkSheetForGraphic();
    this.firestoreService.fetchWorkSheetForProduction();
    this.firestoreService.fetchDataSite('1');
    this.firestoreService.sitesChange.subscribe(sites => {
      this.sites = sites;
    })
    this.firestoreService.workSheetChange.subscribe((data) => {
      this.workSheets = data;
      this.sortWorkSheet(this.workSheets);
    })
    this.firestoreService.workSheetForAdminChange.subscribe((data) => {
      this.workSheetForAdmin = data;
      this.sortWorkSheet(this.workSheetForAdmin);
    })
    this.firestoreService.workSheetForSellerChange.subscribe((data) => {
      this.workSheetForSeller = data;
      this.sortWorkSheet(this.workSheetForSeller);
    })
    this.firestoreService.workSheetForGraphicChange.subscribe((data) => {
      this.workSheetForGraphic = data;
      this.sortWorkSheet(this.workSheetForGraphic);
    })
    this.firestoreService.workSheetForProductionChange.subscribe((data) => {
      this.workSheetForProduction = data;
      this.sortWorkSheet(this.workSheetForProduction);
    })
  }

  ngOnDestroy() {
    this.firestoreService.unsubscribeSubscriptions()
  }

  acceptJob(job) {
    const docRef = doc(db, 'jobs', job.key);
    const data = {
      status: 'BOOKED',
    }
    this.service.showAlert('ยืนยัน', 'ยืนยันการรับงาน', () => {
      this.firestoreService.updateDatatoFirebase(docRef, data)
    }, { confirmOnly: false });
  }



  completeJob(job) {
    const docRef = doc(db, 'jobs', job.key);
    const data = {
      status: 'COMPLETED',
    }
    this.service.showAlert('ยืนยัน', 'ยืนยันการส่งงาน', () => {
      this.firestoreService.updateDatatoFirebase(docRef, data)
    }, { confirmOnly: false });
  }

  cancelJob(job) {
    const docRef = doc(db, 'jobs', job.key);
    const data = {
      status: 'CANCELED',
    }
    this.service.showAlert('ยืนยัน', 'ยืนยันการยกเลิกงาน', () => {
      this.firestoreService.updateDatatoFirebase(docRef, data)
    }, { confirmOnly: false });
  }

  rejectJob(job) {
    const docRef = doc(db, 'jobs', job.key);
    const data = {
      status: 'REJECTED',
    }
    this.service.showAlert('ยืนยัน', 'ยืนยันการปฏิเสธงาน', () => {
      this.firestoreService.updateDatatoFirebase(docRef, data)
    }, { confirmOnly: false });
  }

  reportJob(job) {
    // this.firestoreService.reportJob(job);
  }

  infoJob(job) {
    this.modalController.create({
      component: JobInfoComponent,
      componentProps: {
        job: job
      },
      cssClass: 'my-custom-class',
    }).then(modal => modal.present());
  }

  openJob(job) {
    // this.firestoreService.openJob(job);
  }

  segmentChanged(event) {
    this.segment = event.target.value;
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

  sortJobs(jobs) {
    jobs.sort((a, b) => {
      if (a.book.date.seconds < b.book.date.seconds) {
        return -1
      } else if (a.book.date.seconds > b.book.date.seconds) {
        return 1
      } else {
        if (a.book.time[0] < b.book.time[0]) {
          return -1
        } else if (a.book.time[0] > b.book.time[0]) {
          return 1
        } else {
          return 0
        }
      }
    })
  }

  getSiteName(site_id: string) {
    const site = this.sites.find(site => site.site_id === site_id);
    return site ? site.name : '';
  }

  createWorkSheet() {
    this.modalController.create({
      component: CreateWorkSheetComponent,
      // componentProps: {
      //   job: job
      // },
      cssClass: 'my-custom-class',
    }).then(modal => modal.present());
  }

  sortWorkSheet(workSheets) {
    workSheets.sort((a, b) => {
      if (a.is_urgent) {
        return -1
      } else if (b.is_urgent) {
        return 1
      } else {
        if (a.date_of_acceptance < b.date_of_acceptance) {
          return -1
        } else if (a.date_of_acceptance > b.date_of_acceptance) {
          return 1
        } else {
          return 0
        }
      }
    })
  }

  editWorkSheet(workSheet) {
    this.modalController.create({
      component: EditWorkSheetComponent,
      componentProps: {
        workSheet: workSheet
      },
      cssClass: 'my-custom-class',
    }).then(modal => modal.present());
  }

  modifyWorkSheet(workSheet) {
    const docRef = doc(db, 'jobs', workSheet.key);
    const data = {
      status: 'กำลังออกแบบ',
      modify: workSheet.modify + 1
    }
    this.firestoreService.updateDatatoFirebase(docRef, data);
  }

  confirmWorkSheet(workSheet) {
    const docRef = doc(db, 'jobs', workSheet.key);
    const data = {
      status: 'คอนเฟิร์มแล้ว',
      confirm_date: new Date(),
    }
    this.firestoreService.updateDatatoFirebase(docRef, data);
  }

  deliverWorkSheet(workSheet) {
    const docRef = doc(db, 'jobs', workSheet.key);
    const data = {
      status: 'ส่งมอบแล้ว',
      date_of_completion: new Date(),
    }
    this.firestoreService.updateDatatoFirebase(docRef, data);
  }

  acceptWorkSheet(workSheet) {
    const docRef = doc(db, 'jobs', workSheet.key);
    const data = {
      status: 'กำลังออกแบบ',
      design_date: new Date(),
    }
    this.firestoreService.updateDatatoFirebase(docRef, data);
  }

  offerWorkSheet(workSheet) {
    const docRef = doc(db, 'jobs', workSheet.key);
    const data = {
      status: 'รอคอนเฟิร์มแบบ',
      date_of_submission: new Date(),
    }
    this.firestoreService.updateDatatoFirebase(docRef, data);
  }

  sendProductionWorkSheet(workSheet) {
    const docRef = doc(db, 'jobs', workSheet.key);
    const data = {
      status: 'รอผลิต',
      date_of_submission: new Date(),
    }
    this.firestoreService.updateDatatoFirebase(docRef, data);
  }

  workSheetInfo(workSheet) {
    this.modalController.create({
      component: EditWorkSheetComponent,
      componentProps: {
        workSheet: workSheet
      },
      cssClass: 'my-custom-class',
    }).then(modal => modal.present());
  }
}
