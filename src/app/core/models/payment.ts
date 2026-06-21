/**
 * FE mirror ของ BE PaymentDoc / RefundDoc (Naikit-Sticker-BE/functions/src/lib/types.ts).
 * F8 — Slip/Payment model. ดู docs/F8-SLIP-PAYMENT-DESIGN.md
 */
import { Timestamp } from 'firebase/firestore';
import { PaymentMethod } from './job';

export interface PaymentAllocation {
  job_id: string;
  amount: number;
}

/** payments/{id} — หนึ่งการจ่ายจริง ผูกได้หลายใบงาน */
export interface PaymentRecord {
  id?: string;
  method: PaymentMethod;
  amount: number;
  bank_ref: string;
  slip_url: string | null;
  slip_hash: string | null;
  paid_at: Timestamp;
  allocations: PaymentAllocation[];
  allocated_total: number;
  seller_uids: string[];
  customer_name: string;
  status: 'active' | 'voided';
  voided_reason: string | null;
  voided_by_uid: string | null;
  voided_at: Timestamp | null;
  note: string;
  created_by_uid: string;
  created_at: Timestamp;
  updated_by_uid: string;
  updated_at: Timestamp;
  is_deleted: boolean;
  deleted_at: Timestamp | null;
}

/** refunds/{id} — seller ขอ (pending) → finance อนุมัติ (approved) */
export interface RefundRecord {
  id?: string;
  job_id: string;
  amount: number;
  method: 'เงินสด' | 'โอน';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  seller_uid: string;
  requested_by_uid: string;
  requested_at: Timestamp;
  approved_by_uid: string | null;
  approved_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  is_deleted: boolean;
  deleted_at: Timestamp | null;
}

// ── Callable payloads (F8.2+) ───────────────────────────────────────────────

export interface CreatePaymentPayload {
  method: PaymentMethod;
  amount: number;
  bank_ref?: string;
  slip_url?: string | null;
  slip_hash?: string | null;
  paid_at: string;                 // ISO
  allocations: PaymentAllocation[];
  customer_name: string;
  note?: string;
}

export interface RequestRefundPayload {
  job_id: string;
  amount: number;
  method: 'เงินสด' | 'โอน';
  reason: string;
}
