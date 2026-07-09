import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StockError, StockService } from 'src/app/services/stock.service';
import { StockReport, StockReportRow } from 'src/app/core/models/stock';

/**
 * F17 S2 — หน้าปริ้นรายงานสต๊อกรายเดือน (HTML → print → PDF, pattern เดียวกับใบเสร็จ F14)
 * route: /naikit-sticker/stock-print/:period (นอก MainLayout — หน้าสะอาดสำหรับกระดาษ)
 * โครงตามชีท "สรุป" Excel เดิม: ต่อรายการ ยกมา/รับ/ใช้/ส่วนต่าง/คงเหลือ เรียงตามหมวด
 */

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

interface PrintGroup { name: string; rows: StockReportRow[]; totalValue: number }

@Component({
  selector: 'app-stock-print',
  templateUrl: './stock-print.component.html',
})
export class StockPrintComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private stock = inject(StockService);

  period = '';
  report: StockReport | null = null;
  groups: PrintGroup[] = [];
  watchRows: StockReportRow[] = [];
  loading = true;
  error = '';
  generatedAt = new Date();

  get periodLabel(): string {
    if (!/^\d{6}$/.test(this.period)) return this.period;
    const y = Number(this.period.slice(0, 4)) + 543;
    const m = Number(this.period.slice(4, 6));
    return `${THAI_MONTHS[m - 1] ?? ''} ${y}`;
  }

  get grandTotalValue(): number {
    return Math.round(this.groups.reduce((s, g) => s + g.totalValue, 0) * 100) / 100;
  }

  async ngOnInit(): Promise<void> {
    this.period = this.route.snapshot.paramMap.get('period') ?? '';
    // ต้องรอ master (ชื่อหมวด) — attach listener ชั่วคราวเพื่อ resolve ชื่อ
    const detach = this.stock.attachListeners();
    try {
      this.report = await this.stock.computeReport(this.period);
      // รอ categories โหลด (listener แรกยิงเร็ว — poll สั้นๆ พอ)
      for (let i = 0; i < 50 && this.stock.categories().length === 0; i++) {
        await new Promise((r) => setTimeout(r, 100));
      }
      const cats = this.stock.categories();
      this.groups = cats
        .map((c) => {
          const rows = (this.report?.rows ?? []).filter((r) => r.category_id === c.id);
          return {
            name: c.name, rows,
            totalValue: Math.round(rows.reduce((s, r) => s + (r.closing_value ?? 0), 0) * 100) / 100,
          };
        })
        .filter((g) => g.rows.length > 0);
      this.watchRows = (this.report?.rows ?? []).filter(
        (r) => r.adjusted !== 0 || (r.min_qty !== null && r.closing < r.min_qty),
      );
    } catch (e) {
      this.error = e instanceof StockError ? e.message : 'โหลดรายงานไม่สำเร็จ';
    } finally {
      this.loading = false;
      detach();
    }
  }

  print(): void { window.print(); }
}
