/**
 * F17 — Stock models (mirror ของ Naikit-Sticker-BE/functions/src/lib/types.ts ส่วน stock).
 * ดู docs/F17-STOCK-DESIGN.md — SCHEMA.md wins ถ้า diverge.
 */
import { Timestamp } from 'firebase/firestore';

export const STOCK_DOC_TYPES = ['opening', 'receive', 'issue', 'adjust'] as const;
export type StockDocType = (typeof STOCK_DOC_TYPES)[number];

export const STOCK_DOC_TYPE_LABEL: Record<StockDocType, string> = {
  opening: 'ยอดตั้งต้น',
  receive: 'รับเข้า',
  issue: 'ใบเบิก',
  adjust: 'ปรับยอด',
};

/** จำนวนวันสูงสุดที่ role stock ลงย้อนหลังได้ (ตรงกับ BE STOCK_BACKDATE_LIMIT_DAYS) */
export const STOCK_BACKDATE_LIMIT_DAYS = 7;

export interface StockCategory {
  id: string;
  name: string;
  sort_order: number;
  count_cadence: 'monthly' | 'quarterly';
  is_deleted: boolean;
}

export interface StockItem {
  id: string;
  category_id: string;
  name: string;
  unit: string;
  /** SERVER-COMPUTED จาก ledger — ห้ามเขียนฝั่ง client */
  on_hand: number;
  min_qty: number | null;
  last_unit_price: number | null;
  material_id: string | null;
  is_active: boolean;
  is_deleted: boolean;
}

export interface StockDocLine {
  item_id: string;
  item_name: string;
  unit: string;
  qty: number;
  unit_price: number | null;
  /** issue — ผู้รับของต่อบรรทัด (ใบรวมรายวัน: หลายคน/หลายร้านในใบเดียว) */
  recipient_name: string | null;
  /** receive — ผู้ขาย/เลขบิลต่อบรรทัด (optional) */
  supplier: string | null;
  bill_no: string | null;
}

export interface StockDocument {
  id: string;
  type: StockDocType;
  doc_date: Timestamp;
  is_backdated: boolean;
  lines: StockDocLine[];
  supplier: string | null;
  bill_no: string | null;
  recipient_name: string | null;
  job_serial: string | null;
  adjust_reason: string | null;
  note: string;
  recorded_by_uid: string;
  recorded_by_name: string;
  status: 'active' | 'voided';
  voided_reason: string | null;
  voided_by_uid: string | null;
  voided_at: Timestamp | null;
  created_at: Timestamp;
}

export interface StockStaff {
  id: string;
  name: string;
  is_active: boolean;
}

// ── callable inputs ──

export interface StockDocLineInput {
  item_id: string;
  qty: number;
  unit_price?: number | null;
  /** บังคับต่อบรรทัดเมื่อ type=issue */
  recipient_name?: string;
  /** optional ต่อบรรทัดเมื่อ type=receive */
  supplier?: string;
  bill_no?: string;
}

export interface CreateStockDocInput {
  type: StockDocType;
  /** ms epoch หรือ ISO — default ฝั่ง server = now */
  doc_date?: number | string;
  lines: StockDocLineInput[];
  job_serial?: string;
  adjust_reason?: string;
  note?: string;
}

export interface UpsertStockItemInput {
  item_id?: string;
  category_id: string;
  name: string;
  unit: string;
  min_qty?: number | null;
  material_id?: string | null;
  is_active?: boolean;
}

export interface UpsertStockCategoryInput {
  category_id?: string;
  name: string;
  sort_order?: number;
  count_cadence?: 'monthly' | 'quarterly';
}

// ── F17 Sprint 2 — รอบนับจริง + รายงานเดือน ──

export interface StockCountLine {
  item_id: string;
  item_name: string;
  unit: string;
  counted_qty: number;
  ledger_qty: number;
  diff: number;
}

export interface StockCount {
  id: string;
  type: 'full' | 'spot';
  scope_category_ids: string[];
  status: 'submitted' | 'locked' | 'discarded';
  paper_confirmed: boolean;
  lines: StockCountLine[];
  note: string;
  counted_by_uid: string;
  counted_by_name: string;
  submitted_at: Timestamp;
  locked_by_uid: string | null;
  locked_at: Timestamp | null;
  adjust_doc_id: string | null;
}

export interface SubmitStockCountInput {
  type: 'full' | 'spot';
  scope_category_ids: string[];
  paper_confirmed: boolean;
  lines: { item_id: string; counted_qty: number }[];
  note?: string;
}

export interface StockReportRow {
  item_id: string;
  category_id: string;
  name: string;
  unit: string;
  opening: number;
  received: number;
  issued: number;
  adjusted: number;   // ± ส่วนต่างนับจริง
  closing: number;
  last_unit_price: number | null;
  closing_value: number | null;
  min_qty: number | null;
  is_active: boolean;
}

export interface StockReport {
  period: string; // YYYYMM
  rows: StockReportRow[];
  meta: {
    full_count_locked: boolean;
    spot_counts_locked: number;
    generated_at: number;
  };
}
