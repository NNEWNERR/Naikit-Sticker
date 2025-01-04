import { Component, OnInit } from '@angular/core';
import { FirestoreService } from 'src/app/services/firestore.service';
import { SiteHistoryComponent } from './site-history/site-history.component';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
})
export class HistoryComponent implements OnInit {
  sites: any = [];
  constructor(
    private firestoreService: FirestoreService,
    private modalController: ModalController
  ) { }

  ngOnInit() {
    const interval = setInterval(() => {
      this.getSites().then(() => {
        if (this.sites.length > 0) {
          this.sortSites();
          clearInterval(interval);
        }
      })
    }, 500);
  }

  async getSites() {
    const sites = await this.firestoreService.getSites()
    if (sites.length > 0) {
      return this.sites = sites.filter((site: any) => site.group_id !== '');
    } else {
      return this.sites = [];
    }
  }

  sortSites() {
    this.sites.sort((a, b) => a.name.localeCompare(b.name)).sort((a, b) => a.group_id.localeCompare(b.group_id));
  }

  sitePage(site) {
    this.modalController.create({
      component: SiteHistoryComponent,
      componentProps: {
        site: site
      },
      cssClass: 'my-custom-class',
    }).then(modal => modal.present());
  }
}
