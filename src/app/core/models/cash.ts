/**
 * FE mirror ของ BE CashSessionDoc (Naikit-Sticker-BE/functions/src/lib/types.ts).
 * Cash reconciliation (F5) — ดู docs/FINANCE-CONTROLS.md
 */
import { Timestamp } from 'firebase/firestore';

export interface CashSession {
  id?: string;             // `${seller_uid}_${YYYYMMDD}`
  seller_uid: string;
  date: string;            // 'YYYYMMDD' (ICT)
  system_total: number;    // Σ payment.total งานเงินสดที่ส่งมอบวันนั้น (server-computed)
  job_count: number;
  declared_total: number;  // ยอดที่ seller นับส่งจริง
  variance: number;        // declared_total − system_total (≠ 0 = ธงแดง)
  status: 'open' | 'closed';
  note: string;
  reconciled_by_uid: string;
  reconciled_at: Timestamp;
  closed_by_uid: string | null;
  closed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ReconcileCashPayload {
  seller_uid: string;
  date: string;            // YYYYMMDD (ICT)
  declared_total: number;
  note?: string;
}

export interface ReconcileCashResponse {
  id: string;
  system_total: number;
  job_count: number;
  declared_total: number;
  variance: number;
}
