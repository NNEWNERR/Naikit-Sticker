/**
 * PaymentService (F8) — callable wrappers + live queries + slip upload/hash.
 * ใช้โดย worksheet-info (บันทึกการจ่าย/ขอคืนเงิน) + Finance Dashboard.
 * ดู docs/F8-SLIP-PAYMENT-DESIGN.md
 */
import { Injectable } from '@angular/core';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FunctionsError, httpsCallable } from 'firebase/functions';
import { db, functions, storage } from './firebase-config';
import {
  CreatePaymentPayload,
  PaymentRecord,
  RefundRecord,
  RequestRefundPayload,
} from '../core/models/payment';

export class PaymentError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class PaymentService {

  // ── Mutations ─────────────────────────────────────────────────────────────

  async createPayment(payload: CreatePaymentPayload): Promise<{ paymentId: string; allocated_total: number }> {
    return this._call('createPayment', payload);
  }
  async voidPayment(paymentId: string, reason: string): Promise<void> {
    await this._call('voidPayment', { payment_id: paymentId, reason });
  }
  async deletePayment(paymentId: string, reason: string): Promise<void> {
    await this._call('deletePayment', { payment_id: paymentId, reason });
  }
  async requestRefund(payload: RequestRefundPayload): Promise<{ refundId: string }> {
    return this._call('requestRefund', payload);
  }
  async approveRefund(refundId: string): Promise<void> {
    await this._call('approveRefund', { refund_id: refundId });
  }
  async rejectRefund(refundId: string, reason?: string): Promise<void> {
    await this._call('rejectRefund', { refund_id: refundId, reason: reason ?? '' });
  }

  // ── Slip upload + fingerprint ──────────────────────────────────────────────

  /** อัปสลิปไป storage (path jobs/{jobId}/slip) → URL. */
  async uploadSlip(jobId: string, file: File): Promise<string> {
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const path = `jobs/${jobId}/slip/${crypto.randomUUID()}.${ext}`;
    const r = storageRef(storage, path);
    await uploadBytes(r, file);
    return getDownloadURL(r);
  }

  /** sha256 ของไฟล์ (hex) — จับภาพสลิปซ้ำ/ตัดต่อ. */
  async hashFile(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // ── Live queries ───────────────────────────────────────────────────────────

  /** payment ทั้งหมดของใบงานหนึ่ง (worksheet-info). */
  watchPaymentsForJob(jobId: string, cb: (p: PaymentRecord[]) => void): () => void {
    return onSnapshot(
      query(collection(db, 'payments'), where('job_ids', 'array-contains', jobId), orderBy('created_at', 'desc')),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord))),
    );
  }

  /** payment ทั้งหมด (Finance Dashboard — reuse detection). */
  watchAllPayments(cb: (p: PaymentRecord[]) => void): () => void {
    return onSnapshot(
      query(collection(db, 'payments'), where('is_deleted', '==', false), orderBy('created_at', 'desc')),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord))),
    );
  }

  /** refund ของใบงานหนึ่ง (sort client-side). */
  watchRefundsForJob(jobId: string, cb: (r: RefundRecord[]) => void): () => void {
    return onSnapshot(
      query(collection(db, 'refunds'), where('job_id', '==', jobId)),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RefundRecord))),
    );
  }

  /** คำขอคืนเงินที่ยัง pending (Finance Dashboard). */
  watchPendingRefunds(cb: (r: RefundRecord[]) => void): () => void {
    return onSnapshot(
      query(collection(db, 'refunds'), where('status', '==', 'pending'), orderBy('requested_at', 'desc')),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RefundRecord))),
    );
  }

  /** refund ทั้งหมด (log). */
  watchAllRefunds(cb: (r: RefundRecord[]) => void): () => void {
    return onSnapshot(
      query(collection(db, 'refunds'), orderBy('requested_at', 'desc')),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RefundRecord))),
    );
  }

  private async _call<Res>(name: string, data: unknown): Promise<Res> {
    const fn = httpsCallable<unknown, Res>(functions, name);
    try {
      return (await fn(data)).data;
    } catch (e: unknown) {
      const fe = e as FunctionsError;
      const code = fe?.code ?? 'unknown';
      const msg = typeof fe?.message === 'string' ? fe.message : '';
      throw new PaymentError(code, msg || 'ทำรายการชำระเงินไม่สำเร็จ');
    }
  }
}
