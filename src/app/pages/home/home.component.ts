import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { Timestamp, arrayUnion, doc, getDoc } from 'firebase/firestore';
import { Amphures } from 'src/app/common/constant/thai-data/thai_amphures';
import { Geographies } from 'src/app/common/constant/thai-data/thai_geographies';
import { Provinces } from 'src/app/common/constant/thai-data/thai_provinces';
import { Tambons } from 'src/app/common/constant/thai-data/thai_tambons';
import { CreateWorkSheetComponent } from 'src/app/pages/create-work-sheet/create-work-sheet.component';
import { db } from 'src/app/services/firebase-config';
import { FirestoreService } from 'src/app/services/firestore.service';
import { ServiceService } from 'src/app/services/service.service';
import { EditWorkSheetComponent } from '../edit-work-sheet/edit-work-sheet.component';
import { SelectGraphicComponent } from '../graphic/graphic.component';
import { DragAndDropFileComponent } from '../drag-and-drop-file/drag-and-drop-file.component';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from 'src/app/services/storage.service';
import { SEGMENT_OPTION, STATUS_OPTION, SELLER_OPTION, DESIGNER_OPTION } from 'src/app/data/data';

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
  filterWorkSheetForSeller = [];
  workSheetForGraphic = [];
  filterWorkSheetForGraphic = [];
  workSheetForProduction = [];
  segment = 'seller';
  segment_option = SEGMENT_OPTION;
  statuses = STATUS_OPTION;
  sellers = SELLER_OPTION;
  designers = DESIGNER_OPTION;
  constructor(
    private route: ActivatedRoute,
    private firestoreService: FirestoreService,
    private service: ServiceService,
    private modalController: ModalController,
    private storageService: StorageService
  ) { }

  async ngOnInit() {
    
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

  openJob(job) {
    // this.firestoreService.openJob(job);
  }

  segmentChanged(event) {
    this.segment = event.target.value;
    // console.log(this.segment);
    
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

  currentStatusForSeller = 'ทั้งหมด';
  currentSellerForSeller = 'ทั้งหมด';
  currentGraphicForSeller = 'ทั้งหมด';
  currentStatusForGraphic = 'ทั้งหมด';
  currentSellerForGraphic = 'ทั้งหมด';
  currentGraphicForGraphic = 'ทั้งหมด';
  filteringWorkSheetForSellerByStatus(status) {
    this.currentStatusForSeller = status;
    this.filteringWorkSheetForSeller();
  }

  filteringWorkSheetForSellerBySeller(seller) {
    this.currentSellerForSeller = seller;
    this.filteringWorkSheetForSeller();
  }

  filteringWorkSheetForSellerByGraphic(graphic) {
    this.currentGraphicForSeller = graphic;
    this.filteringWorkSheetForSeller();
  }

  filteringWorkSheetForSeller() {
    let filterWorkSheetForSeller = [];
    filterWorkSheetForSeller = this.workSheetForSeller.filter(workSheet => this.currentStatusForSeller === 'ทั้งหมด' ? true : workSheet.status === this.currentStatusForSeller);
    filterWorkSheetForSeller = filterWorkSheetForSeller.filter(workSheet => this.currentSellerForSeller === 'ทั้งหมด' ? true : workSheet.seller_name === this.currentSellerForSeller);
    filterWorkSheetForSeller = filterWorkSheetForSeller.filter(workSheet => this.currentGraphicForSeller === 'ทั้งหมด' ? true : workSheet.design_by === this.currentGraphicForSeller);
    this.filterWorkSheetForSeller = filterWorkSheetForSeller;
  }


  filteringWorkSheetForGraphicByStatus(status) {
    this.currentStatusForGraphic = status
    this.filteringWorkSheetForGraphic()
  }

  filteringWorkSheetForGraphicByGraphic(graphic) {
    this.currentGraphicForGraphic = graphic;
    this.filteringWorkSheetForGraphic()
  }

  filteringWorkSheetForGraphicBySeller(seller) {
    this.currentSellerForGraphic = seller;
    this.filteringWorkSheetForGraphic()
  }

  filteringWorkSheetForGraphic() {
    let filterWorkSheetForGraphic = [];
    filterWorkSheetForGraphic = this.workSheetForGraphic.filter(workSheet => this.currentStatusForGraphic === 'ทั้งหมด' ? true : workSheet.status === this.currentStatusForGraphic);
    filterWorkSheetForGraphic = filterWorkSheetForGraphic.filter(workSheet => this.currentGraphicForGraphic === 'ทั้งหมด' ? true : workSheet.design_by === this.currentGraphicForGraphic);
    filterWorkSheetForGraphic = filterWorkSheetForGraphic.filter(workSheet => this.currentSellerForGraphic === 'ทั้งหมด' ? true : workSheet.seller_name === this.currentSellerForGraphic);
    this.filterWorkSheetForGraphic = filterWorkSheetForGraphic;
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

  async acceptWorkSheet(workSheet) {
    const modal = await this.modalController.create({
      component: SelectGraphicComponent,
      cssClass: 'my-custom-class',
    })
    await modal.present()
    const { role, data } = await modal.onWillDismiss();
    // console.log(role, data);
    if (role === 'confirm') {
      const docRef = doc(db, 'jobs', workSheet.key);
      const update = {
        status: 'กำลังออกแบบ',
        design_by: data,
        design_date: new Date(),
      }
      this.firestoreService.updateDatatoFirebase(docRef, update);
    }
    // const docRef = doc(db, 'jobs', workSheet.key);
    // const data = {
    //   status: 'กำลังออกแบบ',
    //   design_date: new Date(),
    // }
    // this.firestoreService.updateDatatoFirebase(docRef, data);
  }

  async offerWorkSheet(workSheet) {
    const modal = await this.modalController.create({
      component: DragAndDropFileComponent,
      cssClass: 'my-custom-class',
    })
    await modal.present()
    const { role, data } = await modal.onWillDismiss();
    // console.log(role, data);
    if (role === 'confirm') {
      const files = data;
      let imagePath = '';
      let imageUrl = '';
      let imageUrls = [];
      if (files) {
        try {
          for (const file of files) {
            let date = new Date();
            // 2025
            let format_date = date.getFullYear().toString();
            imagePath = `images/${format_date}/${workSheet.serial_number}/${workSheet.customer_name}_${file.name}`;
            imageUrl = await this.storageService.uploadImage(file, imagePath);
            imageUrls.push(imageUrl);
          }
          // console.log('Image uploaded successfully');
          // create id for image
          let images = [];
          if (imageUrls.length > 0) {
            images = imageUrls.map((url) => {
              return {
                id: uuidv4(),
                url: url,
                date: new Date()
              }
            })
          }
          const docRef = doc(db, 'jobs', workSheet.key);
          const update = {
            status: 'รอคอนเฟิร์มแบบ',
            date_of_submission: new Date(),
            images: images.length > 0 ? arrayUnion(...images) : []
          }
          this.firestoreService.updateDatatoFirebase(docRef, update);
        } catch (error) {
          console.error('failed:', error);
        }
      }

    }
    // const docRef = doc(db, 'jobs', workSheet.key);
    // const data = {
    //   status: 'รอคอนเฟิร์มแบบ',
    //   date_of_submission: new Date(),
    // }
    // this.firestoreService.updateDatatoFirebase(docRef, data);
  }

  sendProductionWorkSheet(workSheet) {
    const docRef = doc(db, 'jobs', workSheet.key);
    const data = {
      status: 'รอผลิต',
      date_of_submission: new Date(),
    }
    this.firestoreService.updateDatatoFirebase(docRef, data);
  }

  productingWorkSheet(workSheet) {
    const docRef = doc(db, 'jobs', workSheet.key);
    const data = {
      status: 'กําลังผลิต',
    }
    this.firestoreService.updateDatatoFirebase(docRef, data);
  }

  FinishProductWorkSheet(workSheet) {
    const docRef = doc(db, 'jobs', workSheet.key);
    const data = {
      status: 'รอส่งมอบ',
      print_date: new Date(),
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

  currentSearchForSeller = '';
  currentSearchForGraphic = '';
  onWorkSheetForSellerSearchChange(event) {
    this.currentSearchForSeller = event.detail.value;
    this.filterWorkSheetForSeller = this.workSheetForSeller.filter(workSheet => workSheet.serial_number.toLowerCase().includes(this.currentSearchForSeller.toLowerCase()));
  }

  onWorkSheetForGraphicSearchChange(event) {
    this.currentSearchForGraphic = event.detail.value;
    this.filterWorkSheetForGraphic = this.workSheetForGraphic.filter(workSheet => workSheet.serial_number.toLowerCase().includes(this.currentSearchForGraphic.toLowerCase()));
  }
}
