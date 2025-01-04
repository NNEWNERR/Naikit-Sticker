import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Timestamp } from 'firebase/firestore';
import { SettingAddComponent } from 'src/app/components/modals/setting-add/setting-add.component';
import { SettingEditComponent } from 'src/app/components/modals/setting-edit/setting-edit.component';
import { FirestoreService } from 'src/app/services/firestore.service';
import { ServiceService } from 'src/app/services/service.service';

@Component({
  selector: 'app-job',
  templateUrl: './job.component.html',
  styleUrls: ['./job.component.scss'],
})
export class JobComponent implements OnInit {
  search: any
  public data = [];
  public results = [...this.data];

  subscription;

  constructor(
    private serviceService: ServiceService,
    private modalController: ModalController,
    private firestoreService: FirestoreService
  ) { }

  ngOnInit() {
    this.subscription = this.firestoreService.allJobsChange.subscribe(allJobs => {
      this.data = allJobs;
      this.results = [...this.data];
      this.serviceService.dismissLoading();
    })
    const allJobs = this.firestoreService.allJobs;
    if (allJobs.length > 0) {
      this.data = allJobs
      this.results = [...this.data];
    } else {
      this.serviceService.presentLoadingWithOutTime('กําลังโหลดข้อมูล...');
      this.firestoreService.fetchDataAllJob(this.firestoreService.user[0].project_id)
    }

    // this.serviceService.presentLoadingWithOutTime('กําลังโหลดข้อมูล...');
    // const interval = setInterval(() => {
    //   if (this.firestoreService.user.length > 0) {
    //     clearInterval(interval);
    //     this.firestoreService.fetchDataAllJob(this.firestoreService.user[0].project_id)
    //   }
    // }, 1000);
    // this.subscription = this.firestoreService.allJobsChange.subscribe(Jobs => {
    //   this.serviceService.dismissLoading();
    //   this.data = Jobs;
    //   this.results = [...this.data];
    // })
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  closeModal() {
    this.modalController.dismiss();
  }

  handleInput(event) {
    const query = event.target.value.toLowerCase();
    this.results = this.data.filter((d) => d.address.toLowerCase().indexOf(query) > -1 || d.phone.toLowerCase().indexOf(query) > -1 || this.formatTime(d.book.date).toLowerCase().indexOf(query) > -1);
  }

  onActivate(event) {
    if (event.type === "click") {
      console.log(event.row)
    }
  }

  add() {
    this.modalController.create({
      component: SettingAddComponent,
      cssClass: 'my-custom-class',
    }).then(modal => modal.present());
  }

  edit(job) {
    this.modalController.create({
      component: SettingEditComponent,
      componentProps: {
        type: 'job',
        job: job
      },
      cssClass: 'my-custom-class',
    }).then(modal => modal.present());
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
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    const formattedDate = date.toLocaleDateString('th-TH', options);
    return formattedDate;
  }
}
