import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { getColor } from 'src/app/data/interfaces/color';
import { db } from 'src/app/services/firebase-config';
import { FirestoreService } from 'src/app/services/firestore.service';
import { ServiceService } from 'src/app/services/service.service';

import { v4 as uuidv4 } from 'uuid';
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
  @Input() job: any
  site_job: any
  has_date = false;
  jobs: any[] = []
  title: string
  form: FormGroup
  sites: any[] = []
  colors: any[] = []
  date = new Date();
  types: any[] = [
    {
      title: 'ล้าง',
      value: 'ล้าง',
      disabled: false
    },
    {
      title: 'ตัดล้าง',
      value: 'ตัดล้าง',
      disabled: false
    },
    {
      title: 'ติดตั้ง',
      value: 'ติดตั้ง',
      disabled: false
    },
    {
      title: 'ซ่อม',
      value: 'ซ่อม',
      disabled: false
    },
    {
      title: 'อื่นๆ',
      value: 'อื่นๆ',
      disabled: false
    }
  ]

  statuses: any[] = [
    {
      title: 'รออนุมัติ',
      value: 'PENDING',
      disabled: false
    },
    {
      title: 'รอดำเนินงาน',
      value: 'BOOKED',
      disabled: false
    },
    {
      title: 'สําเร็จ',
      value: 'COMPLETED',
      disabled: false
    },
    {
      title: 'ปฏิเสธ',
      value: 'REJECTED',
      disabled: false
    },
    {
      title: 'ยกเลิก',
      value: 'CANCELED',
      disabled: false
    },
    {
      title: 'หมดอายุ',
      value: 'EXPIRED',
      disabled: false
    },
  ]

  times: any[] = [
    {
      title: '9.00',
      value: '9.00',
      disabled: false
    },
    {
      title: '10.00',
      value: '10.00',
      disabled: false
    },
    {
      title: '11.00',
      value: '11.00',
      disabled: false
    },
    {
      title: '12.00',
      value: '12.00',
      disabled: false
    },
    {
      title: '13.00',
      value: '13.00',
      disabled: false
    },
    {
      title: '14.00',
      value: '14.00',
      disabled: false
    },
    {
      title: '15.00',
      value: '15.00',
      disabled: false
    },
    {
      title: '16.00',
      value: '16.00',
      disabled: false
    },
  ]

  constructor(
    private firestoreService: FirestoreService,
    private modalController: ModalController,
    private formBuilder: FormBuilder,
    private service: ServiceService
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
        this.setSite();
        this.initFormGroup();
        break;
      case 'job':
        this.title = 'แก้ไขงาน';
        this.initFormJob();
        this.initForEditJob(this.job);
        // this.searchJobs();
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
      // user_id: [''],
      // project_id: [''],
      // group_id: ['']
    })
  }

  initFormSite() {
    this.form = this.formBuilder.group({
      name: [this.site.name, Validators.required],
      // site_id: [''],
      // project_id: [''],
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
      // image: [''],
      // group_id: [''],
      // project_id: [''],
      // site_groups: ['']
    })
  }
  //this.txn.prefix_local ? this.prefixOptions.find(e => e.value === this.txn.prefix_local) || '' : this.txn.ocr_online.FullNameTH ? this.txn.ocr_online.FullNameTH.split(' ')[0] : ''],
  initFormJob() {
    this.form = this.formBuilder.group({
      date: [this.has_date ? this.form.value.date : new Date(this.job.book.date.seconds * 1000), Validators.required],
      time: [this.has_date ? this.form.value.time : this.times.find(time => time.title === this.job.book.time[0]), Validators.required],
      address: [this.job.address, Validators.required],
      phone: [this.job.phone, Validators.required],
      qty: [this.job.qty, Validators.required],
      type: [this.job.type ? this.types.find(type => type.value === this.job.type) || '' : '', Validators.required],
      type_other: [this.job.type_other || ''],
      created_by: [this.job.created_by || ''],
      status: [this.job.status ? this.statuses.find(type => type.value === this.job.status) || '' : '', Validators.required],
      remark: [this.job.remark],
    })
  }

  async initForEditJob(job) {
    this.service.presentLoadingWithOutTime("รอสักครู่...")
    this.initDate()
    // this.initTimes();
    const siteRef = collection(db, "sites");
    const q1 = query(siteRef, where("id", "==", job.site_id));
    await getDocs(q1).then((querySnapshot) => {
      querySnapshot.forEach((site) => {
        this.site_job = site.data()
      });
      this.service.dismissLoading()
    })
    const groupRef = collection(db, "groups");
    const q2 = query(groupRef, where("id", "==", job.group_id));
    await getDocs(q2).then((querySnapshot) => {
      querySnapshot.forEach((group) => {
        this.group = group.data()
        this.service.dismissLoading()
      })
      this.service.dismissLoading()
    })
    this.searchJobs()
  }

  async searchJobs() {
    // this.form.patchValue({
    //   time: ''
    // })
    // this.setJob();
    const date = new Date(this.form.value.date).setHours(0, 0, 0, 0);
    const formatDate = new Date(date);
    formatDate.setDate(formatDate.getDate());
    this.jobs = await this.firestoreService.customerFetchDataJob(formatDate, this.job);
    if (this.jobs.length > 0) {
      this.updateTimes();
    } else {
      this.setJob();
    }
  }

  updateTimes() {
    if (this.has_date) { this.setJob(); }
    this.jobs.forEach((job: any) => {
      job.book.time.forEach((time: string) => {
        const timeOption = this.times.find((t: any) => t.title === time && t.value !== this.job.book.time[0]);
        if (timeOption && job.group_id === this.group.id) {
          timeOption.count++;
          timeOption.title = timeOption.count >= this.group.limit ? timeOption.title + ' (มีคิวแล้ว)' : timeOption.title
          timeOption.disabled = timeOption.count >= this.group.limit;
        }
        const siteTimeOption = this.times.find((t: any) => t.title === time && job.site_id === this.job.site_id && t.value !== this.job.book.time[0]);
        if (siteTimeOption) {
          siteTimeOption.title = siteTimeOption.title + ' (มีคิวแล้ว)'
          siteTimeOption.disabled = true;
        }
        this.has_date = true
        this.initFormJob();
      });
    });
  }

  timeChange() {
  }

  initDate() {
    this.date = new Date();
  }

  dateChange() {
  }

  dismiss() {
    this.modalController.dismiss()
  }

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
      case 'job':
        this.editJob();
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
      // user_id: uuidv4(),
      // project_id: this.firestoreService.user[0].project_id,
      group_id: '',
    }
    this.firestoreService.updateDatatoFirebase(collectionRef, data).then(() => {
      this.dismiss()
    })
  }

  editSite() {
    const collectionRef = doc(db, "sites", this.site.key);
    const data = {
      name: this.form.value.name,
      is_enabled: true,
      // site_id: uuidv4(),
      // project_id: this.firestoreService.user[0].project_id,
      group_id: this.form.value.group_id,
    }
    this.firestoreService.updateDatatoFirebase(collectionRef, data).then(() => {
      this.dismiss()
    })
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
      // image: this.form.value.image,
      // project_id: this.firestoreService.user[0].project_id,
    }
    this.firestoreService.updateDatatoFirebase(collectionRef, data).then(() => {
      this.form.value.site_groups.forEach((site) => {
        const docRef = doc(db, "sites", site.key);
        const data = {
          group_id: this.group.id,
        }
        this.firestoreService.updateDatatoFirebase(docRef, data)
      })
    }).catch((error) => {
      console.error(error);
    }).finally(() => {
      this.dismiss()
    });
  }

  editJob() {
    const collectionRef = doc(db, "jobs", this.job.key);
    const time = this.form.value.time.title;
    const hour = time.split(".")[0];
    const date = new Date(this.form.value.date).setHours(hour, 0, 0, 0);
    const formatDate = new Date(date);
    formatDate.setDate(formatDate.getDate());
    const data = {
      book: { time: [time], date: formatDate },
      address: this.form.value.address,
      phone: this.form.value.phone,
      type: this.form.value.type.title,
      type_other: this.form.value.type.title == 'อื่นๆ' ? this.form.value.type_other : '',
      qty: this.form.value.qty,
      status: this.form.value.status.value,
      remark: this.form.value.remark,
    }
    this.firestoreService.updateDatatoFirebase(collectionRef, data).then(() => {
      this.dismiss()
    })
  }

  setColor() {
    const colors = getColor()
    colors.forEach((color) => {
      this.colors = [{ title: color.split('-')[1], value: color, disbled: false }, ...this.colors]
      this.colors.sort((a, b) => a.title.localeCompare(b.title))
    })
  }

  async setSite() {
    const sites = this.firestoreService.getSites()
    this.sites = sites.map((site) => {
      return { title: site.name, value: site.site_id, disbled: false, key: site.key }
    })
    this.sites.sort((a, b) => a.title.localeCompare(b.title));

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

  cancelJob(job) {
    const docRef = doc(db, 'jobs', job.key);
    const data = {
      status: 'CANCELED',
    }
    this.service.showAlert('ยืนยัน', 'ยืนยันการยกเลิกงาน', () => {
      this.firestoreService.updateDatatoFirebase(docRef, data)
    }, { confirmOnly: false }).then((result) => {
      if (result) {
        this.dismiss();
      }
    });
  }

  rejectJob(job) {
    const docRef = doc(db, 'jobs', job.key);
    const data = {
      status: 'REJECTED',
    }
    this.service.showAlert('ยืนยัน', 'ยืนยันการปฏิเสธงาน', () => {
      this.firestoreService.updateDatatoFirebase(docRef, data)
    }, { confirmOnly: false });
  }
  setJob() {
    this.times = [
      // {
      //   title: '8.00',
      //   count: 0,
      //   disabled: false,
      // },
      {
        title: '9.00',
        count: 0,
        disabled: false,
      },
      {
        title: '10.00',
        count: 0,
        disabled: false,
      },
      {
        title: '11.00',
        count: 0,
        disabled: false,
      },
      {
        title: '12.00',
        count: 0,
        disabled: false,
      },
      {
        title: '13.00',
        count: 0,
        disabled: false,
      },
      {
        title: '14.00',
        count: 0,
        disabled: false,
      },
      {
        title: '15.00',
        count: 0,
        disabled: false,
      },
      {
        title: '16.00',
        count: 0,
        disabled: false,
      },
    ]
  }
  initTimes() {
    this.times = [
      // {
      //   title: '8.00',
      //   count: 0,
      //   disabled: true,
      // },
      {
        title: '9.00',
        count: 0,
        disabled: true,
      },
      {
        title: '10.00',
        count: 0,
        disabled: true,
      },
      {
        title: '11.00',
        count: 0,
        disabled: true,
      },
      {
        title: '12.00',
        count: 0,
        disabled: true,
      },
      {
        title: '13.00',
        count: 0,
        disabled: true,
      },
      {
        title: '14.00',
        count: 0,
        disabled: true,
      },
      {
        title: '15.00',
        count: 0,
        disabled: true,
      },
      {
        title: '16.00',
        count: 0,
        disabled: true,
      },
    ]
  }
}
