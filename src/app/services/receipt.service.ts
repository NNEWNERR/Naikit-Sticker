import { Injectable } from '@angular/core';
import { httpsCallable, FunctionsError } from 'firebase/functions';
import { functions } from './firebase-config';
import { ReceiptProjection } from '../core/models/receipt';

export class ReceiptError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

/**
 * F14 — ใบเสร็จ QR.
 *  - getReceipt: public callable (ไม่ต้องล็อกอิน) — ใช้บนหน้า `/r/:code`
 *  - regenerateReceiptCode: seller(เจ้าของ)/admin — สุ่ม code ใหม่เมื่อลิงก์หลุด
 */
@Injectable({ providedIn: 'root' })
export class ReceiptService {
  async getReceipt(code: string): Promise<ReceiptProjection> {
    const fn = httpsCallable<{ code: string }, ReceiptProjection>(functions, 'getReceipt');
    try {
      const res = await fn({ code: code.trim() });
      return res.data;
    } catch (e: unknown) {
      throw this._mapError(e);
    }
  }

  async regenerateReceiptCode(jobId: string): Promise<string> {
    const fn = httpsCallable<{ job_id: string }, { receipt_code: string }>(functions, 'regenerateReceiptCode');
    try {
      const res = await fn({ job_id: jobId });
      return res.data.receipt_code;
    } catch (e: unknown) {
      throw this._mapError(e);
    }
  }

  /** สร้าง public URL ของใบเสร็จจาก code (ใช้ origin ปัจจุบัน) */
  receiptUrl(code: string): string {
    return `${window.location.origin}/r/${code}`;
  }

  private _mapError(e: unknown): ReceiptError {
    const fe = e as FunctionsError;
    const code = fe?.code ?? 'unknown';
    const beMessage = typeof fe?.message === 'string' ? fe.message : '';
    switch (code) {
      case 'functions/not-found':
        return new ReceiptError(code, 'ไม่พบใบเสร็จ — ลิงก์อาจไม่ถูกต้องหรือถูกยกเลิกแล้ว');
      case 'functions/resource-exhausted':
        return new ReceiptError(code, 'มีการเรียกถี่เกินไป กรุณาลองใหม่อีกครั้ง');
      case 'functions/invalid-argument':
        return new ReceiptError(code, 'ลิงก์ใบเสร็จไม่ถูกต้อง');
      case 'functions/permission-denied':
        return new ReceiptError(code, beMessage || 'ไม่มีสิทธิ์ทำรายการนี้');
      case 'functions/unavailable':
        return new ReceiptError(code, 'เครือข่ายขัดข้อง กรุณาลองอีกครั้ง');
      default:
        return new ReceiptError(code, beMessage || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
  }
}
