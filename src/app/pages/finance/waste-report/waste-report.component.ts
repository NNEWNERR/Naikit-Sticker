import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DefectService, DefectError } from '../../../services/defect.service';
import { WasteSummary } from '../../../core/models/job';

/**
 * F15 — เศษวัสดุ + งานเสีย รายเดือน (finance/admin). เรียก computeWasteSummary({period})
 * → การ์ดเศษรวม + แยกคนพิมพ์/ยี่ห้อ + งานเสียแยกสาเหตุ + TOP งานเศษสูง.
 * ดู docs/F15-PRODUCTION-MATERIAL.md §6.3
 */
@Component({
  selector: 'app-waste-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 class="text-h3 m-0">เศษวัสดุ + งานเสีย</h3>
          <p class="text-body-sm text-ink-3 m-0">ตรวจวัสดุที่ใช้จริง vs เนื้องาน + งานพิมพ์เสีย แยกคน/ยี่ห้อ (F15)</p>
        </div>
        <label class="flex items-center gap-2 text-body-sm">เดือน
          <input type="month" class="input-base focus-ring" [(ngModel)]="month" (ngModelChange)="reload()">
        </label>
      </div>

      <p *ngIf="loading" class="text-body-sm text-ink-3 m-0">กำลังคำนวณ…</p>
      <p *ngIf="err" class="text-body-sm text-red-700 font-semibold m-0">{{ err }}</p>

      <ng-container *ngIf="data() as d">
        <!-- totals -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div class="p-3 border-2 border-ink rounded bg-surface-2">
            <div class="text-[11px] text-ink-3">วัสดุใช้จริง</div>
            <div class="text-h4 font-num">{{ d.totals.area_used }} <span class="text-body-sm">ตร.ม.</span></div>
          </div>
          <div class="p-3 border-2 border-ink rounded bg-surface-2">
            <div class="text-[11px] text-ink-3">เนื้องาน (คิดเงิน)</div>
            <div class="text-h4 font-num">{{ d.totals.area_billed }} <span class="text-body-sm">ตร.ม.</span></div>
          </div>
          <div class="p-3 border-2 border-ink rounded"
               [class.bg-warn-bg]="d.totals.waste_pct >= 30 && d.totals.waste_pct < 50"
               [class.bg-danger-bg]="d.totals.waste_pct >= 50" [class.bg-surface-2]="d.totals.waste_pct < 30">
            <div class="text-[11px] text-ink-3">เศษรวม</div>
            <div class="text-h4 font-num">{{ d.totals.waste_pct }}% <span class="text-body-sm">({{ d.totals.waste_sqm }})</span></div>
          </div>
          <div class="p-3 border-2 border-ink rounded bg-surface-2">
            <div class="text-[11px] text-ink-3">งานเสีย</div>
            <div class="text-h4 font-num">{{ d.totals.defect_area }} <span class="text-body-sm">ตร.ม. ({{ d.totals.defect_count }})</span></div>
          </div>
        </div>

        <!-- by printer -->
        <div *ngIf="d.by_printer.length" class="flex flex-col gap-1">
          <h4 class="text-h4 m-0">เศษแยกคนพิมพ์</h4>
          <div *ngFor="let r of d.by_printer" class="flex items-center justify-between gap-2 p-2 border border-ink rounded bg-surface-3 text-body-sm">
            <span class="font-bold">{{ r.name }}</span>
            <span class="font-num">{{ r.count }} งาน · ใช้ {{ r.area_used }} · เศษ
              <span class="font-bold" [class.text-danger]="r.waste_pct >= 50">{{ r.waste_pct }}%</span></span>
          </div>
        </div>

        <!-- by material -->
        <div *ngIf="d.by_material.length" class="flex flex-col gap-1">
          <h4 class="text-h4 m-0">เศษแยกยี่ห้อ</h4>
          <div *ngFor="let r of d.by_material" class="flex items-center justify-between gap-2 p-2 border border-ink rounded bg-surface-3 text-body-sm">
            <span class="font-bold">{{ r.name }}</span>
            <span class="font-num">{{ r.count }} งาน · ใช้ {{ r.area_used }} · เศษ
              <span class="font-bold" [class.text-danger]="r.waste_pct >= 50">{{ r.waste_pct }}%</span></span>
          </div>
        </div>

        <!-- defects by reason -->
        <div *ngIf="d.defects_by_reason.length" class="flex flex-col gap-1">
          <h4 class="text-h4 m-0">งานเสียแยกสาเหตุ</h4>
          <div *ngFor="let r of d.defects_by_reason" class="flex items-center justify-between gap-2 p-2 border border-ink rounded bg-danger-bg text-body-sm">
            <span class="font-bold">{{ r.reason }}</span>
            <span class="font-num">{{ r.qty }} ชิ้น · {{ r.area }} ตร.ม. ({{ r.count }} ครั้ง)</span>
          </div>
        </div>

        <!-- top waste -->
        <div *ngIf="d.top_waste.length" class="flex flex-col gap-1">
          <h4 class="text-h4 m-0">🔴 TOP งานเศษสูง</h4>
          <div *ngFor="let r of d.top_waste" class="flex items-center justify-between gap-2 p-2 border border-ink rounded bg-surface-3 text-[12px]">
            <span class="font-bold">{{ r.serial_number }}</span>
            <span class="text-ink-3">{{ r.material_label }}</span>
            <span class="font-num">ใช้ {{ r.area_used }} / คิด {{ r.area_billed }} · เศษ
              <span class="font-bold text-danger">{{ r.waste_pct }}%</span></span>
          </div>
        </div>

        <p *ngIf="!d.by_printer.length && !d.defects_by_reason.length" class="text-body-sm text-ink-3 m-0">
          ยังไม่มีข้อมูลบันทึกการพิมพ์/งานเสียในเดือนนี้
        </p>
      </ng-container>
    </div>
  `,
})
export class WasteReportComponent implements OnInit {
  month = this.currentMonth();
  loading = false;
  err = '';
  private _data: WasteSummary | null = null;
  data(): WasteSummary | null { return this._data; }

  constructor(private readonly svc: DefectService) {}

  ngOnInit(): void { void this.reload(); }

  private currentMonth(): string {
    const ict = new Date(Date.now() + 7 * 3600 * 1000);
    return `${ict.getUTCFullYear()}-${String(ict.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  async reload(): Promise<void> {
    const period = (this.month || '').replace('-', '');
    if (!/^\d{6}$/.test(period)) return;
    this.loading = true; this.err = '';
    try {
      this._data = await this.svc.wasteSummary(period);
    } catch (e) {
      this.err = e instanceof DefectError ? e.message : 'โหลดรายงานไม่สำเร็จ';
    } finally {
      this.loading = false;
    }
  }
}
