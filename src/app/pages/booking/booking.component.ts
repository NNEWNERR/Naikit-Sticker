import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, PopoverController } from '@ionic/angular';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { InvalidOTP, sendOTPverify, sendOTPverifyFail } from 'src/app/common/constant/alert-messages';
import { auth, db } from 'src/app/services/firebase-config';
import { FirestoreService } from 'src/app/services/firestore.service';
import { ServiceService } from 'src/app/services/service.service';

import { HttpClient } from '@angular/common/http';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { ContactComponent } from '../contact/contact.component';
import { AuthService } from 'src/app/services/auth.service';
@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.scss'],
})
export class BookingComponent implements OnInit {
  is_admin = this.route.snapshot.queryParamMap.get('is_admin');
  times: any
  site: any
  group: any
  jobs: any
  form: FormGroup
  date = new Date();
  minDate = new Date();
  maxDate = new Date();

  has_date = false
  has_time = false

  confirmationResult;

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
    private route: ActivatedRoute,
    private firestoreService: FirestoreService,
    private service: ServiceService,
    private fb: FormBuilder,
    private alertController: AlertController,
    private popoverController: PopoverController,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) { }

  async adminLogin() {
    const isLogedIn = await this.authService.SessionIsLogedIn();
    if (isLogedIn == true) {
      await this.authService.checkAuth().then((res) => {
        if (res == true) {
          const UserFormAuth = this.authService.getUserFormAuth();
          const phone = this.formatPhoneNumber(UserFormAuth.phoneNumber);
          this.firestoreService.fetchDataUser(phone)
        }
      });
    }
  }

  formatPhoneNumber(phoneNumber: any) {
    if (phoneNumber.length === 12 && phoneNumber.startsWith("+66")) {
      return "0" + phoneNumber.substring(3);
    } else if (phoneNumber.length === 10 && phoneNumber.startsWith("0")) {
      return phoneNumber;
    }
  }

  onInputPhone() {
    this.form.value.phone = this.form.value.phone.replace(/[^0-9]/g, '').replace(' ', '');
  }

  initDate() {
    this.date = new Date();
    this.minDate.setDate(this.date.getDate() + 0);
    this.maxDate.setDate(this.date.getDate() + 30);
  }
  initForm() {
    this.form = this.fb.group({
      start_time: ['', Validators.required],
      time: ['', Validators.required],
      address: ['', Validators.required],
      type: ['', Validators.required],
      phone: ['', Validators.required],
      type_other: [''],
      qty: [1, Validators.required],
      description: [''],
      remark: ['']
    })
  }

  ngOnInit() {
    this.service.presentLoadingWithOutTime("รอสักครู่...")
    if (this.is_admin == 'true') {
      this.adminLogin()
    }
    this.initForm()
    this.initDate()
    this.initTimes();
    this.route.params.subscribe(param => {
      const docRef = doc(db, "sites", param.id);
      getDoc(docRef).then((site) => {
        this.site = site.data()
        const groupRef = collection(db, "groups");
        const q = query(groupRef, where("id", "==", site.data().group_id));
        getDocs(q).then((querySnapshot) => {
          querySnapshot.forEach((group) => {
            this.group = group.data()
            // const jobRef = collection(db, "jobs");
            // const q = query(jobRef, where("site_id", "in", doc.data().site_groups.site_id));
            // const data = []
            // getDocs(q).then((querySnapshot) => {
            //   querySnapshot.forEach((doc) => {
            //     data.push({ ...doc.data() });
            //   });
            //   this.jobs = data
            // });
          });
          this.service.dismissLoading()
        })
      })
    })
  }

  async searchJobs() {
    this.has_date = true
    this.form.patchValue({
      time: ''
    })
    this.setJob();
    const date = new Date(this.form.value.start_time);
    date.setDate(date.getDate());
    this.jobs = await this.firestoreService.customerFetchDataJob(date, this.site);
    if (this.jobs.length > 0) {
      this.updateTimes();
    } else {
      this.setJob();
    }
  }

  updateTimes() {
    this.jobs.forEach((job: any) => {
      job.book.time.forEach((time: string) => {
        const timeOption = this.times.find((t: any) => t.title === time);
        if (timeOption && job.group_id === this.group.id) {
          timeOption.count++;
          timeOption.title = timeOption.count >= this.group.limit ? timeOption.title + ' (มีคิวแล้ว)' : timeOption.title
          timeOption.disabled = timeOption.count >= this.group.limit;
        }
        const siteTimeOption = this.times.find((t: any) => t.title === time && job.site_id === this.site.site_id);
        if (siteTimeOption) {
          siteTimeOption.title = siteTimeOption.title + ' (มีคิวแล้ว)'
          siteTimeOption.disabled = true;
        }
      });
    });
  }

  newSubmit() {
    // this.checkJobByPhone(this.form.value.phone).then((data) => {
    //   if (data.length > 0) {
    //     this.service.showAlert('ไม่สามารถเพิ่มงานได้', 'มีงานแล้ว', () => { }, { confirmOnly: true })
    //   } else {
    this.addJob();
    //     this.LoginWithPhone(this.form.value.phone);
    //   }
    // })
  }

  checkJobByPhone(phone) {
    const collectionRef = collection(db, "jobs");
    const q = query(collectionRef, where("phone", "==", phone), where("status", "==", 'PENDING'));
    const data = []
    return new Promise<any>((resolve) => {
      getDocs(q).then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          data.push({ ...doc.data() });
        });
        resolve(data)
      });
    })
  }

  LoginWithPhone(phone: string) {
    const { header, message } = sendOTPverify(phone);
    this.service.showAlert(header, message, () => {
      this.signInWithPhoneNumber(phone);
    }, { confirmOnly: false });
  }

  addJob() {
    this.service.presentLoadingWithOutTime("กำลังจอง...");
    const name = this.firestoreService.user.length > 0 ? this.firestoreService.user[0].nick_name : '';
    const time = this.form.value.time.title;
    const hour = time.split(".")[0];
    this.qtyMoreThanOne();
    const address = this.form.value.address;
    const addressUpperCase = address.toUpperCase();
    const collectionRef = collection(db, "jobs");
    const date = new Date(this.form.value.start_time).setHours(hour, 0, 0, 0);
    const formatDate = new Date(date);
    formatDate.setDate(formatDate.getDate());
    const data = {
      // book: { time: [time], date: formatDate },
      group_id: this.group.id,
      job_id: uuidv4(),
      project_id: this.group.project_id,
      address: addressUpperCase,
      site_id: this.site.site_id,
      type: this.form.value.type.title,
      type_other: this.form.value.type.title == 'อื่นๆ' ? this.form.value.type_other : '',
      qty: this.form.value.qty,
      phone: this.form.value.phone,
      remark: this.form.value.remark,
      status: this.is_admin == 'true' ? 'BOOKED' : 'PENDING',
      is_qrcode: this.is_admin == 'true' ? false : true,
      created_by: this.is_admin == 'true' ? name : 'คิวอาร์โค้ด',
      created_at: new Date(),
      updated_at: new Date(),
      book: { time: this.form.value.type.title === 'ตัดล้าง' ? this.typeBigClean() : [time], date: formatDate },
      // book: { time: this.form.value.qty > 1 ? this.qtyMoreThanOne() : [time], date: formatDate },
      // group_id: this.group.id,
      // job_id: uuidv4(),
      // project_id: this.group.project_id,
      // address: this.form.value.address,
      // site_id: this.site.site_id,
      // type: this.form.value.type.title,
      // phone: this.form.value.phone,
      // remark: this.form.value.remark,
      // status: 'PENDING',
      // created_at: new Date(),
      // updated_at: new Date(),
    }
    this.firestoreService.addDatatoFirebase(collectionRef, data).then(async (res) => {
      try {
//         await this.http.post('https://sendlinenotify-abewfqcbgq-uc.a.run.app', {
//           message: `${this.site.name}
// วันที่จอง : ${this.formatDateToThaiString(formatDate)} 
// บริการ : ${this.form.value.type.title} ${this.form.value.type.title == 'อื่นๆ' ? `(${this.form.value.type_other})` : ''}
// จํานวน : ${this.form.value.qty} ตัว 
// เบอร์โทร : ${this.form.value.phone}
// ที่อยู่/ห้อง : ${this.form.value.address}
// หมายเหตุ : ${this.form.value.remark || '-'}
// เพิ่มโดย : ${this.is_admin == 'true' ? name : 'คิวอาร์โค้ด'}
// https://krungthon-air.web.app/krungthon/job-schedule?job_id=${res.id}`,
//           stickerPackageId: 6632,
//           stickerId: 11825396
//         }).subscribe(async (res) => {
          this.form.patchValue({
            time: ''
          })
          this.has_date = false
          this.initForm();
          this.service.dismissLoading();
          // this.router.navigate(['booking-success']);
          // await this.service.showAlert('Success', 'จองคิวสําเร็จ', () => {
          //   window.location.reload();
          // }, { confirmOnly: true }).then(() => {
          //   setTimeout(() => {
          //     this.service.dismissLoading();
          //     window.location.reload();
          //   }, 3000);
          // })
        // })
      } catch (error) {
        this.service.dismissLoading();
        console.error(error);
      }
    }).catch((error) => {
      this.service.dismissLoading();
      this.service.showAlert('ไม่สามารถเพิ่มงานได้', error.message, () => { }, { confirmOnly: true })
      console.error(error);
    });
  }

  async sendLineNotify() {
    try {
      this.http.post('https://sendlinenotify-cgzaerrvna-uc.a.run.app', {
        message: `test form booking`,
        stickerPackageId: 6632,
        stickerId: 11825396
      })
    } catch (error) {
      console.error(error.message);
    }
  }

  qtyMoreThanOne() {
    const qty = this.form.value.qty;
    let times = []
    let time = this.form.value.time.title.split(".")[0] // 8.00
    time = parseInt(time)
    for (let i = 0; i < qty; i++) {
      if (time + i < 17) {
        times.push(`${time + i}.00`);
      }
    }
    return times
  }

  typeBigClean() {
    let times = []
    let time = this.form.value.time.title.split(".")[0] // 8.00
    time = parseInt(time)
    for (let i = 0; i < 2; i++) {
      if (time + i < 17) {
        times.push(`${time + i}.00`);
      }
    }
    return times
  }
  setTimeByQty(qty) {
    let times = []
    let time = this.form.value.time.title.split(".")[0] // 8.00
    time = parseInt(time)
    for (let i = 0; i < qty; i++) {
      if (time + i < 18) {
        times.push(`${time + i}.00`);
      }
    }
    return times
  }
  // addQty() {
  //   const newQty = this.form.value.qty + 1;

  //   const newTimes = this.setTimeByQty(newQty);

  //   const overTime = newTimes.some(time => time === '17.00');

  //   if (!overTime) {

  //     const hasConflict = this.jobs.some(job => {
  //       if (job.book.time) {
  //         return job.book.time.some(time => newTimes.includes(time));
  //       }
  //       return false;
  //     });

  //     if (hasConflict) {
  //         this.service.showAlert('วันนี้มีงานอยู่', 'กรุณาเลือกวันอื่น', () => { }, { confirmOnly: true });
  //         return;
  //     }

  //     this.form.patchValue({ qty: newQty });
  //   } else {
  //     this.service.showAlert('ไม่สามารถเพิ่มได้', 'สูงกว่า 16.00 ไม่สามารถเพิ่มได้', () => { }, { confirmOnly: true });
  //   }
  // }

  addQty() {
    if (this.form.value.qty < 10) {
      this.form.patchValue({ qty: this.form.value.qty + 1 });
    }
  }

  addQtyByCondition() {
    const newQty = this.form.value.qty + 1;

    const newTimes = this.setTimeByQty(newQty);

    const overTime = newTimes.some(time => time === '17.00');

    if (!overTime) {

      let conflictCount = 0;
      let siteConflictCount = 0;

      this.jobs.forEach(job => {
        if (job.group_id === this.site.group_id) {
          const jobConflict = job.book.time.some(time => newTimes.includes(time));
          if (jobConflict) {
            conflictCount++;
          }
        }
        if (job.site_id === this.site.site_id) {
          const siteConflict = job.book.time.some(time => newTimes.includes(time));
          if (siteConflict) {
            siteConflictCount++;
          }
        }
      });

      if (siteConflictCount > 0) {
        this.service.showAlert('ไม่สามารถเพิ่มได้', `เวลา ${newTimes[newTimes.length - 1]} มีงานครบกําหนดในคอนโดแล้ว กรุณาเลือกวันหรือเวลาอื่น`, () => { }, { confirmOnly: true });
        return;
      }

      if (conflictCount >= this.group.limit) {
        this.service.showAlert('ไม่สามารถเพิ่มได้', `เวลา ${newTimes[newTimes.length - 1]} มีงานครบกําหนดในโซนแล้ว กรุณาเลือกวันหรือเวลาอื่น`, () => { }, { confirmOnly: true });
        return;
      }

      this.form.patchValue({ qty: newQty });
    } else {
      this.service.showAlert('ไม่สามารถเพิ่มได้', 'สูงกว่า 16.00 ไม่สามารถเพิ่มได้', () => { }, { confirmOnly: true });
    }
  }

  subQty() {
    if (this.form.value.qty > 1) {
      this.form.patchValue({ qty: this.form.value.qty - 1 });
    }
  }

  async signInWithPhoneNumber(phone: any) {
    this.service.presentLoadingWithOutTime("waiting...");
    const verifier = new RecaptchaVerifier(auth, 'sign-in-button', {
      size: 'invisible'
    });
    let tel = "+66" + phone.replace(/\D[^.]/g, '').slice(1);
    signInWithPhoneNumber(auth, tel, verifier).then((confirmationResult) => {
      this.confirmationResult = confirmationResult;
      this.service.dismissLoading();
      this.alertEnterOTP();
    }).catch((error) => {
      console.error(error);
      const { header, message } = sendOTPverifyFail();
      this.service.showAlert(header, message, () => {
        window.location.reload();
      }, { confirmOnly: true })
      this.service.dismissLoading();
    });
  }

  alertEnterOTP() {
    this.alertController.create({
      mode: 'ios',
      header: 'กรุณาใส่รหัส OTP',
      inputs: [
        {
          name: 'otp',
          type: 'text',
          cssClass: 'bg-transparent appearance-none border-2 border-gray-400 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-500',
          placeholder: 'กรุณาใส่รหัส OTP'
        }
      ],
      buttons: [
        {
          text: 'ยกเลิก',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {

          }
        }, {
          text: 'ตกลง',
          handler: (data) => {
            this.confirmOTP(data.otp);
          }
        }
      ]
    }).then(alert => {
      alert.present();
    });
  }

  // onSignInSubmit() {
  //   // Code to submit the verification code entered by the user
  // }

  confirmOTP(otp: string) {
    this.service.presentLoadingWithOutTime("waiting...");
    this.confirmationResult.confirm(otp).then(async (result: any) => {
      const user = result.user;
      localStorage.setItem('token', user.accessToken);
      // window.location.reload();
      this.addJob();
      this.service.dismissLoading();
    }).catch((error: any) => {
      this.service.dismissLoading();
      const { header, message } = InvalidOTP();
      this.service.showAlert(header, message, () => { }, { confirmOnly: true })
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

  formatDateToThaiString(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: 'numeric',
    };
    return date.toLocaleDateString('th-TH', options);
  }

  timeChange() {
    this.form.patchValue({ qty: 1 });
  }

  async presentPopover(e: Event) {
    const popover = await this.popoverController.create({
      component: ContactComponent,
      event: e,
    });

    await popover.present();

    const { role } = await popover.onDidDismiss();
  }

}
