import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DragRef, Point } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-worksheet-preview-modal',
  templateUrl: './worksheet-preview-modal.component.html',
  styleUrls: ['./worksheet-preview-modal.component.scss']
})
export class WorksheetPreviewModalComponent implements OnInit {
  @Input() worksheetData: any;

  // เก็บค่าการปรับขนาดและตำแหน่งของรูป
  imageStates: {[key: string]: { scale: number, position: Point }} = {};

  constructor(private modalController: ModalController) {}

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

  onDragEnded(event: { source: DragRef }, imageId: string) {
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
    
    // ปรับขนาดด้วยการ scroll
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(2, this.imageStates[imageId].scale + delta));
    this.imageStates[imageId].scale = newScale;
  }

  getImageTransform(imageId: string): string {
    const state = this.imageStates[imageId] || { scale: 1, position: { x: 0, y: 0 } };
    return `translate(${state.position.x}px, ${state.position.y}px) scale(${state.scale})`;
  }
} 