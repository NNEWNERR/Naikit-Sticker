import { initializeApp } from 'firebase/app';
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { v4 as uuidv4 } from 'uuid';
import { FirestoreService } from 'src/app/services/firestore.service';
import { db } from 'src/app/services/firebase-config';
import { collection, doc } from 'firebase/firestore';
import { getColor } from 'src/app/data/interfaces/color';
@Component({
  selector: 'app-setting-add',
  templateUrl: './setting-add.component.html',
  styleUrls: ['./setting-add.component.scss'],
})
export class SettingAddComponent implements OnInit {
  @Input() type: string
  title: string
  form: FormGroup
  sites: any[] = []
  colors: any[] = []

  constructor(
    private firestoreService: FirestoreService,
    private modalController: ModalController,
    private formBuilder: FormBuilder,
  ) { }

  ngOnInit() {
    this.initialize()
  }

  initialize() {
    switch (this.type) {
      case 'user':
        this.title = 'เพิ่มผู้ใช้';
        this.initFormUser();
        break;
      case 'site':
        this.title = 'เพิ่มโครงการ';
        this.initFormSite();
        break;
      case 'group':
        this.title = 'เพิ่มกลุ่ม';
        this.setColor();
        this.setSite();
        this.initFormGroup();
        break;
      default:
        break;
    }
  }

  initFormUser() {
    this.form = this.formBuilder.group({
      name: ['', Validators.required],
      last_name: ['', Validators.required],
      nick_name: ['', Validators.required],
      phone: ['', Validators.required],
      user_id: [''],
      project_id: [''],
      group_id: ['']
    })
  }

  initFormSite() {
    this.form = this.formBuilder.group({
      name: ['', Validators.required],
      site_id: [''],
      project_id: [''],
      group_id: ['']
    })
  }

  initFormGroup() {
    this.form = this.formBuilder.group({
      name: ['', Validators.required],
      reader: [''],
      limit: [''],
      color: [''],
      image: [''],
      group_id: [''],
      project_id: [''],
      site_groups: ['']
    })
  }

  dismiss() {
    this.modalController.dismiss()
  }

  submit() {
    switch (this.type) {
      case 'user':
        this.addUser();
        break;
      case 'site':
        this.addSite();
        break;
      case 'group':
        this.addGroup();
        break;
      default:
        break;
    }
  }

  addUser() {
    const collectionRef = collection(db, "users");
    const data = {
      name: this.form.value.name,
      last_name: this.form.value.last_name,
      nick_name: this.form.value.nick_name,
      phone: this.form.value.phone,
      user_id: uuidv4(),
      project_id: this.firestoreService.user[0].project_id,
      group_id: '',
    }
    this.firestoreService.addDatatoFirebase(collectionRef, data).then(() => {
      this.dismiss()
    })
  }

  addSite() {
    const collectionRef = collection(db, "sites");
    const data = {
      name: this.form.value.name,
      site_id: uuidv4(),
      project_id: this.firestoreService.user[0].project_id,
      group_id: '',
    }
    this.firestoreService.addDatatoFirebase(collectionRef, data).then(() => {
      this.dismiss()
    })
  }

  addGroup() {
    const group_id = uuidv4();
    const site_id = []
    this.form.value.site_groups.forEach((site) => {
      site_id.push(site.value)
    })
    const collectionRef = collection(db, "groups");
    const data = {
      name: this.form.value.name,
      reader: this.form.value.reader,
      limit: this.form.value.limit,
      color: this.form.value.color.value,
      image: this.form.value.image,
      site_groups: { site_id: site_id },
      id: group_id,
      project_id: this.firestoreService.user[0].project_id,
    }
    this.firestoreService.addDatatoFirebase(collectionRef, data).then(() => {
      this.form.value.site_groups.forEach((site) => {
        const docRef = doc(db, "sites", site.key);
        const data = {
          group_id: group_id,
        }
        this.firestoreService.updateDatatoFirebase(docRef, data)
      })
    }).catch((error) => {
      console.error(error);
    }).finally(() => {
      this.dismiss()
    });
  }

  setColor() {
    const colors = getColor()
    colors.forEach((color) => {
      this.colors = [{ title: color.split('-')[1], value: color, disbled: false }, ...this.colors]
      this.colors.sort((a, b) => a.title.localeCompare(b.title))
    })
  }

  async setSite() {
    const sites = await this.firestoreService.fetchDataSiteNoGroup();
    this.sites = sites.map((site) => {
      return { title: site.name, value: site.site_id, disbled: false, key: site.key }
    })
    this.sites.sort((a, b) => a.title.localeCompare(b.title));
  }
}
