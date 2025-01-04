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
      types: ['']
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
}
