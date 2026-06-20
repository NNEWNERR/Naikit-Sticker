import { group } from '@angular/animations';
import { Component, OnInit } from '@angular/core';
import { ModalController } from 'src/app/services/modal.service';
import { SettingAddComponent } from 'src/app/components/modals/setting-add/setting-add.component';
import { SettingEditComponent } from 'src/app/components/modals/setting-edit/setting-edit.component';
import { FirestoreService } from 'src/app/services/firestore.service';
import { ServiceService } from 'src/app/services/service.service';

@Component({
  selector: 'app-group',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.scss'],
})
export class GroupComponent implements OnInit {
  search: any
  public data = [];
  public results = [...this.data];

  constructor(
    private serviceService: ServiceService,
    private modalController: ModalController,
    private firestoreService: FirestoreService
  ) { }

  ngOnInit() {
    // groups collection removed in v2 — page kept for routing compat only
    this.data = [];
    this.results = [];
  }

  closeModal() {
    this.modalController.dismiss();
  }

  handleInput(query: string) {
    const q = (query || '').toLowerCase();
    this.results = this.data.filter((d) => (d.name || '').toLowerCase().indexOf(q) > -1);
  }

  onActivate(event) {
    if (event.type === "click") {
      // console.log(event.row)
    }
  }

  add() {
    this.modalController.create({
      component: SettingAddComponent,
      cssClass: 'my-custom-class',
      componentProps: {
        type: 'group'
      }
    }).then(modal => modal.present());
  }

  edit(group) {
    this.modalController.create({
      component: SettingEditComponent,
      componentProps: {
        type: 'group',
        group: group
      },
      cssClass: 'my-custom-class',
    }).then(modal => modal.present());
  }
}
