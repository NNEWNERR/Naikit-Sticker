import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { arrayUnion, collection } from 'firebase/firestore';
import { db } from 'src/app/services/firebase-config';
import { v4 as uuidv4 } from 'uuid';
import { FirestoreService } from '../../services/firestore.service';
import { Job, WorkItem, Payment } from '../../interfaces/job.interface';
import { WorkItemModalComponent } from './work-item-modal/work-item-modal.component';
import { Router } from '@angular/router';
import { StorageService } from 'src/app/services/storage.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { thSarabunFont } from '../../shared/fonts/th-sarabun-font';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { WorksheetPreviewModalComponent } from '../../components/worksheet-preview-modal/worksheet-preview-modal.component';

@Component({
  selector: 'app-create-work-sheet',
  templateUrl: './create-work-sheet.component.html',
  styleUrls: ['./create-work-sheet.component.scss'],
})
export class CreateWorkSheetComponent implements OnInit {
  @ViewChild('worksheetInput') worksheetInput: ElementRef;
  @ViewChild('referenceInput') referenceInput: ElementRef;

  form: FormGroup;
  type = 'vinyl';
  types = [
    {
      title: 'ไวนิล',
      value: 'vinyl',
      disabled: false,
    },
    {
      title: 'สติกเกอร์',
      value: 'sticker',
      disabled: false,
    },
    {
      title: 'ฉลาก',
      value: 'label',
      disabled: false,
    },
    {
      title: 'นามบัตร',
      value: 'card',
      disabled: false,
    },
    {
      title: 'ใบปลิว',
      value: 'plow',
      disabled: false,
    },
    {
      title: 'กล่องไฟ',
      value: 'light_box',
      disabled: false,
    },
    {
      title: 'พลาสวูด',
      value: 'plastic',
      disabled: false,
    },
    {
      title: 'ตรายาง',
      value: 'tarp',
      disabled: false,
    },
  ];

  contacts = [
    {
      title: 'หน้าร้าน',
      value: 'front',
      disabled: false,
    },
    {
      title: 'โทรศัพท์',
      value: 'phone',
      disabled: false,
    },
    {
      title: 'เฟสบุ๊ค',
      value: 'facebook',
      disabled: false,
    },
    {
      title: 'ไลน์',
      value: 'line',
      disabled: false,
    },
    {
      title: 'อีเมล',
      value: 'email',
      disabled: false,
    },
  ];

  // contacts = ['หน้าร้าน', 'โทรศัพท์', 'เฟสบุ๊ค', 'ไลน์', 'อีเมล']
  // designers = ฟลุ๊ค ไนซ์ เลย์ เอก เยาว์
  // printers = ฟลุ๊ค ไนซ์ เลย์ เอก เยาว์ นิว ซี ฮอล อัน ดาว(พ) เลย์(ช)

  // sellers = นาเดียร์ แมว น้ำ ซัง ซิน
  sellers = [
    { value: 'นาเดียร์', label: 'นาเดียร์' },
    { value: 'แมว', label: 'แมว' },
    { value: 'น้ำ', label: 'น้ำ' },
    { value: 'ซัง', label: 'ซัง' },
    { value: 'ซิน', label: 'ซิน' },
  ];

  payments = [
    {
      title: 'เงินสด',
      value: 'เงินสด',
      disabled: false,
    },
    {
      title: 'โอน',
      value: 'โอน',
      disabled: false,
    },
    {
      title: 'เช็ค',
      value: 'เช็ค',
      disabled: false,
    },
    {
      title: 'เครดิต',
      value: 'เครดิต',
      disabled: false,
    },
    {
      title: 'อื่นๆ',
      value: 'อื่นๆ',
      disabled: false,
    },
  ];

  designers = [
    {
      title: 'admin',
      value: 'admin',
      disabled: false,
    },
    {
      title: 'ฟลุ๊ค',
      value: 'ฟลุ๊ค',
      disabled: false,
    },
    {
      title: 'ไนซ์',
      value: 'ไนซ์',
      disabled: false,
    },
    {
      title: 'เลย์',
      value: 'เลย์',
      disabled: false,
    },
    {
      title: 'เอก',
      value: 'เอก',
      disabled: false,
    },
    {
      title: 'เยาว์',
      value: 'เยาว์',
      disabled: false,
    },
  ];

  is_ergents = [
    {
      title: 'ไม่ด่วน',
      value: 'ไม่ด่วน',
      disabled: false,
    },
    {
      title: 'ด่วน',
      value: 'ด่วน',
      disabled: false,
    },
  ];

  printers = [
    {
      title: 'admin',
      value: 'admin',
      disabled: false,
    },
    {
      title: 'ฟลุ๊ค',
      value: 'ฟลุ๊ค',
      disabled: false,
    },
    {
      title: 'ไนซ์',
      value: 'ไนซ์',
      disabled: false,
    },
    {
      title: 'เลย์',
      value: 'เลย์',
      disabled: false,
    },
    {
      title: 'เอก',
      value: 'เอก',
      disabled: false,
    },
    {
      title: 'เยาว์',
      value: 'เยาว์',
      disabled: false,
    },
    {
      title: 'นิว',
      value: 'นิว',
      disabled: false,
    },
    {
      title: 'ซี',
      value: 'ซี',
      disabled: false,
    },
    {
      title: 'อัน',
      value: 'อัน',
      disabled: false,
    },
    {
      title: 'ดาว',
      value: 'ดาว',
      disabled: false,
    },
    {
      title: 'เลย์(ช)',
      value: 'เลย์(ช)',
      disabled: false,
    },
  ];

  worksheetForm: FormGroup;
  filePreviews: string[] = [];
  isDragging = false;
  isSubmitting = false;
  totalAmount = 0;
  isWorkSheetDragging = false;
  isReferenceDragging = false;
  workSheetPreviews: string[] = [];
  workSheetFiles: File[] = [];
  referencePreviews: string[] = [];  // เพิ่มบรรทัดนี้
  referenceFiles: File[] = [];


  constructor(
    private firestoreService: FirestoreService,
    private storageService: StorageService,
    private modalController: ModalController,
    private toastController: ToastController,
    private fb: FormBuilder,
    private router: Router,
    private alertController: AlertController
  ) {
    this.initNewForm();
  }

  ngOnInit() {
    // this.calculateTotal();
  }

  create() {
    const date = new Date();
    const newDate = new Date(date.setDate(date.getDate() + 1));
    const total = 600;
    const deposit = 600;
    const remaining = total - deposit;
    const data = {
      id: uuidv4(), // รหัสงาน
      serial_number: 'ม.ค. 001', // หมายเลขงาน
      contact: 'ไลน์', // ช่องทางการติดต่อ
      customer_name: 'วัดภุมรินทร์', // ชื่อลูกค้า
      phone: '', // เบอร์โทร
      line_name: 'พระอาจารย์ คง', // ชื่อผู้ติดต่อ
      created_at: new Date(), // วันที่สร้าง
      created_by: 'admin', // ผู้สร้าง
      seller_name: 'admin', // ชื่อผู้ขาย
      workItems: [
        {
          id: uuidv4(),
          type: 'ไวนิล', // ชนิดงาน
          height: '300', // ความสูง
          width: '800', // ความกว้าง
          unit_of_length: 'cm.', // หน่วย
          option: 'ตาไก่', // หมวดหมู่
          quantity: 2, // จํานวน
          total: 500, // ราคาต่อหน่วย
        },
        {
          id: uuidv4(),
          type: 'สตก.', // ชนิดงาน
          height: '30', // ความสูง
          width: '80', // ความกว้าง
          unit_of_length: 'cm.', // หน่วย
          option: 'ติดฟิว', // หมวดหมู่
          quantity: 2, // จํานวน
          total: 500, // ราคาต่อหน่วย
        },
      ],
      other: '', // งานอื่นๆ
      payment: {
        total: total, // ราคารวม
        deposit: deposit, // เงินมัดจำ
        date_of_payment: new Date(), // วันที่ชําระ
        payment_method: 'เงินสด', // วิธีการชําระ
        remaining: remaining, // คงเหลือ
      },
      status: 'รอออกแบบ',
      remark: '', // หมายเหตุ
      design_by: 'admin', // ผู้ออกแบบ
      design_date: '', // วันที่รับแบบ
      confirm_by: 'admin', // ผู้อนุมัติ
      confirm_date: '', // วันที่อนุมัติ
      print_by: 'admin', // ผู้พิมพ์
      print_date: '', // วันที่พิมพ์
      is_urgent: true, // เป็นงานด่วน
      modify: 0,
      date_of_acceptance: newDate, // วันที่รับงาน
      date_of_submission: '', // วันที่ส่งแบบ
      date_of_completion: '', // วันที่ส่งมอบงาน
    };
    const collectionRef = collection(db, 'jobs');
    this.firestoreService.addDatatoFirebase(collectionRef, data)
  }

  private async saveJob(data: Job): Promise<void> {
    try {
      const collectionRef = collection(db, 'jobs');
      await this.firestoreService.addDatatoFirebase(collectionRef, data);
      this.form.reset();
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล:', error);
      throw error;
    }
  }

  getMounthName(): string {
    const date = new Date();
    return date.toLocaleString('th-TH', { month: 'short' });
  }

  private initNewForm() {
    this.worksheetForm = this.fb.group({
      serial_number: [this.getMounthName(), Validators.required],
      seller: ['', Validators.required],
      contact: [''],
      customer_name: ['', Validators.required],
      line_name: [''],
      phone: [''],
      workItems: this.fb.array([]),
      total: [0],
      deposit: [0],
      payment: this.fb.group({
        total: [0],
        deposit: [0],
        date_of_payment: [new Date()],
        payment_method: [''],
        remaining: [0]
      }),
      date_of_acceptance: ['', Validators.required],
      design_by: [''],
      print_by: [''],
      is_urgent: [false],
      remark: [''],
      reference_images: [[]],
      status: ['รอออกแบบ'],
      created_at: [new Date()],
      created_by: ['admin'],
      design_date: [''],
      confirm_by: [''],
      confirm_date: [''],
      print_date: [''],
      modify: [0],
      date_of_submission: [''],
      date_of_completion: [''],
      worksheet_image: [''],
      design_images: [[]],
      print_images: [[]],
    });

    // this.addWorkItem();
  }

  getWorkItemTypes() {
    return [
      { value: 'ไวนิล', label: 'ไวนิล' },
      { value: 'สติกเกอร์', label: 'สติกเกอร์ พิมพ์' },
      { value: 'สติกเกอร์ตัด', label: 'สติกเกอร์ ตัด' },
      { value: 'ฉลาก', label: 'ฉลาก' },
      { value: 'นามบัตร', label: 'นามบัตร' },
      { value: 'ใบปลิว', label: 'ใบปลิว' },
      { value: 'โปสเตอร์', label: 'โปสเตอร์' },
      { value: 'พลาสวูด', label: 'พลาสวูด' },
      { value: 'ตรายาง', label: 'ตรายาง' },
      { value: 'กล่องไฟ', label: 'กล่องไฟ' }
    ];
  }

  getUnitOptions() {
    return [
      { value: 'mm.', label: 'มม.' },
      { value: 'cm.', label: 'ซม.' },
      { value: 'inch', label: 'นิ้ว' },
      { value: 'm.', label: 'เมตร' }
    ];
  }

  getWorkItemOptions(type: string) {
    const optionMap: { [key: string]: { value: string, label: string }[] } = {
      'ไวนิล': [
        { value: 'takai', label: 'ตาไก่' },
        { value: 'roty', label: 'ร้อยท่อ' },
        { value: 'wood', label: 'โครงไม้' },
        { value: 'seal', label: 'พับขอบ' },
        { value: 'non-seal', label: 'ปล่อยขอบ' },
        { value: 'metal', label: 'โครงเหล็ก' },
        { value: 'frame-wood', label: 'กรอบไม้' }
      ],
      'สติกเกอร์': [
        { value: 'future-board', label: 'ติดฟิวเจอร์บอร์ด' },
        { value: 'acrylic', label: 'ติดอะคริลิค' },
        { value: 'plaswood', label: 'ติดพลาสวูด' }
      ],
      'สติกเกอร์ตัด': [
        { value: 'future-board', label: 'ติดฟิวเจอร์บอร์ด' },
        { value: 'acrylic', label: 'ติดอะคริลิค' },
        { value: 'plaswood', label: 'ติดพลาสวูด' }
      ],
      'ตรายาง': [
        { value: 'Q-04', label: 'Q-04(4x60 MM.)' },
        { value: 'Q-05', label: 'Q-05(11x25 MM.)' },
        { value: 'Q-10', label: 'Q-10(11x40 MM.)' },
        { value: 'Q-11', label: 'Q-11(16x48 MM.)' },
        { value: 'Q-12', label: 'Q-12(24x49 MM.)' },
        { value: 'Q-13', label: 'Q-13(13x49 MM.)' },
        { value: 'Q-14', label: 'Q-14(14x60 MM.)' },
        { value: 'Q-16', label: 'Q-16(36x61 MM.)' },
        { value: 'Q-18', label: 'Q-18(22x69 MM.)' },
        { value: 'Q-24', label: 'Q-24(28x78 MM.)' },
        { value: 'Q-26', label: 'Q-26(16x83 MM.)' },
        { value: 'Q-32', label: 'Q-32(16 MM.)' },
        { value: 'Q-34', label: 'Q-34(20 MM.)' },
        { value: 'Q-53', label: 'Q-53(38 MM.)' }
      ]
    };
    return optionMap[type] || [];
  }

  get workItems() {
    return this.worksheetForm.get('workItems') as FormArray;
  }

  async addWorkItem() {
    const modal = await this.modalController.create({
      component: WorkItemModalComponent,
      cssClass: 'work-item-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      const workItemsArray = this.workItems;
      workItemsArray.push(this.fb.group(data));
      this.calculateTotal();
    }
  }

  async editWorkItem(index: number) {
    const modal = await this.modalController.create({
      component: WorkItemModalComponent,
      componentProps: {
        editData: this.workItems.at(index).value
      },
      cssClass: 'work-item-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      this.workItems.at(index).patchValue(data);
      this.calculateTotal();
    }
  }

  removeWorkItem(index: number) {
    this.workItems.removeAt(index);
    this.calculateTotal();
    // if (this.workItems.length === 0) {
    //   this.addWorkItem();
    // }
  }

  onDragOver(event: DragEvent, type: 'worksheet' | 'reference') {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'worksheet') {
      this.isWorkSheetDragging = true;
    } else {
      this.isReferenceDragging = true;
    }
  }

  onDragLeave(event: DragEvent, type: 'worksheet' | 'reference') {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'worksheet') {
      this.isWorkSheetDragging = false;
    } else {
      this.isReferenceDragging = false;
    }
  }

  onDrop(event: DragEvent, type: 'worksheet' | 'reference') {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'worksheet') {
      this.isWorkSheetDragging = false;
    } else {
      this.isReferenceDragging = false;
    }

    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(Array.from(files), type);
    }
  }

  onFileSelected(event: Event, type: 'worksheet' | 'reference') {
    const element = event.target as HTMLInputElement;
    const files = element.files;
    if (files) {
      this.handleFiles(Array.from(files), type);
      // รีเซ็ต input หลังจากอัพโหลด
      element.value = '';
    }
  }

  private handleFiles(files: File[], type: 'worksheet' | 'reference') {
    if (type === 'worksheet' && files.length > 0) {
      // สำหรับใบงาน เลือกเฉพาะไฟล์แรก
      const file = files[0];
      if (this.isValidFile(file)) {
        this.workSheetFiles = [file]; // เก็บแค่ไฟล์เดียว
        this.workSheetPreviews = []; // เคลียร์ preview เก่า
        this.createPreview(file, type);
      }
    } else if (type === 'reference') {
      // สำหรับรูปอ้างอิง ทำงานแบบเดิม
      const validFiles = files.filter(file => this.isValidFile(file));
      validFiles.forEach(file => {
        this.referenceFiles.push(file);
        this.createPreview(file, type);
      });
    }
  }

  private isValidFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    return validTypes.includes(file.type) && file.size <= maxSize;
  }

  private createPreview(file: File, type: 'worksheet' | 'reference') {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        if (type === 'worksheet') {
          this.workSheetPreviews.push(e.target.result);
        } else {
          this.referencePreviews.push(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      const pdfPreview = 'assets/icons/pdf-icon.png';
      if (type === 'worksheet') {
        this.workSheetPreviews.push(pdfPreview);
      } else {
        this.referencePreviews.push(pdfPreview);
      }
    }
  }

  removeFile(preview: string, type: 'worksheet' | 'reference') {
    if (type === 'worksheet') {
      const index = this.workSheetPreviews.indexOf(preview);
      if (index > -1) {
        this.workSheetPreviews.splice(index, 1);
        this.workSheetFiles.splice(index, 1);
        this.worksheetInput.nativeElement.value = '';
      }
    } else {
      const index = this.referencePreviews.indexOf(preview);
      if (index > -1) {
        this.referencePreviews.splice(index, 1);
        this.referenceFiles.splice(index, 1);
        this.referenceInput.nativeElement.value = '';
      }
    }
  }

  previewFile(preview: string, type: 'worksheet' | 'reference') {
    const files = type === 'worksheet' ? this.workSheetFiles : this.referenceFiles;
    const index = (type === 'worksheet' ? this.workSheetPreviews : this.referencePreviews).indexOf(preview);

    if (index > -1) {
      const file = files[index];
      if (file.type.startsWith('image/')) {
        // แสดง preview รูปภาพ
        console.log('Preview image:', preview);
      } else if (file.type === 'application/pdf') {
        // แสดง preview PDF
        console.log('Preview PDF:', file);
      }
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.worksheetForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  async submit() {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;
    try {
      const formData = this.worksheetForm.value;
      formData.total = this.totalAmount;
      formData.balance = this.calculateBalance();

      // เพิ่มข้อมูลเวลา
      formData.created_at = new Date();
      formData.updated_at = new Date();
      formData.date_of_acceptance = new Date(formData.date_of_acceptance);

      // ส่งข้อมูลไป API หรือ Service
      const images = await this.uploadFiles(this.workSheetFiles, 'worksheet');
      const referenceImages = await this.uploadFiles(this.referenceFiles, 'reference');
      formData.worksheet_image = images.length > 0 ? images[0].url : '';
      formData.reference_images = referenceImages.length > 0 ? arrayUnion(...referenceImages) : [];
      console.log('Form Data:', formData);

      const collectionRef = collection(db, 'jobs');
      await this.firestoreService.addDatatoFirebase(collectionRef, formData);
      const toast = await this.toastController.create({
        message: 'บันทึกข้อมูลสำเร็จ',
        duration: 2000,
        position: 'top',
        color: 'success',
        cssClass: 'custom-toast',
        icon: 'checkmark-circle'
      });
      await toast.present();
      this.resetForm();
    } catch (error) {
      const toast = await this.toastController.create({
        message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
        duration: 2000,
        position: 'top',
        color: 'danger',
        cssClass: 'custom-toast',
        icon: 'alert-circle'
      });
      await toast.present();
    } finally {
      this.isSubmitting = false;
    }
  }

  async uploadFiles(files: File[], type: 'worksheet' | 'reference') {
    if (!files || files.length === 0) return [];

    try {
      const date = new Date();
      const year = date.getFullYear().toString();
      const month_name = date.toLocaleString('th-TH', { month: 'long' });
      const imageUrls: string[] = [];

      // ถ้าเป็นใบงาน ใช้แค่ไฟล์แรก
      const filesToUpload = type === 'worksheet' ? [files[0]] : files;

      for (const file of filesToUpload) {
        // สร้าง path สำหรับเก็บไฟล์
        const imagePath = `images/${year}/${month_name}/${this.worksheetForm.get('serial_number').value}/${type === 'worksheet' ? 'worksheet' : 'reference'
          }/${file.name}`;

        // อัพโหลดไฟล์
        const imageUrl = await this.storageService.uploadImage(file, imagePath);
        imageUrls.push(imageUrl);
      }

      // แปลงเป็น array ของ image objects
      const images = imageUrls.map((url) => ({
        id: uuidv4(),
        url: url,
        type: type, // เพิ่ม type เพื่อแยกประเภทรูป
        date: new Date()
      }));

      return images;

    } catch (error) {
      console.error('Upload failed:', error);
      throw error; // ส่งต่อ error ไปให้ caller จัดการ
    }
  }

  resetForm() {
    this.worksheetForm.reset();
    this.workItems.clear();
    this.filePreviews = [];
    this.totalAmount = 0;
    this.initNewForm();
  }

  formatDate(date: Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  get isFormValid(): boolean {
    return this.worksheetForm.valid && this.workItems.length > 0;
  }

  get hasDeposit(): boolean {
    return (this.worksheetForm.get('deposit')?.value || 0) > 0;
  }

  onDepositChange() {
    const deposit = this.worksheetForm.get('deposit')?.value || 0;
    if (deposit > this.totalAmount) {
      this.worksheetForm.patchValue({ deposit: this.totalAmount });
    }
  }

  async handleFileUpload(files: FileList) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        try {
          const base64 = await this.convertToBase64(file);
          this.filePreviews.push(base64);
        } catch (error) {
          console.error('File conversion error:', error);
        }
      }
    }
  }

  private convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  calculateTotal() {
    this.totalAmount = this.workItems.controls.reduce((sum, item) => {
      return sum + (item.get('total')?.value || 0);
    }, 0);
    this.worksheetForm.patchValue({ total: this.totalAmount });
  }

  calculateBalance() {
    const total = this.worksheetForm.get('total')?.value || 0;
    const deposit = this.worksheetForm.get('deposit')?.value || 0;
    return total - deposit;
  }

  validateForm(): boolean {
    if (this.worksheetForm.invalid) {
      Object.keys(this.worksheetForm.controls).forEach(key => {
        const control = this.worksheetForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return false;
    }
    if (this.workItems.length === 0) {
      // แสดง alert หรือ toast แจ้งเตือน
      return false;
    }
    return true;
  }

  showOption(index: number, item: any) {
    const workItem = this.workItems.controls[index];
    console.log(workItem);
    console.log(item.value.type);

  }

  hasPresetOptions(type: string): boolean {
    return ['ไวนิล', 'สติกเกอร์', 'สติกเกอร์ตัด', 'ตรายาง'].includes(type);
  }

  //#endregion

  cancel() {
    // นำทางกลับไปหน้าก่อนหน้า
    this.router.navigate(['../']);
  }

  async clearForm() {
    const alert = await this.alertController.create({
      header: 'ยืนยันการล้างแบบ',
      message: 'คุณต้องการล้างข้อมูลทั้งหมดใช่หรือไม่?',
      buttons: [
        {
          text: 'ยกเลิก',
          role: 'cancel'
        },
        {
          text: 'ยืนยัน',
          handler: () => {
            this.worksheetForm.reset();
            this.workSheetFiles = [];
            this.workSheetPreviews = [];
            this.referenceFiles = [];
            this.referencePreviews = [];
          }
        }
      ]
    });
    await alert.present();
  }

  async saveDraft() {
    try {
      const formData = this.worksheetForm.value;
      formData.status = 'draft';
      const collectionRef = collection(db, 'job_drafts');
      await this.firestoreService.addDatatoFirebase(collectionRef, formData);

      const toast = await this.toastController.create({
        message: 'บันทึกแบบร่างสำเร็จ',
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      await toast.present();
    } catch (error) {
      console.error('Error saving draft:', error);
      const toast = await this.toastController.create({
        message: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
        duration: 2000,
        position: 'top',
        color: 'danger'
      });
      await toast.present();
    }
  }

  async exportToPDF() {
    try {
      const element = document.getElementById('content-to-export');
      
      if (!element) {
        throw new Error('ไม่พบ form ที่ต้องการ export');
      }

      const canvas = await html2canvas(element, {
        scale: 1,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        imageTimeout: 0,
        removeContainer: true,
        foreignObjectRendering: true
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);

      const margin = 15;
      const availableWidth = 210 - (margin * 2);
      const availableHeight = 297 - (margin * 2);

      pdf.addImage(
        imgData, 
        'JPEG', 
        margin,
        margin,
        availableWidth, 
        availableHeight
      );

      const today = new Date();
      const fileName = `worksheet_${today.getFullYear()}${(today.getMonth()+1).toString().padStart(2,'0')}${today.getDate().toString().padStart(2,'0')}.pdf`;

      pdf.save(fileName);

      const toast = await this.toastController.create({
        message: 'Export PDF สำเร็จ',
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      await toast.present();

    } catch (error) {
      console.error('Error:', error);
      const toast = await this.toastController.create({
        message: 'เกิดข้อผิดพลาดในการ export PDF: ' + error.message,
        duration: 3000,
        position: 'top',
        color: 'danger'
      });
      await toast.present();
    }
  }

  async exportExcel() {
    try {
      const formData = this.worksheetForm.value;
      const workItems = formData?.workItems ?? [];

      // สร้างฟังก์ชันสำหรับจัดรูปแบบวันที่
      const formatThaiDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
      };

      const worksheet = XLSX.utils.aoa_to_sheet([
        ['', '', 'ใบสั่งงาน', '', `เลขที่ ${formData.serial_number}`],
        [],
        ['สั่งทาง', formData.contact || ''],
        ['หน่วยงาน/ผู้สั่งงาน', formData.customer_name || '', 'โทร', formData.phone || '', 'ไลน์', formData.line_name || ''],
        [],
        ['ประเภทงาน'],
        ['ลำดับ', 'ประเภท', 'ขนาด', 'ตัวเลือก', 'จำนวน', 'ราคา'],
        ...workItems.map((item, index) => [
          index + 1,
          item.type,
          `${item.height} × ${item.width} ${item.unit_of_length}`,
          item.option,
          item.quantity,
          item.total
        ]),
        [],
        ['อื่นๆ', formData.remark || ''],
        ['ยอดรวม', formData.payment?.total || '', '', '', 'วันที่รับเงิน', formatThaiDate(formData.payment?.date_of_payment)],
        ['มัดจำ', formData.payment?.deposit || '', '', '', 'วิธีชำระเงิน', formData.payment?.payment_method || ''],
        ['คงเหลือ', formData.payment?.remaining || ''],
        [],
        ['วันที่รับงาน', formatThaiDate(formData.date_of_acceptance)],
        ['งานด่วน', formData.is_urgent ? '✓' : ''],
        ['สถานะ', formData.status || ''],
        [],
        ['ผู้ออกแบบ', '', 'วันที่ออกแบบ', ''],
        ['ผู้พิมพ์', '', 'วันที่พิมพ์', ''],
        ['ผู้รับงาน', formData.seller || ''],
        [],
      ]);

      // กำหนดความกว้างของคอลัมน์
      worksheet['!cols'] = [
        { wch: 8 },   // ลำดับ
        { wch: 12 },  // ประเภท
        { wch: 15 },  // ขนาด
        { wch: 15 },  // ตัวเลือก
        { wch: 8 },   // จำนวน
        { wch: 10 },  // ราคา
      ];

      // จัดสไตล์หัวข้อหลัก
      const headerCells = ['A6'];
      headerCells.forEach(cell => {
        if (worksheet[cell]) {
          worksheet[cell].s = {
            font: { bold: true, color: { rgb: "FF0000" } },  // สีแดง
            alignment: { horizontal: 'left' }
          };
        }
      });

      // จัดรูปแบบสีของข้อความสำหรับหัวข้อ
      const redTextCells = ['A3', 'A17', 'A18', 'A19'];
      redTextCells.forEach(cell => {
        if (worksheet[cell]) {
          worksheet[cell].s = {
            font: { color: { rgb: "FF0000" } }
          };
        }
      });

      // จัดรูปแบบสำหรับหัวตาราง
      const tableHeaderRow = 7; // แถวที่มีหัวตาราง
      for (let i = 0; i < 6; i++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: tableHeaderRow, c: i })];
        if (cell) {
          cell.s = {
            font: { bold: true },
            alignment: { horizontal: 'center' }
          };
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ใบสั่งงาน');
      XLSX.writeFile(workbook, `ใบสั่งงาน_${formData.serial_number || 'no_id'}.xlsx`);

      const toast = await this.toastController.create({
        message: 'Export Excel สำเร็จ',
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      await toast.present();

    } catch (error) {
      console.error('Error:', error);
      const toast = await this.toastController.create({
        message: 'เกิดข้อผิดพลาด',
        duration: 2000,
        position: 'top',
        color: 'danger'
      });
      await toast.present();
    }
  }

  async save() {
    try {
      if (this.worksheetForm.valid) {
        const formData = this.worksheetForm.value;
        
        // เพิ่มข้อมูลรูปภาพ
        const previewData = {
          ...formData,
          worksheet_preview: this.workSheetPreviews?.[0], // รูปใบงาน
          reference_previews: this.referencePreviews || [], // รูปอ้างอิง
        };

        // แสดง Modal ยืนยันข้อมูล
        const modal = await this.modalController.create({
          component: WorksheetPreviewModalComponent,
          componentProps: {
            worksheetData: previewData
          },
          cssClass: 'modal-fullscreen'
        });

        await modal.present();

        // รอผลลัพธ์จาก Modal
        const { data } = await modal.onDidDismiss();
        
        if (data?.confirmed) {
          await this.submit();
          
          const toast = await this.toastController.create({
            message: 'บันทึกข้อมูลสำเร็จ',
            duration: 2000,
            position: 'top',
            color: 'success'
          });
          await toast.present();
          
          this.router.navigate(['/worksheets']);
        }
      } else {
        const toast = await this.toastController.create({
          message: 'กรุณากรอกข้อมูลให้ครบถ้วน',
          duration: 2000,
          position: 'top',
          color: 'warning'
        });
        await toast.present();
      }
    } catch (error) {
      console.error('Error:', error);
      const toast = await this.toastController.create({
        message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
        duration: 2000,
        position: 'top',
        color: 'danger'
      });
      await toast.present();
    }
  }

}

