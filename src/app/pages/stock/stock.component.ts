import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { Timestamp } from 'firebase/firestore';
import { AppStateService } from 'src/app/services/app-state.service';
import { ServiceService } from 'src/app/services/service.service';
import { StockError, StockService } from 'src/app/services/stock.service';
import {
  STOCK_BACKDATE_LIMIT_DAYS,
  STOCK_DOC_TYPE_LABEL,
  StockCategory,
  StockCount,
  StockDocLineInput,
  StockDocType,
  StockDocument,
  StockItem,
  StockReport,
  StockReportRow,
} from 'src/app/core/models/stock';

/**
 * F17 — หน้าสต๊อกวัสดุอุปกรณ์ (role: stock/admin เขียน, finance ดูอย่างเดียว)
 * 3 แท็บ: คงเหลือ (dashboard) / ลงบันทึก (คีย์ใบเบิก-รับเข้าจากกระดาษ วันต่อวัน §2.5) /
 * ประวัติ (ledger + void). ดู docs/F17-STOCK-DESIGN.md
 */

type Tab = 'onhand' | 'entry' | 'count' | 'report' | 'history';

interface EntryLine {
  item: StockItem;
  qty: number | null;
  unit_price: number | null;   // เฉพาะรับเข้า
  recipient_name: string;      // เฉพาะใบเบิก — บังคับต่อบรรทัด (ใบรวมรายวัน)
  supplier: string;            // เฉพาะรับเข้า — optional ต่อบรรทัด
  bill_no: string;             // เฉพาะรับเข้า — optional ต่อบรรทัด
}

interface ItemEdit {
  isNew: boolean;
  item_id?: string;
  category_id: string;
  name: string;
  unit: string;
  min_qty: number | null;
  is_active: boolean;
}

@Component({
  selector: 'app-stock',
  templateUrl: './stock.component.html',
})
export class StockComponent implements OnInit, OnDestroy {
  readonly typeLabel = STOCK_DOC_TYPE_LABEL;
  readonly backdateLimit = STOCK_BACKDATE_LIMIT_DAYS;

  tab: Tab = 'onhand';
  private detach: (() => void) | null = null;

  readonly categories = this.stock.categories;
  readonly items = this.stock.items;
  readonly staff = this.stock.staff;
  readonly docs = this.stock.docs;
  readonly counts = this.stock.counts;
  readonly loading = this.stock.loading;

  // ── role helpers ──
  get role(): string { return this.appState.role() ?? ''; }
  get canWrite(): boolean { return this.role === 'stock' || this.role === 'admin'; }
  get isAdmin(): boolean { return this.role === 'admin'; }

  // ── แท็บคงเหลือ ──
  searchTerm = signal('');
  /** หมวดที่เลือกดู ('' = ทุกหมวด) */
  filterCat = signal('');

  readonly filteredGroups = computed(() => {
    const q = this.searchTerm().trim().toLowerCase();
    const cat = this.filterCat();
    const items = this.items().filter((i) =>
      (!cat || i.category_id === cat) &&
      (!q || i.name.toLowerCase().includes(q)),
    );
    return this.categories()
      .map((c) => ({ cat: c, items: items.filter((i) => i.category_id === c.id) }))
      .filter((g) => g.items.length > 0);
  });

  readonly lowStockCount = computed(() =>
    this.items().filter((i) => i.is_active && i.min_qty !== null && i.on_hand < i.min_qty).length,
  );

  isLow(i: StockItem): boolean {
    return i.min_qty !== null && i.on_hand < i.min_qty;
  }

  // ── จัดการรายการ (เพิ่ม: stock/admin · แก้: admin) ──
  itemEdit: ItemEdit | null = null;
  itemSaving = false;
  itemErr = '';

  startNewItem(): void {
    this.itemErr = '';
    const firstCat = this.filterCat() || this.categories()[0]?.id || '';
    this.itemEdit = { isNew: true, category_id: firstCat, name: '', unit: '', min_qty: null, is_active: true };
  }

  startEditItem(i: StockItem): void {
    if (!this.isAdmin) return; // BE ก็กันซ้ำ — ปุ่มโชว์เฉพาะ admin อยู่แล้ว
    this.itemErr = '';
    this.itemEdit = {
      isNew: false, item_id: i.id, category_id: i.category_id,
      name: i.name, unit: i.unit, min_qty: i.min_qty, is_active: i.is_active,
    };
  }

  cancelItem(): void { this.itemEdit = null; this.itemErr = ''; }

  async saveItem(): Promise<void> {
    const e = this.itemEdit;
    if (!e) return;
    this.itemErr = '';
    if (!e.category_id) { this.itemErr = 'เลือกหมวด'; return; }
    if (!e.name.trim()) { this.itemErr = 'ต้องระบุชื่อรายการ'; return; }
    if (!e.unit.trim()) { this.itemErr = 'ต้องระบุหน่วย (ม้วน/แผ่น/อัน...)'; return; }
    this.itemSaving = true;
    try {
      await this.stock.upsertItem({
        ...(e.item_id ? { item_id: e.item_id } : {}),
        category_id: e.category_id,
        name: e.name.trim(),
        unit: e.unit.trim(),
        min_qty: e.min_qty === null || (e.min_qty as unknown as string) === '' ? null : Number(e.min_qty),
        is_active: e.is_active,
      });
      this.svc.presentToast(e.isNew ? 'เพิ่มรายการแล้ว' : 'บันทึกการแก้ไขแล้ว', 'success');
      this.itemEdit = null;
    } catch (err) {
      this.itemErr = err instanceof StockError ? err.message : 'บันทึกไม่สำเร็จ';
    } finally {
      this.itemSaving = false;
    }
  }

  // ── แท็บลงบันทึก (§2.5 — เลือกวันครั้งเดียว คีย์หลายใบต่อเนื่องจากกระดาษ) ──
  entryType: StockDocType = 'issue';
  /** วันที่หน้ากระดาษ (คงไว้ข้ามใบ — เปลี่ยนเมื่อขึ้นใบของวันใหม่) */
  entryDate = this.todayStr();
  jobSerial = '';
  adjustReason = '';
  entryNote = '';
  entryLines: EntryLine[] = [];
  entrySaving = false;
  entryErr = '';
  /** ใบที่บันทึกสำเร็จในเซสชันนี้ (feedback ต่อเนื่องระหว่างคีย์ทั้งปึก) */
  savedCount = 0;

  itemQuery = '';

  get entryTypes(): StockDocType[] {
    // opening/adjust = admin เท่านั้น (BE บังคับซ้ำ)
    return this.isAdmin ? ['issue', 'receive', 'adjust', 'opening'] : ['issue', 'receive'];
  }

  get minEntryDate(): string {
    if (this.isAdmin) return '2020-01-01';
    const d = new Date();
    d.setDate(d.getDate() - this.backdateLimit);
    return this.toDateStr(d);
  }

  get maxEntryDate(): string { return this.todayStr(); }

  /** ผลค้นหา item สำหรับเพิ่มบรรทัด — item ซ้ำในใบได้ (ใบรวมรายวัน คนละคนเบิกของเดียวกัน) */
  get itemSuggestions(): StockItem[] {
    const q = this.itemQuery.trim().toLowerCase();
    if (!q) return [];
    return this.items()
      .filter((i) => i.is_active && i.name.toLowerCase().includes(q))
      .slice(0, 8);
  }

  addLine(item: StockItem): void {
    // default ผู้รับ = บรรทัดก่อนหน้า (คนเดียวมักเบิกหลายรายการติดกันบนกระดาษ)
    const prev = this.entryLines[this.entryLines.length - 1];
    this.entryLines.push({
      item, qty: null, unit_price: null,
      recipient_name: prev?.recipient_name ?? '',
      supplier: prev?.supplier ?? '', bill_no: prev?.bill_no ?? '',
    });
    this.itemQuery = '';
  }

  removeLine(idx: number): void { this.entryLines.splice(idx, 1); }

  setEntryType(t: StockDocType): void {
    this.entryType = t;
    this.entryErr = '';
  }

  catName(id: string): string {
    return this.categories().find((c) => c.id === id)?.name ?? '';
  }

  async saveEntry(): Promise<void> {
    this.entryErr = '';
    if (this.entryLines.length === 0) { this.entryErr = 'ยังไม่มีรายการในใบ — ค้นหาแล้วเพิ่มก่อน'; return; }
    if (this.entryType === 'adjust' && !this.adjustReason.trim()) {
      this.entryErr = 'ต้องระบุเหตุผลการปรับยอด'; return;
    }
    const lines: StockDocLineInput[] = [];
    for (const l of this.entryLines) {
      const qty = Number(l.qty);
      if (!Number.isFinite(qty) || qty === 0 || (this.entryType !== 'adjust' && qty <= 0)) {
        this.entryErr = `จำนวนของ "${l.item.name}" ไม่ถูกต้อง`; return;
      }
      if (this.entryType === 'issue' && !l.recipient_name.trim()) {
        this.entryErr = `บรรทัด "${l.item.name}" ยังไม่ได้ระบุผู้รับของ (ใครเบิก)`; return;
      }
      lines.push({
        item_id: l.item.id,
        qty,
        ...(this.entryType === 'issue' ? { recipient_name: l.recipient_name.trim() } : {}),
        ...(this.entryType === 'receive' && l.unit_price !== null && (l.unit_price as unknown as string) !== ''
          ? { unit_price: Number(l.unit_price) } : {}),
        ...(this.entryType === 'receive' && l.supplier.trim() ? { supplier: l.supplier.trim() } : {}),
        ...(this.entryType === 'receive' && l.bill_no.trim() ? { bill_no: l.bill_no.trim() } : {}),
      });
    }

    this.entrySaving = true;
    try {
      const res = await this.stock.createDoc({
        type: this.entryType,
        doc_date: `${this.entryDate}T12:00:00+07:00`, // เที่ยงวัน ICT — กันเหลื่อมวันจาก timezone
        lines,
        ...(this.entryType === 'issue' && this.jobSerial.trim() ? { job_serial: this.jobSerial.trim() } : {}),
        ...(this.entryType === 'adjust' ? { adjust_reason: this.adjustReason.trim() } : {}),
        ...(this.entryNote.trim() ? { note: this.entryNote.trim() } : {}),
      });
      this.savedCount += 1;
      this.svc.presentToast(
        `บันทึก${this.typeLabel[this.entryType]} ${this.entryLines.length} บรรทัดแล้ว${res.is_backdated ? ' — ลงย้อนหลัง' : ''}`,
        'success',
      );
      // เคลียร์เนื้อใบ — คงวันที่+ชนิดไว้ (ชื่อผู้รับใหม่ BE จำเข้า master ให้อัตโนมัติ)
      this.entryLines = [];
      this.jobSerial = '';
      this.adjustReason = '';
      this.entryNote = '';
    } catch (err) {
      this.entryErr = err instanceof StockError ? err.message : 'บันทึกไม่สำเร็จ';
    } finally {
      this.entrySaving = false;
    }
  }

  // ── แท็บประวัติ ──
  historyType = signal<'' | StockDocType>('');
  voidingId: string | null = null;
  voidReason = '';

  readonly filteredDocs = computed(() => {
    const t = this.historyType();
    return this.docs().filter((d) => !t || d.type === t);
  });

  /** stock void ได้เฉพาะใบตัวเองที่คีย์วันนี้ (mirror ของกติกา BE — ตัวจริงบังคับที่ server) */
  canVoid(d: StockDocument): boolean {
    if (d.status === 'voided' || !this.canWrite) return false;
    if (this.isAdmin) return true;
    if (d.recorded_by_uid !== this.appState.uid()) return false;
    const created = d.created_at instanceof Timestamp ? d.created_at.toDate() : null;
    return !!created && this.toDateStr(created) === this.todayStr();
  }

  startVoid(d: StockDocument): void { this.voidingId = d.id; this.voidReason = ''; }
  cancelVoid(): void { this.voidingId = null; this.voidReason = ''; }

  async confirmVoid(): Promise<void> {
    if (!this.voidingId) return;
    if (!this.voidReason.trim()) { this.svc.presentToast('ต้องระบุเหตุผลการยกเลิก', 'danger'); return; }
    try {
      await this.stock.voidDoc(this.voidingId, this.voidReason.trim());
      this.svc.presentToast('ยกเลิกเอกสารแล้ว (ยอดถูกย้อนกลับ)', 'success');
      this.cancelVoid();
    } catch (err) {
      this.svc.presentToast(err instanceof StockError ? err.message : 'ยกเลิกไม่สำเร็จ', 'danger');
    }
  }

  docDateStr(d: StockDocument): string {
    const dt = d.doc_date instanceof Timestamp ? d.doc_date.toDate() : null;
    return dt ? dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '';
  }

  lineLabel(l: { item_name: string; qty: number; unit: string; recipient_name: string | null; supplier: string | null; bill_no: string | null; unit_price: number | null }): string {
    const who = l.recipient_name ? ` → ${l.recipient_name}` : '';
    const src = l.supplier ? ` ← ${l.supplier}${l.bill_no ? ` (บิล ${l.bill_no})` : ''}` : (l.bill_no ? ` (บิล ${l.bill_no})` : '');
    const price = l.unit_price !== null ? ` @฿${l.unit_price}` : '';
    return `${l.item_name} ×${l.qty} ${l.unit}${price}${who}${src}`;
  }

  typeBadgeClass(t: StockDocType): string {
    switch (t) {
      case 'receive': return 'bg-green-100 text-green-900 border-green-900';
      case 'issue':   return 'bg-blue-100 text-blue-900 border-blue-900';
      case 'adjust':  return 'bg-amber-100 text-amber-900 border-amber-900';
      case 'opening': return 'bg-purple-100 text-purple-900 border-purple-900';
    }
  }

  // ── แท็บนับสต๊อก (S2 §6 — blind count: ไม่โชว์ยอด ledger ระหว่างนับ) ──
  countMode: 'full' | 'spot' | null = null;
  countScope: string[] = [];           // category ids (full)
  countLines: { item: StockItem; counted: number | null }[] = [];
  paperConfirmed = false;
  countNote = '';
  countSaving = false;
  countErr = '';
  lockingId: string | null = null;

  readonly pendingCounts = computed(() => this.counts().filter((c) => c.status === 'submitted'));
  readonly recentDoneCounts = computed(() =>
    this.counts().filter((c) => c.status !== 'submitted').slice(0, 10),
  );

  toggleScope(catId: string): void {
    this.countScope = this.countScope.includes(catId)
      ? this.countScope.filter((c) => c !== catId)
      : [...this.countScope, catId];
  }

  startFullCount(): void {
    this.countErr = '';
    if (this.countScope.length === 0) { this.countErr = 'เลือกอย่างน้อย 1 หมวดก่อนเริ่มนับ'; return; }
    const scope = new Set(this.countScope);
    // รวม item ที่ถูกปิดใช้งานแต่ยอดยังไม่ 0 ด้วย — ไม่งั้นยอดค้างของมันไม่ถูก reconcile อีกเลย
    const items = this.items().filter(
      (i) => scope.has(i.category_id) && (i.is_active || i.on_hand !== 0),
    );
    if (items.length === 0) { this.countErr = 'หมวดที่เลือกไม่มีรายการ'; return; }
    this.countMode = 'full';
    this.countLines = items.map((item) => ({ item, counted: null }));
  }

  /** สุ่มตรวจ ~10 ตัว: ของแพงที่ขยับ 7 วันล่าสุด + ตัวที่เคยมีส่วนต่าย (adjust) + สุ่มเติม */
  startSpotCount(): void {
    this.countErr = '';
    const all = this.items().filter((i) => i.is_active);
    if (all.length === 0) { this.countErr = 'ยังไม่มีรายการในระบบ'; return; }
    const byId = new Map(all.map((i) => [i.id, i]));
    const weekAgo = Date.now() - 7 * 86_400_000;
    const picked = new Map<string, StockItem>();

    // 1) เคยมีส่วนต่าง (เอกสาร adjust ล่าสุดใน listener) — จับตาต่อเนื่อง สูงสุด 3 ตัว
    for (const d of this.docs()) {
      if (picked.size >= 3) break;
      if (d.type !== 'adjust' || d.status !== 'active') continue;
      for (const l of d.lines) {
        const it = byId.get(l.item_id);
        if (it && !picked.has(it.id)) { picked.set(it.id, it); if (picked.size >= 3) break; }
      }
    }
    // 2) มูลค่าเคลื่อนไหวสูงสุดในสัปดาห์ — เติมจนถึง 7
    const movedValue = new Map<string, number>();
    for (const d of this.docs()) {
      if (d.status !== 'active') continue;
      const ts = d.doc_date instanceof Timestamp ? d.doc_date.toMillis() : 0;
      if (ts < weekAgo) continue;
      for (const l of d.lines) {
        const it = byId.get(l.item_id);
        const price = it?.last_unit_price ?? 0;
        movedValue.set(l.item_id, (movedValue.get(l.item_id) ?? 0) + Math.abs(l.qty) * price);
      }
    }
    [...movedValue.entries()].sort((a, b) => b[1] - a[1]).forEach(([id]) => {
      if (picked.size < 7) { const it = byId.get(id); if (it && !picked.has(id)) picked.set(id, it); }
    });
    // 3) สุ่มเติมจนครบ 10 — ทุกอย่างมีสิทธิ์โดนตรวจ (deterrence)
    const rest = all.filter((i) => !picked.has(i.id));
    while (picked.size < Math.min(10, all.length) && rest.length > 0) {
      const idx = Math.floor(Math.random() * rest.length);
      const it = rest.splice(idx, 1)[0];
      picked.set(it.id, it);
    }

    this.countMode = 'spot';
    this.countScope = [];
    this.countLines = [...picked.values()].map((item) => ({ item, counted: null }));
  }

  cancelCount(): void {
    this.countMode = null;
    this.countLines = [];
    this.paperConfirmed = false;
    this.countNote = '';
    this.countErr = '';
  }

  async submitCount(): Promise<void> {
    this.countErr = '';
    if (!this.countMode) return;
    if (!this.paperConfirmed) { this.countErr = 'ต้องติ๊กยืนยันว่ากระดาษเบิก/รับลงระบบครบแล้ว'; return; }
    const lines: { item_id: string; counted_qty: number }[] = [];
    for (const l of this.countLines) {
      const v = Number(l.counted);
      if (l.counted === null || (l.counted as unknown as string) === '' || !Number.isFinite(v) || v < 0) {
        this.countErr = `"${l.item.name}" ยังไม่ได้กรอกจำนวนที่นับได้ (ไม่มีของ = 0)`; return;
      }
      lines.push({ item_id: l.item.id, counted_qty: v });
    }
    this.countSaving = true;
    try {
      await this.stock.submitCount({
        type: this.countMode,
        scope_category_ids: this.countScope,
        paper_confirmed: true,
        lines,
        ...(this.countNote.trim() ? { note: this.countNote.trim() } : {}),
      });
      this.svc.presentToast(`ส่งผลนับ ${lines.length} รายการแล้ว — รอแอดมินตรวจ+ล็อก`, 'success');
      this.cancelCount();
    } catch (err) {
      this.countErr = err instanceof StockError ? err.message : 'ส่งผลนับไม่สำเร็จ';
    } finally {
      this.countSaving = false;
    }
  }

  countDiffs(c: StockCount): number {
    return c.lines.filter((l) => l.diff !== 0).length;
  }

  async lockCount(c: StockCount, asOpening = false): Promise<void> {
    if (this.lockingId) return;
    this.lockingId = c.id;
    try {
      const res = await this.stock.lockCount(c.id, asOpening);
      this.svc.presentToast(
        res.adjust_line_count > 0
          ? (asOpening
              ? `ล็อกเป็นยอดตั้งต้นแล้ว — ${res.adjust_line_count} รายการ`
              : `ล็อกแล้ว — สร้างใบปรับยอด ${res.adjust_line_count} รายการ`)
          : 'ล็อกแล้ว — ยอดตรงทั้งหมด ไม่ต้องปรับ',
        'success',
      );
    } catch (err) {
      this.svc.presentToast(err instanceof StockError ? err.message : 'ล็อกไม่สำเร็จ', 'danger');
    } finally {
      this.lockingId = null;
    }
  }

  /** รอบนับนี้เป็น baseline ครั้งแรกไหม (ทุกรายการยอดระบบ = 0) → เสนอปุ่ม "ล็อกเป็นยอดตั้งต้น" */
  isBaselineCount(c: StockCount): boolean {
    return c.lines.length > 0 && c.lines.every((l) => l.ledger_qty === 0);
  }

  async discardCount(c: StockCount): Promise<void> {
    if (this.lockingId) return;
    this.lockingId = c.id;
    try {
      await this.stock.discardCount(c.id);
      this.svc.presentToast('ทิ้งรอบนับแล้ว (นับใหม่ได้)', 'success');
    } catch (err) {
      this.svc.presentToast(err instanceof StockError ? err.message : 'ทิ้งไม่สำเร็จ', 'danger');
    } finally {
      this.lockingId = null;
    }
  }

  countDateStr(c: StockCount): string {
    const dt = c.submitted_at instanceof Timestamp ? c.submitted_at.toDate() : null;
    return dt ? dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '';
  }

  // ── แท็บรายงาน (S2 §9) ──
  reportMonth = this.currentMonthStr(); // 'YYYY-MM'
  report: StockReport | null = null;
  reportLoading = false;
  reportErr = '';

  get reportPeriod(): string { return this.reportMonth.replace('-', ''); }

  async loadReport(): Promise<void> {
    this.reportErr = '';
    this.reportLoading = true;
    this.report = null;
    try {
      this.report = await this.stock.computeReport(this.reportPeriod);
    } catch (err) {
      this.reportErr = err instanceof StockError ? err.message : 'คำนวณรายงานไม่สำเร็จ';
    } finally {
      this.reportLoading = false;
    }
  }

  /** จัดกลุ่มรายงานตามหมวด + แถวรวมมูลค่าต่อหมวด (โครงเดียวกับชีทสรุป Excel เดิม) */
  get reportGroups(): { cat: StockCategory; rows: StockReportRow[]; totalValue: number }[] {
    const rep = this.report;
    if (!rep) return [];
    return this.categories()
      .map((cat) => {
        const rows = rep.rows.filter((r) => r.category_id === cat.id);
        return {
          cat, rows,
          totalValue: Math.round(rows.reduce((s, r) => s + (r.closing_value ?? 0), 0) * 100) / 100,
        };
      })
      .filter((g) => g.rows.length > 0);
  }

  get reportWatchRows(): StockReportRow[] {
    return (this.report?.rows ?? []).filter(
      (r) => r.adjusted !== 0 || (r.min_qty !== null && r.closing < r.min_qty),
    );
  }

  openPrint(): void {
    window.open(`/naikit-sticker/stock-print/${this.reportPeriod}`, '_blank');
  }

  /** ใบนับแบบพิมพ์ — เดินนับด้วยกระดาษแล้วค่อยคีย์ (ไม่ต้องพกโทรศัพท์) */
  printCountSheet(): void {
    const q = this.countScope.length > 0
      ? `?cats=${encodeURIComponent(this.countScope.join(','))}`
      : '';
    window.open(`/naikit-sticker/stock-count-print${q}`, '_blank');
  }

  /** พิมพ์ชุดสุ่มตรวจที่ระบบเพิ่งเลือก (ส่ง item ids — ชุดเดียวกับบนจอเป๊ะ) */
  printSpotSheet(): void {
    const ids = this.countLines.map((l) => l.item.id).join(',');
    window.open(`/naikit-sticker/stock-count-print?items=${encodeURIComponent(ids)}`, '_blank');
  }

  private currentMonthStr(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }).slice(0, 7);
  }

  // ── lifecycle / utils ──
  constructor(
    private stock: StockService,
    private appState: AppStateService,
    private svc: ServiceService,
  ) {}

  ngOnInit(): void { this.detach = this.stock.attachListeners(); }
  ngOnDestroy(): void { this.detach?.(); }

  setTab(t: Tab): void { this.tab = t; }

  trackItem = (_i: number, it: StockItem): string => it.id;
  trackDoc = (_i: number, d: StockDocument): string => d.id;
  trackGroup = (_i: number, g: { cat: StockCategory }): string => g.cat.id;

  private todayStr(): string { return this.toDateStr(new Date()); }
  private toDateStr(d: Date): string {
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  }
}
