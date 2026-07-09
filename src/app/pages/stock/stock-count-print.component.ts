import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StockService } from 'src/app/services/stock.service';
import { StockItem } from 'src/app/core/models/stock';

/**
 * F17 S2.1 — ใบนับสต๊อกแบบพิมพ์ (เดินนับด้วยกระดาษ ไม่ต้องพกโทรศัพท์ แล้วค่อยคีย์ผลในแท็บนับสต๊อก)
 * route: /naikit-sticker/stock-count-print?cats=<id,id,...>  (ไม่ส่ง = ทุกหมวด)
 *        หรือ ?items=<id,id,...>  (ชุดสุ่มตรวจ — พิมพ์เฉพาะรายการที่ระบบเลือก)
 * ตั้งใจ**ไม่พิมพ์ยอดคงเหลือในระบบ** — blind count เหมือนหน้าจอ (กันนับตามตัวเลข)
 */

interface PrintGroup { name: string; items: StockItem[] }

@Component({
  selector: 'app-stock-count-print',
  templateUrl: './stock-count-print.component.html',
})
export class StockCountPrintComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private stock = inject(StockService);
  private detach: (() => void) | null = null;

  groups: PrintGroup[] = [];
  totalItems = 0;
  isSpot = false;
  loading = true;
  today = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

  async ngOnInit(): Promise<void> {
    this.detach = this.stock.attachListeners();
    // รอ master โหลด (listener ยิงครั้งแรกเร็ว — poll สั้นๆ)
    for (let i = 0; i < 50 && (this.stock.items().length === 0 || this.stock.categories().length === 0); i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    const qp = this.route.snapshot.queryParamMap;
    const itemsParam = (qp.get('items') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const catsParam = (qp.get('cats') ?? '').split(',').map((s) => s.trim()).filter(Boolean);

    const all = this.stock.items().filter((i) => i.is_active);
    let picked: StockItem[];
    if (itemsParam.length > 0) {
      this.isSpot = true;
      const want = new Set(itemsParam);
      picked = all.filter((i) => want.has(i.id));
    } else if (catsParam.length > 0) {
      const want = new Set(catsParam);
      picked = all.filter((i) => want.has(i.category_id));
    } else {
      picked = all;
    }

    this.groups = this.stock.categories()
      .map((c) => ({ name: c.name, items: picked.filter((i) => i.category_id === c.id) }))
      .filter((g) => g.items.length > 0);
    this.totalItems = picked.length;
    this.loading = false;
  }

  ngOnDestroy(): void { this.detach?.(); }

  print(): void { window.print(); }
}
