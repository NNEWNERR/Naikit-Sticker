import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AddJobComponent } from 'src/app/pages/work-group/add-job/add-job.component';
import { FirestoreService } from 'src/app/services/firestore.service';
import { JobsListComponent } from '../jobs-list/jobs-list.component';
import { SettingEditComponent } from 'src/app/components/modals/setting-edit/setting-edit.component';

@Component({
  selector: 'app-work-group',
  templateUrl: './work-group.component.html',
  styleUrls: ['./work-group.component.scss'],
})
export class WorkGroupComponent implements OnInit {
  groups: any = [];
  teams = []

  constructor(
    private firestoreService: FirestoreService,
    private modalController: ModalController,
    private router: Router
  ) { }

  ngOnInit() {
    const interval = setInterval(() => {
      if (this.groups.length > 0) {
        clearInterval(interval);
      } else {
        this.getGroups();
      }
    }, 1000)

    // this.firestoreService.groupsChange.subscribe(groups => {
    //   this.getGroups()
    // })
  }

  editTeam(group) {
  }

  showTeamDetail(team) {
  }

  addTeam() {
    this.teams.push({
      group_id: 7,
      site_id: 1,
      title: 'team 7',
      subtitle: 'ผู้รับผิดชอบ',
      description: 'คอนโด 1,คอนโด 2,คอนโด 3,คอนโด 4',
      img: 'https://ionicframework.com/docs/img/demos/card-media.png',
      url: '/krungthon/home'
    });
  }

  getGroups() {
    this.groups = this.firestoreService.getGroups();
  }

  // openModalAddGroup(){
  //   this.modalController.create({
  //     component: AddGroupComponent,
  //     cssClass: 'my-custom-class',
  //   }).then(modal => modal.present());
  // }

  openModalAddJob(group) {
    this.modalController.create({
      component: AddJobComponent,
      cssClass: 'my-custom-class',
      componentProps: {
        group: group
      }
    }).then(modal => modal.present());
  }

  // openModalAddGroup() {
  //   this.modalController.create({
  //     component: AddGroupComponent,
  //     cssClass: 'my-custom-class',
  //     componentProps: {
  //     }
  //   }).then(modal => modal.present());
  // }

  async jobsList(group) {
    await this.firestoreService.fetchDataJobByGroup(group).then((jobs) => {
      this.modalController.create({
        component: JobsListComponent,
        cssClass: 'my-custom-class',
        componentProps: {
          jobs: jobs
        }
      }).then(modal => modal.present());
    });
  }

  edit(group) {
    this.modalController.create({
      component: SettingEditComponent,
      componentProps: {
        type: 'group',
        group: group
      },
      cssClass: 'my-custom-class',
    }).then(async modal => {
      await modal.present()
      await modal.onDidDismiss().then(() => {
        // this.firestoreService.fetchDataGroup(this.firestoreService.user[0].project_id).then((groups) => {
        this.getGroups();
        // })
      });
    });
  }

  bookingPage(site) {
    this.router.navigate(['booking', site.key], {
      queryParams: {
        is_admin: 'true'
      }
    })
  }
}
