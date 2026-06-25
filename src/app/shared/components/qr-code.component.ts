import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  ViewChild,
} from '@angular/core';
import * as QRCode from 'qrcode';

/**
 * QR renderer — mirror krungthon-air/src/app/shared/components/qr-code.component.ts
 * (ใช้ lib `qrcode` ตัวเดียวกัน, toCanvas). Angular 17 classic decorators.
 */
@Component({
  standalone: true,
  selector: 'app-qr-code',
  template: `<canvas #canvas></canvas>`,
})
export class QrCodeComponent implements AfterViewInit, OnChanges {
  @Input() value = '';
  @Input() size = 240;

  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  private ready = false;

  ngAfterViewInit(): void {
    this.ready = true;
    this.render();
  }

  ngOnChanges(): void {
    if (this.ready) this.render();
  }

  private render(): void {
    if (!this.value || !this.canvas) return;
    QRCode.toCanvas(this.canvas.nativeElement, this.value, {
      width: this.size,
      margin: 2,
      color: { dark: '#0B1220', light: '#FFFFFF' },
    }).catch(() => { /* ignore render error */ });
  }

  downloadPng(filename: string): void {
    const url = this.canvas.nativeElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.png';
    a.click();
  }
}
