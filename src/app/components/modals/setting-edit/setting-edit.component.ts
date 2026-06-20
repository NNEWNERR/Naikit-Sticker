import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ModalController } from 'src/app/services/modal.service';
import { doc } from 'firebase/firestore';
import { getColor } from 'src/app/data/interfaces/color';
import { db } from 'src/app/services/firebase-config';
import { FirestoreService } from 'src/app/services/firestore.service';

@Component({
  selector: 'app-setting-edit',
  templateUrl: './setting-edit.component.html',
  styleUrls: ['./setting-edit.component.scss'],
})
export class SettingEditComponent implements OnInit {
  @Input() type: string
  @Input() user: any
  @Input() site: any
  @Input() group: any
  title: string
  form: FormGroup
  sites: any[] = []
  colors: any[] = []
  date = new Date();

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
        this.title = 'แก้ไขกลุ่ม';
        this.setColor();
        this.initFormGroup();
        break;
      default:
        break;
    }
  }

  initFormUser() {
    this.form = this.formBuilder.group({
      name: [this.user.name, Validators.required],
      last_name: [this.user.last_name, Validators.required],
      nick_name: [this.user.nick_name || '', Validators.required],
      phone: [this.user.phone, Validators.required],
    })
  }

  initFormSite() {
    this.form = this.formBuilder.group({
      name: [this.site.name, Validators.required],
      group_id: [this.site.group_id],
    })
  }

  initFormGroup() {
    this.form = this.formBuilder.group({
      name: [this.group.name, Validators.required],
      reader: [this.group.reader],
      limit: [this.group.limit],
      color: [this.group.color ? this.colors.find(color => color.value === this.group.color) || '' : ''],
      site_groups: [this.group.site_groups ? this.sites.filter(site => this.group.site_groups.site_id.includes(site.value)) || '' : [], Validators.required],
    })
  }

  dismiss() {
    this.modalController.dismiss()
  }

  closeModal() { this.modalController.dismiss(); }

  submit() {
    switch (this.type) {
      case 'user':
        this.editUser();
        break;
      case 'site':
        this.editSite();
        break;
      case 'group':
        this.editGroup();
        break;
      default:
        break;
    }
  }

  editUser() {
    const collectionRef = doc(db, "users", this.user.key);
    const data = {
      name: this.form.value.name,
      last_name: this.form.value.last_name,
      phone: this.form.value.phone,
      nick_name: this.form.value.nick_name,
      group_id: '',
    }
    this.firestoreService.updateDatatoFirebase(collectionRef, data)
      .then(() => this.dismiss())
      .catch((err) => console.error('[setting-edit] editUser failed', err));
  }

  editSite() {
    const collectionRef = doc(db, "sites", this.site.key);
    const data = {
      name: this.form.value.name,
      is_enabled: true,
      group_id: this.form.value.group_id,
    }
    this.firestoreService.updateDatatoFirebase(collectionRef, data)
      .then(() => this.dismiss())
      .catch((err) => console.error('[setting-edit] editSite failed', err));
  }

  editGroup() {
    const site_id = []
    this.form.value.site_groups.forEach((site) => {
      site_id.push(site.value)
    })
    const collectionRef = doc(db, "groups", this.group.key);
    const data = {
      name: this.form.value.name,
      reader: this.form.value.reader,
      limit: this.form.value.limit,
      color: this.form.value.color.value,
      site_groups: { site_id: site_id },
    }
    this.firestoreService.updateDatatoFirebase(collectionRef, data).then(() => {
      this.form.value.site_groups.forEach((site) => {
        const docRef = doc(db, "sites", site.key);
        const data = {
          group_id: this.group.id,
        }
        this.firestoreService.safeUpdate(docRef, data);
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

  addQty() {
    if (this.form.value.qty < 10) {
      this.form.patchValue({ qty: this.form.value.qty + 1 });
    }
  }

  subQty() {
    if (this.form.value.qty > 1) {
      this.form.patchValue({ qty: this.form.value.qty - 1 });
    }
  }
}
