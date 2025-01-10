import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { collection } from 'firebase/firestore';
import { db } from 'src/app/services/firebase-config';
import { v4 as uuidv4 } from 'uuid';
import { FirestoreService } from '../../services/firestore.service';

@Component({
  selector: 'app-create-work-sheet',
  templateUrl: './create-work-sheet.component.html',
  styleUrls: ['./create-work-sheet.component.scss'],
})
export class CreateWorkSheetComponent implements OnInit {

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
  // designers = ฟุ๊ก ไนซ์ เลย์ เอก เยาว์
  // printers = ฟุ๊ก ไนซ์ เลย์ เอก เยาว์ นิว ซี ฮอล อัน ดาว(พ) เลย์(ช)

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
      title: 'ฟุ๊ก',
      value: 'ฟุ๊ก',
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
      title: 'ฟุ๊ก',
      value: 'ฟุ๊ก',
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

  constructor(
    private firestoreService: FirestoreService,
    private modalController: ModalController,
    private fb: FormBuilder
  ) { }

  ngOnInit() {
    this.initForm();
  }

  initForm() {
    this.form = this.fb.group({
      reference: [''],
      contact: [''],
      name: [''],
      phone: [''],
      line: [''],
      seller: [''],
      total: [''],
      deposit: [''],
      payment: [''],
      designer: [''],
      date_of_acceptance: [''],
      date_of_submission: [''],
      printer: [''],
      print_date: [''],
      remark: [''],
      is_urgent: [''],
    })
  }


  segmentChanged(event) {
    this.type = event.value;
  }

  create() {
    const date = new Date();
    const newDate = new Date(date.setDate(date.getDate() + 1));
    const total = 600
    const deposit = 600
    const remaining = total - deposit
    const data = {
      id: uuidv4(),  // รหัสงาน
      serial_number: "ม.ค. 001", // หมายเลขงาน
      contact: "ไลน์", // ช่องทางการติดต่อ
      customer_name: "วัดภุมรินทร์", // ชื่อลูกค้า
      phone: "",  // เบอร์โทร 
      line_name: "พระอาจารย์ คง", // ชื่อผู้ติดต่อ
      created_at: new Date(),  // วันที่สร้าง
      created_by: "admin",  // ผู้สร้าง
      seller_name: "admin", // ชื่อผู้ขาย
      work: [
        {
          id: uuidv4(),
          type: "ไวนิล",  // ชนิดงาน
          height: "300", // ความสูง
          width: "800",  // ความกว้าง
          unit_of_length: "cm.",  // หน่วย
          option: "ตาไก่",  // หมวดหมู่
          quantity: 2,  // จํานวน
          total: 500,  // ราคาต่อหน่วย
        },
        {
          id: uuidv4(),
          type: "สตก.",  // ชนิดงาน
          height: "30", // ความสูง
          width: "80",  // ความกว้าง
          unit_of_length: "cm.",  // หน่วย
          option: "ติดฟิว",  // หมวดหมู่
          quantity: 2,  // จํานวน
          total: 500,  // ราคาต่อหน่วย
        },
      ],
      other: "",  // งานอื่นๆ
      payment: {
        total: total,  // ราคารวม
        deposit: deposit,   // เงินมัดจำ
        date_of_payment: new Date(),   // วันที่ชําระ
        payment_method: "เงินสด",  // วิธีการชําระ
        remaining: remaining,  // คงเหลือ
      },
      status: "รอออกแบบ",
      remark: "",  // หมายเหตุ 
      design_by: "admin",  // ผู้ออกแบบ 
      design_date: "",  // วันที่รับแบบ
      confirm_by: "admin",  // ผู้อนุมัติ
      confirm_date: "",  // วันที่อนุมัติ
      print_by: "admin", // ผู้พิมพ์
      print_date: "", // วันที่พิมพ์
      is_urgent: true,  // เป็นงานด่วน
      modify: 0,
      date_of_acceptance: newDate, // วันที่รับงาน
      date_of_submission: "", // วันที่ส่งแบบ
      date_of_completion: "", // วันที่ส่งมอบงาน
    }
    const collectionRef = collection(db, "jobs");
    this.firestoreService.addDatatoFirebase(
      collectionRef, data
    ).then((res) => {
      if (res) {
        this.modalController.dismiss();
      }
    })
  }

  onSubmit() {
    if (this.form.valid) {
      console.log(this.form.value);
      const date = new Date();
      const newDate = new Date(date.setDate(date.getDate() + 1));
      const total = this.form.value.total
      const deposit = this.form.value.deposit
      const remaining = total - deposit
      const data = {
        id: uuidv4(),  // รหัสงาน
        serial_number: this.form.value.reference || "", // หมายเลขงาน
        contact: this.form.value.contact.value || "", // ช่องทางการติดต่อ
        customer_name: this.form.value.name || "", // ชื่อลูกค้า
        phone: this.form.value.phone || "",  // เบอร์โทร 
        line_name: this.form.value.line || "", // ชื่อผู้ติดต่อ
        created_at: new Date(),  // วันที่สร้าง
        created_by: "admin",  // ผู้สร้าง
        seller_name: this.form.value.seller.value || "", // ชื่อผู้ขาย
        work: [
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
        ],
        other: "",  // งานอื่นๆ
        payment: {
          total: total,  // ราคารวม
          deposit: deposit,   // เงินมัดจำ
          date_of_payment: new Date(),   // วันที่ชําระ
          payment_method: this.form.value.payment.value || "",  // วิธีการชําระ
          remaining: remaining,  // คงเหลือ
        },
        status: "รอออกแบบ",
        remark: this.form.value.remark || "",  // หมายเหตุ 
        design_by: this.form.value.designer.value || "",  // ผู้ออกแบบ 
        design_date: this.form.value.date_of_submission || "",  // วันที่ส่งแบบ
        modify: 0,
        confirm_by: "",  // ผู้อนุมัติ
        confirm_date: "",  // วันที่อนุมัติ
        print_by: this.form.value.printer.value || "", // ผู้พิมพ์
        print_date: "", // วันที่พิมพ์
        is_urgent: this.form.value.is_urgent.value == 'ด่วน' ? true : false,  // เป็นงานด่วน
        date_of_acceptance: this.form.value.date_of_acceptance ? new Date(this.form.value.date_of_acceptance) : "", // วันที่รับงาน
        date_of_submission: "", // วันที่ส่งแบบ
        date_of_completion: "", // วันที่ส่งงาน
      }
      console.log(data);

      const collectionRef = collection(db, "jobs");
      this.firestoreService.addDatatoFirebase(collectionRef, data).then(() => {
        this.modalController.dismiss();
        this.form.reset();
      }).catch((error) => {
        console.log(error);
      })
    }
  }

  close() {
    this.modalController.dismiss();
  }
}
