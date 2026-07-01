import { Component, OnInit } from '@angular/core';
import { MaterialCatalogService, MaterialCatalogError } from 'src/app/services/material-catalog.service';
import { Material } from 'src/app/core/models/job';

/**
 * F15 — จัดการวัสดุ (materials master). admin เพิ่ม/แก้ ยี่ห้อ × ชนิด + หน้ากว้างม้วน + ต้นทุน.
 * ใช้ทำ dropdown ฟอร์มบันทึกการพิมพ์ + คิดเศษ/ต้นทุน. ดู docs/F15-PRODUCTION-MATERIAL.md §6.2
 */
const CATEGORY_LABEL: Record<string, string> = { vinyl: 'ไวนิล', sticker: 'สติกเกอร์' };

interface EditModel {
  isNew: boolean;
  material_id?: string;
  category: 'vinyl' | 'sticker';
  brand: string;
  label: string;
  rollWidthsText: string;     // คั่นด้วย comma เพื่อกรอกง่าย ("1.12, 1.62")
  cost_per_sqm: number | null;
  is_active: boolean;
}

interface CatGroup { category: string; label: string; items: Material[] }

@Component({
  selector: 'app-material',
  templateUrl: './material.component.html',
})
export class MaterialComponent implements OnInit {
  materials: Material[] = [];
  loading = false;
  error = '';
  editing: EditModel | null = null;
  saving = false;
  saveErr = '';

  constructor(private svc: MaterialCatalogService) {}

  ngOnInit(): void { void this.load(); }

  async load(): Promise<void> {
    this.loading = true; this.error = '';
    try {
      this.materials = await this.svc.list(true);
    } catch (e) {
      this.error = e instanceof MaterialCatalogError ? e.message : 'โหลดวัสดุไม่สำเร็จ';
    } finally {
      this.loading = false;
    }
  }

  get groups(): CatGroup[] {
    return (['vinyl', 'sticker'] as const).map((c) => ({
      category: c, label: CATEGORY_LABEL[c],
      items: this.materials.filter((m) => m.category === c).sort((a, b) => a.brand.localeCompare(b.brand)),
    })).filter((g) => g.items.length > 0);
  }

  startNew(): void {
    this.saveErr = '';
    this.editing = { isNew: true, category: 'vinyl', brand: '', label: '', rollWidthsText: '1.12, 1.32, 1.62, 2.22, 2.62, 3.22', cost_per_sqm: null, is_active: true };
  }

  startEdit(m: Material): void {
    this.saveErr = '';
    this.editing = {
      isNew: false, material_id: m.id, category: m.category, brand: m.brand, label: m.label,
      rollWidthsText: (m.roll_widths_m ?? []).join(', '), cost_per_sqm: m.cost_per_sqm, is_active: m.is_active,
    };
  }

  cancel(): void { this.editing = null; this.saveErr = ''; }

  private parseWidths(text: string): number[] {
    return text.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
  }

  async save(): Promise<void> {
    const e = this.editing;
    if (!e) return;
    this.saveErr = '';
    if (!e.brand.trim()) { this.saveErr = 'ต้องระบุยี่ห้อ'; return; }
    if (!e.label.trim()) { this.saveErr = 'ต้องระบุชื่อแสดงผล'; return; }
    const widths = this.parseWidths(e.rollWidthsText);
    if (widths.length === 0) { this.saveErr = 'ต้องระบุหน้ากว้างม้วนอย่างน้อย 1 ค่า (คั่นด้วย ,)'; return; }

    this.saving = true;
    try {
      await this.svc.upsert({
        ...(e.material_id ? { material_id: e.material_id } : {}),
        category: e.category,
        brand: e.brand.trim(),
        label: e.label.trim(),
        roll_widths_m: widths,
        cost_per_sqm: e.cost_per_sqm === null || (e.cost_per_sqm as unknown as string) === '' ? null : Number(e.cost_per_sqm),
        is_active: e.is_active,
      });
      this.editing = null;
      await this.load();
    } catch (err) {
      this.saveErr = err instanceof MaterialCatalogError ? err.message : 'บันทึกไม่สำเร็จ';
    } finally {
      this.saving = false;
    }
  }

  async toggleActive(m: Material): Promise<void> {
    this.saving = true; this.saveErr = '';
    try {
      await this.svc.upsert({
        material_id: m.id, category: m.category, brand: m.brand, label: m.label,
        roll_widths_m: m.roll_widths_m, cost_per_sqm: m.cost_per_sqm, is_active: !m.is_active,
      });
      await this.load();
    } catch (err) {
      this.saveErr = err instanceof MaterialCatalogError ? err.message : 'สลับสถานะไม่สำเร็จ';
    } finally {
      this.saving = false;
    }
  }

  categoryLabel(c: string): string { return CATEGORY_LABEL[c] ?? c; }
  trackById = (_i: number, m: Material): string => m.id;
}
