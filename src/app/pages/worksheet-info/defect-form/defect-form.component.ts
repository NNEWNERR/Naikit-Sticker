import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DEFECT_REASONS, DefectReason, Material, WorkItem } from '../../../core/models/job';
import { DefectService, DefectError } from '../../../services/defect.service';
import { categoryOfType } from '../../../services/material-catalog.service';

/**
 * F15 — ฟอร์มบันทึกงานเสีย (seller เจ้าของงาน + production/graphic/admin). เลือกรายการ(ถ้ามี) +
 * สาเหตุ + วัสดุ/ม้วน/ความยาว/จำนวน → โชว์พื้นที่วัสดุที่เสียสด → recordDefect.
 * ดู docs/F15-PRODUCTION-MATERIAL.md §6.1
 */
@Component({
  selector: 'app-defect-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <details class="border-2 border-ink rounded bg-surface-2">
      <summary class="px-3 py-2 font-bold text-body-sm cursor-pointer select-none">🗑️ บันทึกงานเสีย</summary>
      <div class="p-3 flex flex-col gap-2 border-t-2 border-ink">
        <div class="grid grid-cols-2 gap-2">
          <label class="flex flex-col gap-0.5 col-span-2">
            <span class="text-[11px] text-ink-3">รายการที่เสีย (ถ้าระบุได้)</span>
            <select class="input-base focus-ring w-full text-body-sm" [(ngModel)]="workItemIndex" (ngModelChange)="onItemChange()">
              <option [ngValue]="null">— ไม่ระบุ / ทั้งงาน —</option>
              <option *ngFor="let wi of workItems; let i = index" [ngValue]="i">
                {{ wi.type }} {{ wi.width }}×{{ wi.height }} {{ wi.unit_of_length }}
              </option>
            </select>
          </label>
          <label class="flex flex-col gap-0.5">
            <span class="text-[11px] text-ink-3">สาเหตุ</span>
            <select class="input-base focus-ring w-full text-body-sm" [(ngModel)]="reason">
              <option *ngFor="let r of reasons" [value]="r">{{ r }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-0.5">
            <span class="text-[11px] text-ink-3">ยี่ห้อวัสดุ</span>
            <select class="input-base focus-ring w-full text-body-sm" [(ngModel)]="materialId" (ngModelChange)="onMaterialChange()">
              <option value="">— เลือก —</option>
              <option *ngFor="let m of materialOptions()" [value]="m.id">{{ m.brand }} ({{ m.category === 'vinyl' ? 'ไวนิล' : 'สติกเกอร์' }})</option>
            </select>
          </label>
          <label class="flex flex-col gap-0.5">
            <span class="text-[11px] text-ink-3">หน้ากว้างม้วน (ม.)</span>
            <select class="input-base focus-ring w-full text-body-sm" [(ngModel)]="rollWidth" (ngModelChange)="recompute()">
              <option [ngValue]="null">—</option>
              <option *ngFor="let w of rollWidths()" [ngValue]="w">{{ w }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-0.5">
            <span class="text-[11px] text-ink-3">ความยาวที่เสีย (ม.)</span>
            <input type="number" min="0" step="0.01" class="input-base focus-ring w-full text-body-sm font-num"
                   [(ngModel)]="lengthUsed" (ngModelChange)="recompute()">
          </label>
          <label class="flex flex-col gap-0.5">
            <span class="text-[11px] text-ink-3">จำนวนที่เสีย</span>
            <input type="number" min="1" step="1" class="input-base focus-ring w-full text-body-sm font-num"
                   [(ngModel)]="qty" (ngModelChange)="recompute()">
          </label>
          <label class="flex flex-col gap-0.5 col-span-2" *ngIf="reason === 'อื่นๆ'">
            <span class="text-[11px] text-ink-3">รายละเอียด (บังคับเมื่อเลือก "อื่นๆ")</span>
            <input type="text" maxlength="500" class="input-base focus-ring w-full text-body-sm" [(ngModel)]="detail">
          </label>
          <label class="flex flex-col gap-0.5 col-span-2" *ngIf="reason !== 'อื่นๆ'">
            <span class="text-[11px] text-ink-3">รายละเอียดเพิ่มเติม (ถ้ามี)</span>
            <input type="text" maxlength="500" class="input-base focus-ring w-full text-body-sm" [(ngModel)]="detail">
          </label>
        </div>

        <div *ngIf="areaWasted() > 0" class="text-[12px] font-semibold px-2 py-1 rounded bg-danger-bg text-danger">
          ♻️ วัสดุที่เสีย ≈ {{ areaWasted() }} ตร.ม.
        </div>
        <p *ngIf="err" class="text-[12px] text-red-700 font-semibold m-0">{{ err }}</p>

        <button type="button" (click)="submit()" [disabled]="saving || !canSubmit()"
                class="self-start px-3 py-1.5 bg-danger-bg border-2 border-ink rounded font-bold text-body-sm cursor-pointer disabled:opacity-50">
          {{ saving ? 'กำลังบันทึก…' : 'บันทึกงานเสีย' }}
        </button>
      </div>
    </details>
  `,
})
export class DefectFormComponent {
  @Input() jobId = '';
  @Input() workItems: WorkItem[] = [];
  @Input() materials: Material[] = [];
  @Output() saved = new EventEmitter<void>();

  readonly reasons = DEFECT_REASONS;
  workItemIndex: number | null = null;
  reason: DefectReason = 'ตัดเสีย';
  materialId = '';
  rollWidth: number | null = null;
  lengthUsed: number | null = null;
  qty = 1;
  detail = '';
  saving = false;
  err = '';

  constructor(private readonly svc: DefectService) {}

  /** material list — กรองตามชนิดของรายการที่เลือก (ถ้าเลือก) */
  materialOptions(): Material[] {
    const active = this.materials.filter((m) => m.is_active);
    if (this.workItemIndex == null) return active;
    const cat = categoryOfType(this.workItems[this.workItemIndex]?.type);
    return cat ? active.filter((m) => m.category === cat) : active;
  }

  rollWidths(): number[] {
    return this.materials.find((m) => m.id === this.materialId)?.roll_widths_m ?? [];
  }

  onItemChange(): void {
    // เปลี่ยนรายการ → reset วัสดุถ้าไม่อยู่ใน category ใหม่
    if (this.materialId && !this.materialOptions().some((m) => m.id === this.materialId)) {
      this.materialId = '';
      this.rollWidth = null;
    }
  }

  onMaterialChange(): void {
    if (this.rollWidth != null && !this.rollWidths().includes(this.rollWidth)) this.rollWidth = null;
    this.recompute();
  }

  recompute(): void { /* areaWasted คำนวณใน getter */ }

  areaWasted(): number {
    if (!this.rollWidth || !this.lengthUsed || this.lengthUsed <= 0 || this.qty <= 0) return 0;
    return Math.round(this.rollWidth * this.lengthUsed * this.qty * 1000) / 1000;
  }

  canSubmit(): boolean {
    return !!this.materialId && !!this.rollWidth && (this.lengthUsed ?? 0) > 0 && this.qty > 0
      && (this.reason !== 'อื่นๆ' || this.detail.trim().length > 0);
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.saving = true; this.err = '';
    try {
      await this.svc.record({
        job_id: this.jobId || null,
        work_item_index: this.workItemIndex,
        reason: this.reason,
        detail: this.detail.trim(),
        material_id: this.materialId,
        roll_width_m: this.rollWidth as number,
        length_used_m: this.lengthUsed as number,
        qty_spoiled: this.qty,
      });
      // reset
      this.materialId = ''; this.rollWidth = null; this.lengthUsed = null; this.qty = 1; this.detail = '';
      this.saved.emit();
    } catch (e) {
      this.err = e instanceof DefectError ? e.message : 'บันทึกไม่สำเร็จ';
    } finally {
      this.saving = false;
    }
  }
}
