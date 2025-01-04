import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Timestamp } from 'firebase/firestore';
import { JobInfoComponent } from 'src/app/components/modals/job-info/job-info.component';
import { FirestoreService } from 'src/app/services/firestore.service';

@Component({
  selector: 'app-site-history',
  templateUrl: './site-history.component.html',
  styleUrls: ['./site-history.component.scss'],
})
export class SiteHistoryComponent implements OnInit {
  @Input() site: any;
  data = []
  jobs = []
  subscription: any
  constructor(
    private firestoreService: FirestoreService,
    private modalController: ModalController
  ) { }

  ngOnInit() {
    this.subscription = this.firestoreService.jobOnSiteChange.subscribe((data) => {
      this.data = data
      this.jobs = data;
      this.sortJobs()
    })
    this.firestoreService.fetchDataJobOnSite(this.site)
  }

  ngOnDestroy() {
    this.subscription.unsubscribe()
  }

  handleInput(event) {
    const query = event.target.value.toLowerCase();
    this.jobs = this.data.filter((d) => d.address.toLowerCase().indexOf(query) > -1 || d.phone.toLowerCase().indexOf(query) > -1 );
    this.sortJobs()
  }

  sortJobs() {
    this.jobs.sort((a, b) => {
      return b.book.date.seconds - a.book.date.seconds
    })
  }

  formatTime(timestamp: Timestamp) {
    const date = new Date(timestamp.seconds * 1000);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    const formattedDate = date.toLocaleDateString('th-TH', options);
    return formattedDate;
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
}
