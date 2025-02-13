import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DragRef, Point, CdkDragEnd } from '@angular/cdk/drag-drop';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-worksheet-preview-modal',
  templateUrl: './worksheet-preview-modal.component.html',
  styleUrls: ['./worksheet-preview-modal.component.scss']
})
export class WorksheetPreviewModalComponent implements OnInit {
  @Input() worksheetData: any;

  // เก็บค่าการปรับขนาดและตำแหน่งของรูป
  imageStates: { [key: string]: { scale: number, position: { x: number, y: number } } } = {};

  constructor(
    private modalController: ModalController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    // ตรวจสอบว่ามีข้อมูลรูปภาพหรือไม่
    console.log('Worksheet Images:', this.worksheetData?.images);
  }

  dismiss() {
    this.modalController.dismiss();
  }

  async confirmSave() {
    this.modalController.dismiss({ confirmed: true });
  }

  onDragEnded(event: CdkDragEnd, imageId: string) {
    const position = event.source.getFreeDragPosition();
    if (!this.imageStates[imageId]) {
      this.imageStates[imageId] = { scale: 1, position };
    } else {
      this.imageStates[imageId].position = position;
    }
  }

  onWheel(event: WheelEvent, imageId: string) {
    event.preventDefault();
    if (!this.imageStates[imageId]) {
      this.imageStates[imageId] = { scale: 1, position: { x: 0, y: 0 } };
    }

    const scaleSpeed = 0.05; // ปรับความเร็วในการ scale
    const delta = event.deltaY > 0 ? -scaleSpeed : scaleSpeed;
    const newScale = Math.max(0.1, Math.min(3, this.imageStates[imageId].scale + delta));
    this.imageStates[imageId].scale = newScale;
  }

  getImageTransform(imageId: string): string {
    const state = this.imageStates[imageId] || { scale: 1, position: { x: 0, y: 0 } };
    return `scale(${state.scale})`;
  }

  async exportToPDF() {
    try {
      const element = document.getElementById('content-to-export');

      if (!element) {
        throw new Error('ไม่พบ form ที่ต้องการ export');
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        imageTimeout: 15000,
        onclone: (document) => {
          const clonedElement = document.getElementById('content-to-export');
          if (clonedElement) {
            clonedElement.style.display = 'block';
            clonedElement.style.visibility = 'visible';
            window.scrollTo(0, 0);
          }
        }
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png', 1.0);

      // ปรับค่าใหม่ให้พอดีกับ A4
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 0; // ลบ margin ออก

      // ให้ภาพเต็มหน้า A4
      pdf.addImage(
        imgData,
        'PNG',
        0,
        0,
        pdfWidth,
        pdfHeight
      );

      const today = new Date();
      const fileName = `ใบสั่งงาน_${this.worksheetData.serial_number || 'no_id'}.pdf`;

      pdf.save(fileName);

      const toast = await this.toastController.create({
        message: 'Export PDF สำเร็จ',
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      await toast.present();
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      const toast = await this.toastController.create({
        message: 'เกิดข้อผิดพลาดในการ export PDF',
        duration: 2000,
        position: 'top',
        color: 'danger'
      });
      await toast.present();
    }
  }
} 