/**
 * FE mirror ของ BE PriceAuditDoc / RateCardDoc (Naikit-Sticker-BE/functions/src/lib/types.ts).
 * F7 — ราคากลาง + variance audit. ดู docs/F7-RATE-CARD-DESIGN.md
 */
import { Timestamp } from 'firebase/firestore';

export type PriceAuditSeverity = 'none' | 'soft' | 'hard';

/** price_audits/{job_id} — snapshot ส่วนต่างราคา (อ่านได้เฉพาะ finance/admin ตาม rules) */
export interface PriceAudit {
  id?: string; // = job_id
  job_id: string;
  serial_number: string;
  seller_uid: string;
  expected_total: number;
  actual_total: number;
  variance_baht: number; // actual − expected (ลบ = ขายต่ำกว่ากลาง)
  variance_pct: number;
  severity: PriceAuditSeverity;
  rate_version_map: Record<string, number>;
  matched_count: number;
  unmatched_count: number;
  computed_at: Timestamp;
  job_created_at: Timestamp;
  is_deleted: boolean;
  deleted_at: Timestamp | null;
}

export interface RateTier {
  max_side: number | null; // หน้ากว้าง roll สูงสุดที่ tier รองรับ; null = ต่อผ้า
  rate: number; // บาท/ตร.ม.
}

/** rate_cards/{type_code}__{option_code} */
export interface RateCard {
  id?: string;
  type_code: string;
  option_code: string;
  label: string;
  mode: 'per_sqm' | 'per_unit';
  tiers: RateTier[];
  unit_price: number | null;
  is_active: boolean;
  version: number;
}

export interface UpsertRateCardPayload {
  type_code: string;
  option_code: string;
  label: string;
  mode: 'per_sqm' | 'per_unit';
  tiers?: RateTier[];
  unit_price?: number | null;
  is_active?: boolean;
}
