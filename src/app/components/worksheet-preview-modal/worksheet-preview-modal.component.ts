import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DragRef, Point, CdkDragEnd } from '@angular/cdk/drag-drop';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-worksheet-preview-modal',
  templateUrl: './worksheet-preview-modal.component.html',
  styleUrls: ['./worksheet-preview-modal.component.scss'],
})
export class WorksheetPreviewModalComponent implements OnInit {
  @Input() worksheetData: any;
  @ViewChild('contentToExport') contentToExport: ElementRef;

  // Store image states with improved typing
  imageStates: {
    [key: string]: {
      scale: number;
      position: { x: number; y: number };
      rotation: number;
    };
  } = {};

  // PDF export configuration
  private readonly pdfConfig = {
    format: 'a4',
    unit: 'mm',
    orientation: 'portrait',
    width: 210, // A4 width in mm
    height: 297, // A4 height in mm
    quality: 3, // Higher quality for canvas rendering
    margin: {
      top: 4,
      right: 4,
      bottom: 4,
      left: 4,
    },
  };

  constructor(
    private modalController: ModalController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.initializeImageStates();
  }

  private initializeImageStates() {
    // Initialize states for worksheet preview
    if (this.worksheetData?.worksheet_preview) {
      this.imageStates['worksheet'] = this.getDefaultImageState();
    }

    // Initialize states for reference previews
    if (this.worksheetData?.reference_previews?.length) {
      this.worksheetData.reference_previews.forEach((_, index) => {
        this.imageStates[`ref_${index}`] = this.getDefaultImageState();
      });
    }
  }

  private getDefaultImageState() {
    return {
      scale: 1,
      position: { x: 0, y: 0 },
      rotation: 0,
    };
  }

  // Improved drag handling with type safety
  onDragEnded(event: CdkDragEnd, imageId: string) {
    const position = event.source.getFreeDragPosition();
    if (!this.imageStates[imageId]) {
      this.imageStates[imageId] = { ...this.getDefaultImageState(), position };
    } else {
      this.imageStates[imageId].position = position;
    }
  }

  // Enhanced zoom functionality with smoother scaling
  onWheel(event: WheelEvent, imageId: string) {
    event.preventDefault();

    if (!this.imageStates[imageId]) {
      this.imageStates[imageId] = this.getDefaultImageState();
    }

    const scaleSpeed = 0.1;
    const minScale = 0.5;
    const maxScale = 3.0;

    const delta = event.deltaY > 0 ? -scaleSpeed : scaleSpeed;
    const currentScale = this.imageStates[imageId].scale;
    const newScale = Math.max(
      minScale,
      Math.min(maxScale, currentScale + delta)
    );

    this.imageStates[imageId].scale = newScale;
  }

  // Improved transform string generation
  getImageTransform(imageId: string): string {
    const state = this.imageStates[imageId] || this.getDefaultImageState();
    return `scale(${state.scale}) rotate(${state.rotation}deg)`;
  }

  // Enhanced PDF export with proper scaling and quality
  async exportToPDF() {
    try {
      const element = this.contentToExport.nativeElement;

      // Prepare element for export
      await this.prepareForExport(element);

      // Create high-quality canvas
      const canvas = await html2canvas(element, {
        scale: this.pdfConfig.quality,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        imageTimeout: 30000,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('content-to-export');
          if (clonedElement) {
            clonedElement.style.transform = 'none';
            clonedElement.style.display = 'block';
          }
        },
      });

      // Create PDF with proper dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Calculate dimensions to maintain aspect ratio
      const { width, height, x, y } = this.calculatePdfDimensions(canvas);

      // Add image to PDF with calculated dimensions and position
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      pdf.addImage(imgData, 'JPEG', x, y, width, height, 'FAST');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `worksheet_${
        this.worksheetData.serial_number || 'no_id'
      }_${timestamp}.pdf`;

      // Save PDF
      pdf.save(fileName);

      await this.showToast('Export PDF สำเร็จ', 'success');
    } catch (error) {
      console.error('PDF export error:', error);
      await this.showToast('เกิดข้อผิดพลาดในการ export PDF', 'danger');
    }
  }

  private calculatePdfDimensions(canvas: HTMLCanvasElement) {
    // ใช้ขนาดเต็มของกระดาษ A4
    const fullPageWidth = this.pdfConfig.width;
    const fullPageHeight = this.pdfConfig.height;

    const pageRatio = fullPageWidth / fullPageHeight;
    const contentRatio = canvas.width / canvas.height;

    let width: number;
    let height: number;
    let x: number = 0; // เริ่มจากขอบซ้ายสุด
    let y: number = 0; // เริ่มจากขอบบนสุด

    if (contentRatio > pageRatio) {
      // ถ้าเนื้อหากว้างกว่า ให้เต็มความกว้าง
      width = fullPageWidth;
      height = width / contentRatio;
      y = (fullPageHeight - height) / 2;
    } else {
      // ถ้าเนื้อหาสูงกว่า ให้เต็มความสูง
      height = fullPageHeight;
      width = height * contentRatio;
      x = (fullPageWidth - width) / 2;
    }

    return { width, height, x, y };
  }

  private async prepareForExport(element: HTMLElement) {
    // Reset all transformations temporarily
    const images = element.getElementsByTagName('img');
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      img.style.transform = 'none';
    }

    // Wait for any pending renders
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  private async showToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'top',
      color,
    });
    await toast.present();
  }

  // Modal control methods
  dismiss() {
    this.modalController.dismiss();
  }

  async confirmSave() {
    this.modalController.dismiss({ confirmed: true });
  }
}
