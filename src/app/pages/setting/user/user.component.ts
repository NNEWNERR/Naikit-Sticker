import { ServiceService } from './../../../services/service.service';
import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { SettingAddComponent } from 'src/app/components/modals/setting-add/setting-add.component';
import { SettingEditComponent } from 'src/app/components/modals/setting-edit/setting-edit.component';
import { FirestoreService } from 'src/app/services/firestore.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss'],
})
export class UserComponent implements OnInit {
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
    this.subscription = this.firestoreService.allUsersChange.subscribe(allUsers => {
      this.data = allUsers;
      this.results = [...this.data];
      this.serviceService.dismissLoading();
    })
    const allUsers = this.firestoreService.allUsers;
    if (allUsers.length > 0) {
      this.data = allUsers
      this.results = [...this.data];
    } else {
      this.serviceService.presentLoadingWithOutTime('กําลังโหลดข้อมูล...');
      this.firestoreService.fetchDataAllUser(this.firestoreService.user[0].project_id)
    }


    // this.serviceService.presentLoadingWithOutTime('กําลังโหลดข้อมูล...');
    // const interval = setInterval(() => {
    //   if (this.firestoreService.user.length > 0) {
    //     clearInterval(interval);
    //     this.firestoreService.fetchDataAllUser(this.firestoreService.user[0].project_id)
    //   }
    // }, 1000);
    // this.subscription = this.firestoreService.allUsersChange.subscribe(users => {
    //   this.serviceService.dismissLoading();
    //   this.data = users;
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
    this.results = this.data.filter((d) => d.name.toLowerCase().indexOf(query) > -1 || d.phone.toLowerCase().indexOf(query) > -1);
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
      componentProps: {
        type: 'user'
      }
    }).then(modal => modal.present());
  }

  edit(user) {
    this.modalController.create({
      component: SettingEditComponent,
      componentProps: {
        type: 'user',
        user: user
      },
      cssClass: 'my-custom-class',
    }).then(modal => modal.present());
  }
}
