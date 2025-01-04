import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { collection, query, where } from 'firebase/firestore';
import { db } from 'src/app/services/firebase-config';
import { FirestoreService } from 'src/app/services/firestore.service';
import { ServiceService } from 'src/app/services/service.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-add-job',
  templateUrl: './add-job.component.html',
  styleUrls: ['./add-job.component.scss'],
})
export class AddJobComponent implements OnInit {
  @Input() group: any;
  sites = [];
  jobs = [];
  times = []
  form: FormGroup
  minDate = new Date();
  maxDate = new Date();
  date = new Date();
  prevTime;
  subscriptionTime;
  types = [
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
  constructor(
    private firestoreService: FirestoreService,
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private service: ServiceService
  ) { }

  ngOnInit() {
    this.initDate()
    this.initForm();
    this.initSites();
    this.initTimes();
  }

  ngDestroy() {
    this.subscriptionTime.unsubscribe();
  }

  initDate() {
    this.date = new Date();
    this.minDate = new Date();
    this.maxDate.setDate(this.minDate.getDate() + 30);
  }
  initSites() {
    this.sites = this.group.site_groups.site.map((site: any) => {
      return {
        ...site,
        title: site.name,
        value: site.site_id,
        disabled: true
      }
    })
  }

  setSites() {
    this.sites = this.group.site_groups.site.map((site: any) => {
      return {
        ...site,
        title: site.name,
        value: site.site_id,
        disabled: false
      }
    })
  }

  initForm() {
    this.form = this.formBuilder.group({
      start_time: ['', Validators.required],
      time: ['', Validators.required],
      site: ['', Validators.required],
      address: ['', Validators.required],
      type: ['', Validators.required],
      phone: ['', Validators.required],
      type_other: [''],
      qty: [1, Validators.required],
      remark: [''],
    })
    if (this.subscriptionTime) {
      this.subscriptionTime.unsubscribe();
    }
    this.prevTime = this.form.value.time
    this.subscriptionTime = this.form.valueChanges.subscribe((res) => {
      if (this.prevTime != res.time) {
        this.timeChange();
        this.prevTime = res.time;
      }
    });
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

  updateTimes() {
    this.jobs.filter((job: any) => {
      if (job.book.time) {
        job.book.time.forEach((time: any) => {
          this.times.filter((data: any) => {
            if (data.title === time && this.group.id === job.group_id) {
              data.count++;
              // if (data.count >= 2) {
              if (data.count >= this.group.limit) {
                data.disabled = true;
              }
            }
          })
        });
      }
    })
  }


  timeChange() {
    this.setSites();
    this.jobs.filter((job: any) => {
      if (job.book.time) {
        job.book.time.forEach((time: any) => {
          if (time === this.form.value.time.title && this.group.id === job.group_id) {
            this.sites.filter((site: any) => {
              if (site.site_id === job.site_id) {
                site.disabled = true;
              }
            })
          }
        })
      }
    })
  }

  async searchJobs() {
    this.setJob();
    const date = new Date(this.form.value.start_time);
    date.setDate(date.getDate());
    this.jobs = await this.firestoreService.fetchDataJob(date);
    if (this.jobs.length > 0) {
      this.updateTimes();
    } else {
      this.setJob();
      this.form.patchValue({ time: '' });
      this.prevTime = this.form.value.time;
    }
  }

  submit() {
    const time = this.form.value.time.title;
    const hour = time.split(".")[0];
    const collectionRef = collection(db, "jobs");
    // const address = ["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10"];
    // const querydate = new Date(this.form.value.start_time).setHours(0, 0, 0, 0);
    // const formatQueryDate = new Date(querydate);
    // formatQueryDate.setDate(formatQueryDate.getDate());
    // const nextDay = new Date(formatQueryDate);
    // nextDay.setDate(formatQueryDate.getDate() + 1);
    // const q = query(collectionRef,
    //   where("group_id", "==", this.group.id),
    //   // where("site_id", "==", site_id),
    //   where("book.date", ">", formatQueryDate),
    //   where("book.date", "<", nextDay),
    //   where("book.time", "array-contains", time),
    // );
    const date = new Date(this.form.value.start_time).setHours(hour, 0, 0, 0);
    const formatDate = new Date(date);
    formatDate.setDate(formatDate.getDate());
    const data = {
      // book: { time: this.form.value.qty > 1 ? this.qtyMoreThanOne(this.form.value.qty) : [time], date: formatDate },
      book: { time: [time], date: formatDate },
      group_id: this.group.id,
      job_id: uuidv4(),
      project_id: this.group.project_id,
      address: this.form.value.address,
      site_id: this.form.value.site.value,
      type: this.form.value.type.title,
      phone: this.form.value.phone,
      remark: this.form.value.remark,
      qty: this.form.value.qty,
      status: 'BOOKED',
      created_at: new Date(),
      updated_at: new Date(),
    }
    this.firestoreService.addDatatoFirebase(collectionRef, data).then(() => {
      this.service.showAlert('Success', 'เพิ่มงานสําเร็จ', () => { }, { confirmOnly: true })
      this.closeModal();
    }).catch((error) => {
      this.service.showAlert('ไม่สามารถเพิ่มงานได้', error.message, () => { }, { confirmOnly: true })
      console.error(error);
    });
  }

  qtyMoreThanOne(qty) {
    let times = []
    let time = this.form.value.time.title.split(".")[0]
    time = parseInt(time)
    for (let i = 0; i < qty; i++) {
      if (time + i < 17) {
        times.push(`${time + i}.00`);
      }
    }
    return times
  }

  closeModal() {
    this.modalController.dismiss();
  }
}
