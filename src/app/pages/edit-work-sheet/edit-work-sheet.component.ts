import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { collection, doc } from 'firebase/firestore';
import { db } from 'src/app/services/firebase-config';
import { FirestoreService } from 'src/app/services/firestore.service';

import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-edit-work-sheet',
  templateUrl: './edit-work-sheet.component.html',
  styleUrls: ['./edit-work-sheet.component.scss'],
})
export class EditWorkSheetComponent implements OnInit {
  @Input() workSheet: any;
  form: FormGroup;
  type = "vinyl";
  types = [
    {
      title: 'ไวนิล',
      value: 'vinyl',
      disabled: false
    },
    {
      title: 'สติกเกอร์',
      value: 'sticker',
      disabled: false
    },
    {
      title: 'ฉลาก',
      value: 'label',
      disabled: false
    },
    {
      title: 'นามบัตร',
      value: 'card',
      disabled: false
    },
    {
      title: 'ใบปลิว',
      value: 'plow',
      disabled: false
    },
    {
      title: 'กล่องไฟ',
      value: 'light_box',
      disabled: false
    },
    {
      title: 'พลาสวูด',
      value: 'plastic',
      disabled: false
    },
    {
      title: 'ตรายาง',
      value: 'tarp',
      disabled: false
    }
  ]

  contacts = [
    {
      title: 'หน้าร้าน',
      value: 'front',
      disabled: false
    },
    {
      title: 'โทรศัพท์',
      value: 'phone',
      disabled: false
    },
    {
      title: 'เฟสบุ๊ค',
      value: 'facebook',
      disabled: false
    },
    {
      title: 'ไลน์',
      value: 'line',
      disabled: false
    },
    {
      title: 'อีเมล',
      value: 'email',
      disabled: false
    }
  ]

  // contacts = ['หน้าร้าน', 'โทรศัพท์', 'เฟสบุ๊ค', 'ไลน์', 'อีเมล']
  // sellers = นาเดียร์ แมว น้ำ ซัง ซิน
  // designers = ฟลุ๊ค ไนซ์ เลย์ เอก เยาว์
  // printers = ฟลุ๊ค ไนซ์ เลย์ เอก เยาว์ นิว ซี ฮอล อัน ดาว(พ) เลย์(ช)

  sellers = [
    {
      title: 'admin',
      value: 'admin',
      disabled: false
    },
    {
      title: 'นาเดียร์',
      value: 'นาเดียร์',
      disabled: false
    },
    {
      title: 'แมว',
      value: 'แมว',
      disabled: false
    },
    {
      title: 'น้ำ',
      value: 'น้ำ',
      disabled: false
    },
    {
      title: 'ซัง',
      value: 'ซัง',
      disabled: false
    },
    {
      title: 'ซิน',
      value: 'ซิน',
      disabled: false
    }
  ]

  payments = [
    {
      title: 'เงินสด',
      value: 'เงินสด',
      disabled: false
    },
    {
      title: 'โอน',
      value: 'โอน',
      disabled: false
    },
    {
      title: 'เช็ค',
      value: 'เช็ค',
      disabled: false
    },
    {
      title: 'เครดิต',
      value: 'เครดิต',
      disabled: false
    },
    {
      title: 'อื่นๆ',
      value: 'อื่นๆ',
      disabled: false
    },
  ]

  designers = [
    {
      title: 'admin',
      value: 'admin',
      disabled: false
    },
    {
      title: 'ฟลุ๊ค',
      value: 'ฟลุ๊ค',
      disabled: false
    },
    {
      title: 'ไนซ์',
      value: 'ไนซ์',
      disabled: false
    },
    {
      title: 'เลย์',
      value: 'เลย์',
      disabled: false
    },
    {
      title: 'เอก',
      value: 'เอก',
      disabled: false
    },
    {
      title: 'เยาว์',
      value: 'เยาว์',
      disabled: false
    }
  ]

  is_ergents = [
    {
      title: 'ไม่ด่วน',
      value: 'ไม่ด่วน',
      disabled: false
    },
    {
      title: 'ด่วน',
      value: 'ด่วน',
      disabled: false
    }
  ]

  printers = [
    {
      title: 'admin',
      value: 'admin',
      disabled: false
    },
    {
      title: 'ฟลุ๊ค',
      value: 'ฟลุ๊ค',
      disabled: false
    },
    {
      title: 'ไนซ์',
      value: 'ไนซ์',
      disabled: false
    },
    {
      title: 'เลย์',
      value: 'เลย์',
      disabled: false
    },
    {
      title: 'เอก',
      value: 'เอก',
      disabled: false
    },
    {
      title: 'เยาว์',
      value: 'เยาว์',
      disabled: false
    },
    {
      title: 'นิว',
      value: 'นิว',
      disabled: false
    },
    {
      title: 'ซี',
      value: 'ซี',
      disabled: false
    },
    {
      title: 'อัน',
      value: 'อัน',
      disabled: false
    },
    {
      title: 'ดาว',
      value: 'ดาว',
      disabled: false
    },
    {
      title: 'เลย์(ช)',
      value: 'เลย์(ช)',
      disabled: false
    }
  ]
  // รอออกแบบ กำลังออกแบบ รอคอนเฟิร์มแบบ คอนเฟิร์มแล้ว รอผลิต กำลังผลิต รอส่งมอบ ส่งมอบแล้ว
  statuses = [
    {
      title: 'รอออกแบบ',
      value: 'รอออกแบบ',
      disabled: false
    },
    {
      title: 'กำลังออกแบบ',
      value: 'กำลังออกแบบ',
      disabled: false
    },
    {
      title: 'รอคอนเฟิร์มแบบ',
      value: 'รอคอนเฟิร์มแบบ',
      disabled: false
    },
    {
      title: 'คอนเฟิร์มแล้ว',
      value: 'คอนเฟิร์มแล้ว',
      disabled: false
    },
    {
      title: 'รอผลิต',
      value: 'รอผลิต',
      disabled: false
    },
    {
      title: 'กำลังผลิต',
      value: 'กำลังผลิต',
      disabled: false
    },
    {
      title: 'รอส่งมอบ',
      value: 'รอส่งมอบ',
      disabled: false
    },
    {
      title: 'ส่งมอบแล้ว',
      value: 'ส่งมอบแล้ว',
      disabled: false
    }
  ]

  constructor(
    private firestoreService: FirestoreService,
    private modalController: ModalController,
    private fb: FormBuilder
  ) { }

  ngOnInit() {
    // console.log(this.workSheet);

    this.initForm();
  }

  initForm() {
    this.form = this.fb.group({
      reference: [this.workSheet.serial_number],
      contact: [this.workSheet.contact ? this.contacts.find(c => c.value === this.workSheet.contact) || '' : ''],
      name: [this.workSheet.customer_name],
      phone: [this.workSheet.phone],
      line: [this.workSheet.line_name],
      seller: [this.workSheet.seller_name ? this.sellers.find(s => s.value === this.workSheet.seller_name) || '' : ''],
      total: [this.workSheet.payment.total],
      deposit: [this.workSheet.payment.deposit],
      payment: [this.workSheet.payment.payment_method ? this.payments.find(p => p.value === this.workSheet.payment.payment_method) || '' : ''],
      date_of_acceptance: [this.workSheet.date_of_acceptance ? new Date(this.workSheet.date_of_acceptance.seconds * 1000).toISOString().split('T')[0] : ''],
      designer: [this.workSheet.design_by ? this.designers.find(d => d.value === this.workSheet.design_by) || '' : ''],
      date_of_submission: [this.workSheet.date_of_submission ? new Date(this.workSheet.date_of_submission.seconds * 1000).toISOString().split('T')[0] : ''],
      printer: [this.workSheet.print_by ? this.printers.find(p => p.value === this.workSheet.print_by) || '' : ''],
      print_date: [this.workSheet.print_date ? new Date(this.workSheet.print_date.seconds * 1000).toISOString().split('T')[0] : ''],
      remark: [this.workSheet.remark],
      is_urgent: [this.workSheet.is_urgent == true ? this.is_ergents.find(p => p.value === 'ด่วน') || '' : this.is_ergents.find(p => p.value === 'ไม่ด่วน') || ''],
      status: [this.workSheet.status ? this.statuses.find(s => s.value === this.workSheet.status) || '' : ''],
    })
    // console.log(this.form.value);

  }
  onSubmit() {
    if (this.form.valid) {
      // console.log(this.form.value);
      // const date = new Date();
      // const newDate = new Date(date.setDate(date.getDate() + 1));
      const total = this.form.value.total
      const deposit = this.form.value.deposit
      const remaining = total - deposit
      const data = {
        // id: uuidv4(),  // รหัสงาน
        serial_number: this.form.value.reference || "", // หมายเลขงาน
        contact: this.form.value.contact.value || "", // ช่องทางการติดต่อ
        customer_name: this.form.value.name || "", // ชื่อลูกค้า
        phone: this.form.value.phone || "",  // เบอร์โทร 
        line_name: this.form.value.line || "", // ชื่อผู้ติดต่อ
        // created_at: new Date(),  // วันที่สร้าง
        // created_by: "admin",  // ผู้สร้าง
        seller_name: this.form.value.seller.value || "", // ชื่อผู้ขาย
        // work: [
          // {
          //   id: uuidv4(),
          //   type: "ไวนิล",  // ชนิดงาน
          //   height: "300", // ความสูง
          //   width: "800",  // ความกว้าง
          //   unit_of_length: "cm.",  // หน่วย
          //   option: "ตาไก่",  // หมวดหมู่
          //   quantity: 2,  // จํานวน
          //   total: 500,  // ราคาต่อหน่วย
          // },
          // {
          //   id: uuidv4(),
          //   type: "สตก.",  // ชนิดงาน
          //   height: "30", // ความสูง
          //   width: "80",  // ความกว้าง
          //   unit_of_length: "cm.",  // หน่วย
          //   option: "ติดฟิว",  // หมวดหมู่
          //   quantity: 2,  // จํานวน
          //   total: 500,  // ราคาต่อหน่วย
          // },
        // ],
        // other: "",  // งานอื่นๆ
        payment: {
          total: total,  // ราคารวม
          deposit: deposit,   // เงินมัดจำ
          // date_of_payment: new Date(),   // วันที่ชําระ
          payment_method: this.form.value.payment.value || "",  // วิธีการชําระ
          remaining: remaining || "",  // คงเหลือ
        },
        status: this.form.value.status.value || "",
        remark: this.form.value.remark || "",  // หมายเหตุ 
        design_by: this.form.value.designer.value || "",  // ผู้ออกแบบ 
        // design_date: "",  // วันที่รับแบบ
        // confirm_by: "",  // ผู้อนุมัติ
        // confirm_date: "",  // วันที่อนุมัติ
        // modify: 0,
        print_by: this.form.value.printer.value || "", // ผู้พิมพ์
        print_date: this.form.value.print_date ? new Date(this.form.value.print_date) : "", // วันที่พิมพ์
        is_urgent: this.form.value.is_urgent.value == 'ด่วน' ? true : false,  // เป็นงานด่วน
        date_of_acceptance: this.form.value.date_of_acceptance ? new Date(this.form.value.date_of_acceptance) : "", // วันที่รับงาน
        date_of_submission: this.form.value.date_of_submission ? new Date(this.form.value.date_of_submission) : "", // วันที่ส่งแบบ
        // date_of_completion: "", // วันที่ส่งมอบงาน
      }
      // console.log(data);
      const docRef = doc(db, "jobs", this.workSheet.key);
      this.firestoreService.updateDatatoFirebase(docRef, data).then(() => {
        this.modalController.dismiss();
        this.form.reset();
      }).catch((error) => {
        // console.log(error);
      })
    }
  }
  close() {
    this.modalController.dismiss();
  }
}
