import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Backing, Material, ProductionInput, WorkItem } from '../../../core/models/job';
import { MaterialCatalogService, WastePreview, categoryOfType } from '../../../services/material-catalog.service';
import { taskKeyForType } from '../../../core/data/work-item-catalog';

/** state ต่อ 1 work_item ในฟอร์มบันทึกการพิมพ์ */
interface Row {
  material_id: string;
  backing: Backing;
  roll_width_m: number | null;
  length_used_m: number | null;
  qty_printed: number | null;
  preview: WastePreview | null;
}

/** work_item + index เดิมใน job.work_items (คงไว้หลัง filter ตาม task) */
interface Entry { wi: WorkItem; index: number; }

const BACKINGS: Backing[] = ['หลังขาว', 'หลังดำ', 'หลังเทา'];

/**
 * F15 — ฟอร์มบันทึกการพิมพ์ (คนพิมพ์กรอกตอน upload_print). 1 แถวต่อ work_item **ของ task นี้**:
 * เลือกวัสดุ/ม้วน/ความยาว/จำนวน → โชว์เศษ% สด (server คำนวณซ้ำเป็นตัวจริง). emit เฉพาะแถวที่กรอกครบ.
 *
 * scope: ถ้ากำหนด `taskKey` จะโชว์เฉพาะ work_item ที่เป็นของ task นั้น (กันคนพิมพ์เครื่องหนึ่งกรอกวัสดุ
 * ให้ item ของอีกเครื่อง → attribution ผิด/เขียนทับ; BE reject ซ้ำอีกชั้น). ดู docs/F15-PRODUCTION-MATERIAL.md §3
 */
@Component({
  selector: 'app-print-log-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-2" *ngIf="entries.length">
      <span class="text-body-sm font-semibold">บันทึกการพิมพ์ (วัสดุ/เศษ — ไม่บังคับ)</span>
      <div *ngFor="let e of entries"
           class="p-2 border border-ink rounded bg-surface-3 flex flex-col gap-1.5">
        <div class="text-[12px] text-ink-3 font-semibold">
          {{ e.wi.type }} · {{ e.wi.width }}×{{ e.wi.height }} {{ e.wi.unit_of_length }} × {{ e.wi.quantity }} ชิ้น
        </div>
        <div class="grid grid-cols-2 gap-1.5">
          <label class="flex flex-col gap-0.5">
            <span class="text-[11px] text-ink-3">ยี่ห้อวัสดุ</span>
            <select class="input-base focus-ring w-full text-body-sm" [(ngModel)]="rows[e.index].material_id"
                    (ngModelChange)="onMaterialChange(e.index)">
              <option value="">— เลือก —</option>
              <option *ngFor="let m of materialsFor(e.wi)" [value]="m.id">{{ m.brand }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-0.5" *ngIf="categoryOf(e.wi.type) === 'vinyl'">
            <span class="text-[11px] text-ink-3">ด้านหลัง</span>
            <select class="input-base focus-ring w-full text-body-sm" [(ngModel)]="rows[e.index].backing" (ngModelChange)="emit()">
              <option value="">—</option>
              <option *ngFor="let b of backings" [value]="b">{{ b }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-0.5">
            <span class="text-[11px] text-ink-3">หน้ากว้างม้วน (ม.)</span>
            <select class="input-base focus-ring w-full text-body-sm" [(ngModel)]="rows[e.index].roll_width_m"
                    (ngModelChange)="recompute(e.index)">
              <option [ngValue]="null">—</option>
              <option *ngFor="let w of rollWidthsFor(e.index)" [ngValue]="w">{{ w }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-0.5">
            <span class="text-[11px] text-ink-3">ความยาวรวมบนม้วน (ม.)</span>
            <input type="number" min="0" step="0.01" class="input-base focus-ring w-full text-body-sm font-num"
                   [(ngModel)]="rows[e.index].length_used_m" (ngModelChange)="recompute(e.index)">
          </label>
          <label class="flex flex-col gap-0.5">
            <span class="text-[11px] text-ink-3">จำนวนพิมพ์จริง</span>
            <input type="number" min="1" step="1" class="input-base focus-ring w-full text-body-sm font-num"
                   [(ngModel)]="rows[e.index].qty_printed" (ngModelChange)="recompute(e.index)">
          </label>
        </div>

        <div *ngIf="rows[e.index].preview as pv" class="text-[12px] font-semibold px-2 py-1 rounded"
             [class.bg-surface-2]="pv.waste_severity === 'none'"
             [class.text-ink-3]="pv.waste_severity === 'none'"
             [class.bg-warn-bg]="pv.waste_severity === 'soft'"
             [class.bg-danger-bg]="pv.waste_severity === 'hard'"
             [class.text-danger]="pv.waste_severity === 'hard'">
          📐 วัสดุ {{ pv.area_used_sqm }} · เนื้องาน {{ pv.area_billed_sqm }} ตร.ม.
          <ng-container *ngIf="pv.waste_reliable">· ♻️ เศษ {{ pv.waste_pct }}%</ng-container>
          <span *ngIf="!pv.waste_reliable" class="text-ink-3"> · ♻️ เศษ (สติกเกอร์ — รอจับกลุ่ม roll run)</span>
          <span *ngIf="pv.paneled"> · ต่อผ้า</span>
          <span *ngIf="pv.waste_severity === 'hard'"> ⚠️ เศษสูงผิดปกติ — ตรวจหน้าม้วน?</span>
        </div>
      </div>
    </div>
  `,
})
export class PrintLogFormComponent implements OnChanges {
  @Input() workItems: WorkItem[] = [];
  @Input() materials: Material[] = [];
  /** ถ้ากำหนด → โชว์เฉพาะ work_item ของ task นี้ (task key = eligible เรียง+join). '' = โชว์ทั้งหมด */
  @Input() taskKey = '';
  /** emit เฉพาะแถวที่กรอกครบ (material + roll + length + qty) */
  @Output() inputsChange = new EventEmitter<ProductionInput[]>();

  /** work_item ที่แสดง (scope ตาม task) — คง index เดิมไว้สำหรับ payload */
  entries: Entry[] = [];
  /** state ต่อแถว keyed by index เดิมใน job.work_items */
  rows: Record<number, Row> = {};
  readonly backings = BACKINGS;
  readonly categoryOf = categoryOfType;

  constructor(private readonly catalog: MaterialCatalogService) {}

  ngOnChanges(c: SimpleChanges): void {
    if (c['workItems'] || c['taskKey']) {
      this.entries = this.workItems
        .map((wi, index) => ({ wi, index }))
        .filter((e) => !this.taskKey || taskKeyForType(e.wi.type) === this.taskKey);
      this.rows = {};
      for (const e of this.entries) {
        this.rows[e.index] = {
          material_id: '',
          backing: '',
          roll_width_m: null,
          length_used_m: null,
          qty_printed: e.wi.quantity ?? 1,
          preview: null,
        };
      }
    }
  }

  materialsFor(wi: WorkItem): Material[] {
    return this.catalog.filterByCategory(this.materials, categoryOfType(wi.type));
  }

  rollWidthsFor(i: number): number[] {
    const m = this.materials.find((x) => x.id === this.rows[i]?.material_id);
    return m?.roll_widths_m ?? [];
  }

  onMaterialChange(i: number): void {
    // เปลี่ยนวัสดุ → reset หน้ากว้างม้วนที่ไม่อยู่ในวัสดุใหม่
    const widths = this.rollWidthsFor(i);
    if (this.rows[i].roll_width_m != null && !widths.includes(this.rows[i].roll_width_m as number)) {
      this.rows[i].roll_width_m = null;
    }
    this.recompute(i);
  }

  recompute(i: number): void {
    const r = this.rows[i];
    const wi = this.workItems[i];
    if (r.roll_width_m && r.qty_printed) {
      r.preview = this.catalog.preview(
        wi,
        { roll_width_m: r.roll_width_m, length_used_m: r.length_used_m ?? 0, qty_printed: r.qty_printed },
        { category: categoryOfType(wi.type) },
      );
    } else {
      r.preview = null;
    }
    this.emit();
  }

  emit(): void {
    const inputs: ProductionInput[] = [];
    for (const e of this.entries) {
      const r = this.rows[e.index];
      if (r.material_id && r.roll_width_m && (r.length_used_m ?? 0) > 0 && (r.qty_printed ?? 0) > 0) {
        inputs.push({
          work_item_index: e.index,
          material_id: r.material_id,
          backing: r.backing,
          roll_width_m: r.roll_width_m,
          length_used_m: r.length_used_m as number,
          qty_printed: r.qty_printed as number,
        });
      }
    }
    this.inputsChange.emit(inputs);
  }
}
