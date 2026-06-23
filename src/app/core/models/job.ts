/**
 * FE mirror of the BE JobDoc / WorkItem / Payment shapes.
 *
 * Keep in sync with:
 *   - SCHEMA.md (jobs/{jobId})
 *   - Naikit-Sticker-BE/functions/src/lib/types.ts
 */
import { Timestamp } from 'firebase/firestore';
import { Role } from './session';

export type JobStatus =
  | 'รอออกแบบ'
  | 'กำลังออกแบบ'
  | 'รอคอนเฟิร์มแบบ'
  | 'คอนเฟิร์มแล้ว'
  | 'รอผลิต'
  | 'กำลังผลิต'
  | 'รอส่งมอบ'
  | 'ส่งมอบแล้ว';

export type Contact = 'หน้าร้าน' | 'เฟสบุ๊ค' | 'ไลน์' | 'อีเมล' | 'โทรศัพท์';
export type UnitOfLength = 'mm.' | 'cm.' | 'inch' | 'm.';
export type PaymentMethod = 'เงินสด' | 'โอน' | 'เช็ค' | 'เครดิต' | 'อื่นๆ' | '';

export interface WorkItem {
  type: string;
  width: number;
  height: number;
  unit_of_length: UnitOfLength;
  option: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export type VatMode = 'none' | 'exclusive' | 'inclusive'; // ไม่มี / VAT นอก / VAT ใน

/** F9 — VAT/WHT block (server คำนวณ). ดู docs/F9-TAX-PAYMENT-DESIGN.md */
export interface Tax {
  vat_mode: VatMode;
  vat_rate: number;
  wht_rate: number;        // 0|1|2|3
  base: number;
  vat_amount: number;
  grand_total: number;
  wht_amount: number;
  net_receivable: number;  // grand_total − wht_amount
  wht_cert_ref: string;
}

export interface Payment {
  /** SERVER-AUTHORITATIVE = Σ work_items.total − discount (BE คิดให้ ดู docs/FINANCE-CONTROLS.md) */
  total: number;
  /** ส่วนลด default 0; optional ใน read (เอกสารเก่าก่อน F1 ไม่มี field นี้) */
  discount?: number;
  /** F10 — ค่าส่ง (ลูกค้าจ่ายเพิ่ม, นอกฐาน VAT/WHT); optional ใน read (งานเก่าไม่มี) */
  shipping_fee?: number;
  /** F10 — ค่าธรรมเนียม เช็ค/โอน (ลูกค้าจ่ายเพิ่ม, นอกฐาน VAT/WHT); optional ใน read */
  transfer_fee?: number;
  /** ค่าใช้จ่ายอื่นๆ ที่เป็นบริการ (เช่น ค่าออกแบบ) — **อยู่ในฐาน VAT/WHT**; optional ใน read (งานเก่าไม่มี) */
  other_fee?: number;
  /** หมายเหตุค่าใช้จ่ายอื่นๆ — บังคับเมื่อ other_fee > 0 */
  other_fee_note?: string;
  deposit: number;
  remaining: number;
  payment_method: PaymentMethod;
  /** ISO string when posting to Cloud Function; Timestamp when reading from Firestore. */
  date_of_payment: string | Timestamp | null;
}

/**
 * Payload accepted by the `createJob` callable. Dates are sent as ISO strings —
 * the BE parses them with `parseDate()`.
 */
export interface CreateJobPayload {
  customer_name: string;
  contact: Contact;
  phone?: string;
  line_name?: string;
  is_urgent: boolean;
  work_items: WorkItem[];
  payment: Payment;
  worksheet_image?: string | null;
  reference_images?: string[];
  date_of_acceptance: string;  // ISO 8601
  remark?: string;
  /** Admin-only: create on behalf of another seller. Ignored when caller is seller. */
  seller_uid?: string;
  // F9 — tax inputs (BE คำนวณ tax block ให้)
  vat_mode?: VatMode;
  vat_rate?: number;
  wht_rate?: number;
  wht_cert_ref?: string;
}

export interface CreateJobResponse {
  jobId: string;
  serial_number: string;
}

// ─── Full Job read model (from Firestore) ────────────────────────────────────

export interface JobImageDoc {
  id: string;
  url: string;
  uploaded_at: Timestamp;
  uploaded_by_uid: string;
}

/** F13 — งานผลิตต่อเครื่อง (sub-task). ดู docs/F13-PRODUCTION-TASKS-DESIGN.md */
export interface ProductionTask {
  machine: string;
  status: 'รอผลิต' | 'กำลังผลิต' | 'เสร็จ';
  print_uid: string | null;
  print_date: Timestamp | null;
  done_at: Timestamp | null;
  images: JobImageDoc[];
}

/** Firestore `jobs/{jobId}` document with the doc ID merged in. */
export interface Job {
  id: string;
  serial_number: string;
  customer_name: string;
  contact: Contact;
  phone?: string;
  line_name?: string;
  is_urgent: boolean;
  status: JobStatus;
  seller_uid: string;
  design_uid: string | null;
  print_uid: string | null;
  work_items: WorkItem[];
  /** denormalized เครื่อง/กลุ่มผลิต (fuji/vinyl/large_sticker/cut_sticker/other); optional ใน read (งานเก่า) */
  machines?: string[];
  /** F13 — งานผลิตต่อเครื่อง (1 task/machine); optional ใน read (งานเก่า/ยังไม่ส่งผลิต) */
  print_tasks?: ProductionTask[];
  payment: Payment;
  tax?: Tax;
  worksheet_image: string | null;
  reference_images: string[];
  design_images: JobImageDoc[];
  print_images: JobImageDoc[];
  /** Optional payment slips attached at delivery. */
  delivery_slips?: JobImageDoc[];
  date_of_acceptance: Timestamp;
  design_date: Timestamp | null;
  date_of_submission: Timestamp | null;
  confirm_uid: string | null;
  confirm_date: Timestamp | null;
  print_date: Timestamp | null;
  date_of_completion: Timestamp | null;
  /** F8 — Σ payment active − refund approved; optional (เอกสารเก่าก่อน F8 ไม่มี) */
  paid_amount?: number;
  remark: string;
  created_at: Timestamp;
  created_by_uid: string;
  updated_at: Timestamp;
  updated_by_uid: string;
  is_deleted: boolean;
  deleted_at: Timestamp | null;
}

export type JobAction =
  | 'create' | 'edit' | 'claim_design' | 'claim_print' | 'submit_design'
  | 'confirm_design' | 'request_revision' | 'start_print' | 'upload_print'
  | 'mark_delivered' | 'payment_adjust'
  | 'payment_record' | 'payment_void' | 'refund_request' | 'refund_approve' | 'refund_reject'
  | 'comment_add' | 'comment_delete'
  | 'admin_reassign' | 'delete' | 'restore';

export interface JobEvent {
  id: string;
  job_id: string;
  actor_uid: string;
  actor_role: Role;
  action: JobAction;
  from_status: JobStatus | null;
  to_status: JobStatus | null;
  payload: Record<string, unknown>;
  at: Timestamp;
}

export interface CommentReply {
  id: string;
  user_uid: string;
  user_display_name: string;
  text: string;
  created_at: Timestamp;
}

export interface JobComment {
  id: string;
  job_id: string;
  user_uid: string;
  user_display_name: string;
  text: string;
  likes: number;
  replies: CommentReply[];
  created_at: Timestamp;
  is_deleted: boolean;
  deleted_at: Timestamp | null;
}
