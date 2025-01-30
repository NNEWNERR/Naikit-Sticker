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
        console.log(res);
        this.workSheets = res;
      })
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
}
