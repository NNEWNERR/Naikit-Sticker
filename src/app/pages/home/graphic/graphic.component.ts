import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { doc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from 'src/app/services/firebase-config';
import { FirestoreService } from 'src/app/services/firestore.service';
import { StorageService } from 'src/app/services/storage.service';
import { CreateWorkSheetComponent } from '../../create-work-sheet/create-work-sheet.component';
import { DragAndDropFileComponent } from '../../drag-and-drop-file/drag-and-drop-file.component';
import { EditWorkSheetComponent } from '../../edit-work-sheet/edit-work-sheet.component';

import { v4 as uuidv4 } from 'uuid';
import { SEGMENT_OPTION, STATUS_OPTION, SELLER_OPTION, DESIGNER_OPTION } from 'src/app/data/data';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SelectGraphicComponent } from '../../graphic/graphic.component';
@Component({
  selector: 'app-graphic',
  templateUrl: './graphic.component.html',
  styleUrls: ['./graphic.component.scss'],
})
export class GraphicComponent implements OnInit {
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

  constructor(
    private firestoreService: FirestoreService,
    private modalController: ModalController,
    private storageService: StorageService,
    private formBuilder: FormBuilder
  ) { }

  get statusKeys() {
    return Object.keys(this.statusCount);
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
        return 'รอจัดส่ง';
      case 'delivered':
        return 'จัดส่งแล้ว';
      default:
        return status;
    }
  }

  ngOnInit() {
    this.firestoreService.unsubscribeSubscriptions()
    this.firestoreService.fetchWorkSheetForGraphic();
    this.initForm();
    this.firestoreService.workSheetForGraphicChange.subscribe((data) => {
      this.workSheet = data;
      this.filterWorkSheet = data;
      this.sortWorkSheet(this.workSheet);
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

  statusCount = {
    total: 0,
    pending: 0,
    working: 0,
    confirming: 0,
    confirmed: 0,
    //  inProduction: 0,
    //  workingInProduction: 0,
    //  inDelivery: 0,
    //  delivered: 0
  };

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
          case 'กําลังผลิต':
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
        //  inProduction: 0,
        //  workingInProduction: 0,
        //  inDelivery: 0,
        //  delivered: 0
      }
    );
    this.statusCount = counts;
  }

  initForm() {
    this.form = this.formBuilder.group({
      text_search: [''],
      status: [this.statuses ? this.statuses[0] : ''],
      seller: [this.sellers ? this.sellers[0] : ''],
      graphic: [this.designers ? this.designers[0] : '']
    })
  }

  createWorkSheet() {
    this.modalController.create({
      component: CreateWorkSheetComponent,
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
        this.currentStatus = 'กําลังผลิต';
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
    // // console.log('status', status.value);
    // this.currentStatus = status.value;
    this.filteringWorkSheet('status');
  }

  filteringWorkSheetBySeller(seller) {
    // console.log('seller', seller.value);
    this.currentSeller = seller.value;
    this.currentStatus = 'ทั้งหมด';
    this.filteringWorkSheet('seller');
  }

  filteringWorkSheetByGraphic(graphic) {
    // console.log('graphic', graphic.value);
    this.currentGraphic = graphic.value;
    this.currentStatus = 'ทั้งหมด';
    this.filteringWorkSheet('graphic');
  }

  filteringWorkSheet(by) {
    let filterWorkSheet = [];
    // console.log('currentStatus', this.currentStatus);
    // console.log('currentSeller', this.currentSeller);
    // console.log('currentGraphic', this.currentGraphic);

    filterWorkSheet = this.workSheet.filter(workSheet => this.currentStatus === 'ทั้งหมด' ? true : workSheet.status === this.currentStatus);
    filterWorkSheet = filterWorkSheet.filter(workSheet => this.currentSeller === 'ทั้งหมด' ? true : workSheet.seller_name === this.currentSeller);
    filterWorkSheet = filterWorkSheet.filter(workSheet => this.currentGraphic === 'ทั้งหมด' ? true : workSheet.design_by === this.currentGraphic);
    this.filterWorkSheet = filterWorkSheet;
    if (by !== 'status') {
      this.countStatuses(this.filterWorkSheet);
    }
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
            let format_date = date.getFullYear().toString();
            imagePath = `images/${format_date}/${workSheet.serial_number}/${workSheet.customer_name}_${file.name}`;
            imageUrl = await this.storageService.uploadImage(file, imagePath);
            imageUrls.push(imageUrl);
          }
          // console.log('Image uploaded successfully');
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

  onWorkSheetSearchChange(event) {
    console.log('event', event);
    this.currentSearch = event;
    this.filterWorkSheet = this.workSheet.filter(workSheet => workSheet.serial_number.toLowerCase().includes(this.currentSearch.toLowerCase()) ||
      workSheet.customer_name.toLowerCase().includes(this.currentSearch.toLowerCase()));
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
}
