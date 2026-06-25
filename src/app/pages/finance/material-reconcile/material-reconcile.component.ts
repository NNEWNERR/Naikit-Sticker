import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MaterialService, MaterialError } from 'src/app/services/material.service';
import { MaterialCode, MaterialReconcileLine } from 'src/app/core/models/material-reconcile';

const MATERIAL_LABEL: Record<MaterialCode, string> = {
  vinyl: 'ไวนิล',
  sticker_print: 'สติกเกอร์พิมพ์',
  sticker_cut: 'สติกเกอร์ตัด',
  stamp: 'ตรายาง',
  other: 'อื่นๆ',
};
const UNIT_LABEL: Record<string, string> = { sqm: 'ตร.ม.', unit: 'ดวง' };

/**
 * F14 ชั้น B — panel reconcile วัสดุรายเดือน (advisory, finance/admin).
 * เลือกเดือน → โหลดพื้นที่/จำนวนที่งานในระบบควรใช้ → กรอกจำนวนม้วน/หน่วยที่ใช้จริง +
 * สมมติฐานแปลง → ระบบโชว์ variance (สูง = อาจมีงานนอกระบบ). ดูแนวโน้มหลายเดือน.
 */
@Component({
  standalone: true,
  selector: 'app-material-reconcile',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="border-2 border-ink rounded-lg p-4 bg-white">
      <header class="flex items-center justify-between gap-2 mb-1 flex-wrap">
        <h3 class="text-h3 m-0">🧪 Reconcile วัสดุ (รายเดือน)</h3>
        <div class="flex items-center gap-2">
          <input type="month" [(ngModel)]="month"
            class="input-base text-[13px] font-semibold border-2 border-ink rounded px-2 py-1" />
          <button type="button" (click)="load()" [disabled]="loading"
            class="px-3 py-1.5 border-2 border-ink rounded font-bold text-[13px] bg-white hover:bg-surface-2 cursor-pointer disabled:opacity-50">
            {{ loading ? 'โหลด…' : 'โหลด' }}
          </button>
        </div>
      </header>
      <p class="text-[12px] text-ink-3 font-semibold m-0 mb-3">
        เทียบวัสดุที่งาน “ส่งมอบแล้ว” ในเดือนควรใช้ กับที่เบิกจริง — ส่วนต่างสูง = อาจมีงานนอกระบบ (ดูแนวโน้มหลายเดือน, สต๊อกไม่แม่นเป็นเรื่องปกติ)
      </p>

      <p *ngIf="error" class="text-[13px] font-bold text-red-700 m-0 mb-2" role="alert">{{ error }}</p>
      <p *ngIf="notice" class="text-[13px] font-bold text-green-700 m-0 mb-2" role="status">{{ notice }}</p>

      <div *ngIf="loaded && lines.length === 0" class="text-[13px] text-ink-3 font-semibold py-4 text-center">
        ไม่มีงานส่งมอบในเดือนนี้
      </div>

      <div *ngIf="lines.length" class="overflow-x-auto">
        <table class="w-full text-[13px] border-collapse">
          <thead>
            <tr class="border-b-2 border-ink text-left">
              <th class="py-1 pr-2 font-extrabold">วัสดุ</th>
              <th class="py-1 px-2 font-extrabold text-right">ในระบบ</th>
              <th class="py-1 px-2 font-extrabold text-right">ใช้จริง</th>
              <th class="py-1 px-2 font-extrabold text-right">ต่อหน่วย</th>
              <th class="py-1 px-2 font-extrabold text-right">รวมใช้จริง</th>
              <th class="py-1 pl-2 font-extrabold text-right">ส่วนต่าง</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let l of lines" class="border-b border-ink/30">
              <td class="py-1.5 pr-2 font-bold">{{ label(l.material) }}</td>
              <td class="py-1.5 px-2 text-right whitespace-nowrap">{{ l.system_qty | number:'1.0-2' }} {{ unit(l.unit) }}</td>
              <td class="py-1.5 px-2 text-right">
                <input type="number" min="0" [(ngModel)]="l.counted_input"
                  class="input-base w-16 text-right border-2 border-ink rounded px-1 py-0.5 text-[13px]" />
              </td>
              <td class="py-1.5 px-2 text-right">
                <input type="number" min="0" [(ngModel)]="l.assumed_per_unit"
                  class="input-base w-16 text-right border-2 border-ink rounded px-1 py-0.5 text-[13px]" />
              </td>
              <td class="py-1.5 px-2 text-right whitespace-nowrap">{{ implied(l) | number:'1.0-2' }}</td>
              <td class="py-1.5 pl-2 text-right whitespace-nowrap font-bold"
                  [ngClass]="flagClass(l)">
                {{ varianceOf(l) | number:'1.0-2' }}
                <span *ngIf="l.system_qty > 0" class="text-[11px]">({{ variancePct(l) | number:'1.0-0' }}%)</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="mt-3 flex items-center gap-2 flex-wrap">
          <input type="text" [(ngModel)]="note" placeholder="หมายเหตุ (ถ้ามี)"
            class="input-base flex-1 min-w-[140px] border-2 border-ink rounded px-2 py-1 text-[13px] font-semibold" />
          <button type="button" (click)="save()" [disabled]="saving"
            class="px-4 py-1.5 border-2 border-ink rounded font-extrabold text-[13px] bg-ink text-brand hover:opacity-90 cursor-pointer disabled:opacity-50">
            {{ saving ? 'บันทึก…' : 'บันทึก' }}
          </button>
        </div>
        <p class="text-[11px] text-ink-3 font-semibold mt-2 m-0">
          * ต่อหน่วย = สมมติฐานแปลง 1 ม้วน/หน่วยเป็น ตร.ม./ดวง (เช่น ไวนิล 1 ม้วน ≈ 60 ตร.ม.)
        </p>
      </div>
    </section>
  `,
})
export class MaterialReconcileComponent implements OnInit {
  private svc = inject(MaterialService);

  month = '';                    // 'YYYY-MM' (input type=month)
  lines: MaterialReconcileLine[] = [];
  note = '';
  loading = false;
  saving = false;
  loaded = false;
  error = '';
  notice = '';

  ngOnInit(): void {
    const d = new Date();
    this.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private period(): string { return this.month.replace('-', ''); }

  async load(): Promise<void> {
    this.loading = true; this.error = ''; this.notice = '';
    try {
      const res = await this.svc.computeSummary(this.period());
      this.lines = res.lines;
      this.note = res.note ?? '';
      this.loaded = true;
    } catch (e) {
      this.error = e instanceof MaterialError ? e.message : 'โหลดไม่สำเร็จ';
    } finally {
      this.loading = false;
    }
  }

  async save(): Promise<void> {
    this.saving = true; this.error = ''; this.notice = '';
    try {
      await this.svc.save(
        this.period(),
        this.lines.map((l) => ({
          material: l.material,
          counted_input: Number(l.counted_input) || 0,
          assumed_per_unit: Number(l.assumed_per_unit) || 0,
        })),
        this.note.trim(),
      );
      this.notice = 'บันทึกแล้ว';
    } catch (e) {
      this.error = e instanceof MaterialError ? e.message : 'บันทึกไม่สำเร็จ';
    } finally {
      this.saving = false;
    }
  }

  // live recompute (ฝั่ง client เพื่อแสดงผล — server re-derive ตอน save)
  implied(l: MaterialReconcileLine): number {
    return (Number(l.counted_input) || 0) * (Number(l.assumed_per_unit) || 0);
  }
  varianceOf(l: MaterialReconcileLine): number {
    return this.implied(l) - l.system_qty;
  }
  variancePct(l: MaterialReconcileLine): number {
    return l.system_qty > 0 ? (this.varianceOf(l) / l.system_qty) * 100 : 0;
  }
  flagClass(l: MaterialReconcileLine): string {
    if (l.system_qty <= 0 || !l.counted_input) return 'text-ink-3';
    const pct = Math.abs(this.variancePct(l));
    return pct >= 30 ? 'text-red-700' : pct >= 15 ? 'text-amber-600' : 'text-green-700';
  }

  label(m: MaterialCode): string { return MATERIAL_LABEL[m] ?? m; }
  unit(u: string): string { return UNIT_LABEL[u] ?? u; }
}
