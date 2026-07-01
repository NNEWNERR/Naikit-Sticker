import { Injectable } from '@angular/core';
import { httpsCallable, FunctionsError } from 'firebase/functions';
import { functions } from './firebase-config';
import { Material, MaterialInput, UnitOfLength, WasteSeverity } from '../core/models/job';

/**
 * F15 — materials master catalog (อ่าน listMaterials เพื่อทำ dropdown ฟอร์มบันทึกการพิมพ์)
 * + ตัวคำนวณ waste preview ฝั่ง client (mirror BE lib/production.ts — โชว์สดขณะกรอก;
 * ตัวจริง server คำนวณซ้ำตอน uploadPrint). ดู docs/F15-PRODUCTION-MATERIAL.md
 *
 * NOTE: คนละตัวกับ MaterialService (F14 reconcile). ตัวนี้ = catalog ของ F15.
 */
export class MaterialCatalogError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

const UNIT_TO_M: Record<UnitOfLength, number> = { 'mm.': 0.001, 'cm.': 0.01, inch: 0.0254, 'm.': 1 };
const toMeters = (v: number, u: UnitOfLength): number => v * (UNIT_TO_M[u] ?? 0.01);
const round3 = (n: number): number => Math.round(n * 1000) / 1000;
const round1 = (n: number): number => Math.round(n * 10) / 10;

/** เกณฑ์ default — ตรงกับ DEFAULT_PRODUCTION_THRESHOLDS ฝั่ง BE (โชว์ preview เท่านั้น) */
export const WASTE_THRESHOLDS = { soft_pct: 30, hard_pct: 50, floor_sqm: 0.5 };

export interface WastePreview {
  area_used_sqm: number;
  area_billed_sqm: number;
  waste_pct: number;
  waste_severity: WasteSeverity;
  paneled: boolean;
  /** D5 — false = สติกเกอร์รายชิ้นยังไม่มี roll_run → โชว์ "รอ roll_run" แทนธงเศษ% */
  waste_reliable: boolean;
}

/** map work_item.type (label ไทย) → category ของ material */
export function categoryOfType(type: string): 'vinyl' | 'sticker' | null {
  const t = (type ?? '').trim();
  if (t === 'ไวนิล') return 'vinyl';
  if (t.startsWith('สติกเกอร์')) return 'sticker';
  return null;
}

@Injectable({ providedIn: 'root' })
export class MaterialCatalogService {
  private _cache: Material[] | null = null;

  /** materials ทั้งหมด (cache ใน service instance; refresh() เพื่อโหลดใหม่) */
  async list(force = false): Promise<Material[]> {
    if (this._cache && !force) return this._cache;
    const res = await this._call<Record<string, never>, { materials: Material[] }>('listMaterials', {});
    this._cache = res.materials ?? [];
    return this._cache;
  }

  /** admin — เพิ่ม/แก้วัสดุ (upsertMaterial). ล้าง cache เพื่อโหลดใหม่ */
  async upsert(input: MaterialInput): Promise<{ id: string }> {
    const res = await this._call<MaterialInput, { id: string }>('upsertMaterial', input);
    this._cache = null;
    return res;
  }

  /** กรองตาม category (สำหรับ dropdown ของ work_item แต่ละชนิด) */
  filterByCategory(materials: Material[], category: 'vinyl' | 'sticker' | null): Material[] {
    if (!category) return materials.filter((m) => m.is_active);
    return materials.filter((m) => m.is_active && m.category === category);
  }

  /** คำนวณ waste preview ฝั่ง client (mirror BE computeProductionAudit) */
  preview(
    wi: { width: number; height: number; unit_of_length: UnitOfLength },
    input: { roll_width_m: number; length_used_m: number; qty_printed: number },
    opts: { category?: 'vinyl' | 'sticker' | null; rollRunId?: string | null } = {},
  ): WastePreview {
    const wM = toMeters(wi.width ?? 0, wi.unit_of_length);
    const hM = toMeters(wi.height ?? 0, wi.unit_of_length);
    const qty = input.qty_printed > 0 ? input.qty_printed : 0;
    const R = input.roll_width_m > 0 ? input.roll_width_m : 0;
    const shortSide = Math.min(wM, hM);
    const longSide = Math.max(wM, hM);
    const paneled = R > 0 && shortSide > R;
    const area_billed = round3(wM * hM * qty);

    let area_used: number;
    if (input.length_used_m > 0 && R > 0) area_used = round3(R * input.length_used_m);
    else if (R > 0) {
      const panels = shortSide <= R ? 1 : Math.ceil(shortSide / R);
      area_used = round3(panels * R * longSide * qty);
    } else area_used = 0;

    const waste_pct = area_used > 0 ? round1(((area_used - area_billed) / area_used) * 100) : 0;
    // D5 — สติกเกอร์รายชิ้นบนม้วนแชร์ยังวัดเศษไม่แฟร์ → ไม่เชื่อถือจนกว่าจะผูก roll_run
    const waste_reliable = opts.category !== 'sticker' || !!opts.rollRunId;
    let waste_severity: WasteSeverity = 'none';
    if (waste_reliable && area_used > 0 && area_billed >= WASTE_THRESHOLDS.floor_sqm) {
      const abs = Math.abs(waste_pct);
      if (abs >= WASTE_THRESHOLDS.hard_pct) waste_severity = 'hard';
      else if (abs >= WASTE_THRESHOLDS.soft_pct) waste_severity = 'soft';
    }
    return { area_used_sqm: area_used, area_billed_sqm: area_billed, waste_pct, waste_severity, paneled, waste_reliable };
  }

  private async _call<Req, Res>(name: string, data: Req): Promise<Res> {
    const fn = httpsCallable<Req, Res>(functions, name);
    try {
      return (await fn(data)).data;
    } catch (e: unknown) {
      const fe = e as FunctionsError;
      const code = fe?.code ?? 'unknown';
      const msg = code === 'functions/permission-denied' ? 'ไม่มีสิทธิ์'
        : code === 'functions/invalid-argument' ? (fe?.message || 'ข้อมูลไม่ถูกต้อง')
        : (fe?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
      throw new MaterialCatalogError(code, msg);
    }
  }
}
