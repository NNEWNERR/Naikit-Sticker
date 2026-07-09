import { Injectable, OnDestroy, signal } from '@angular/core';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  Unsubscribe,
  where,
} from 'firebase/firestore';
import { FunctionsError, httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase-config';
import {
  CreateStockDocInput,
  StockCategory,
  StockCount,
  StockDocument,
  StockItem,
  StockReport,
  StockStaff,
  SubmitStockCountInput,
  UpsertStockCategoryInput,
  UpsertStockItemInput,
} from '../core/models/stock';

export class StockError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

const DOCS_LIMIT = 300; // ประวัติล่าสุดพอสำหรับหน้า history; report เต็มเดือน = Sprint 2

/**
 * F17 — stock: อ่าน stock_* ผ่าน shared listener (rules: role stock/finance/admin เท่านั้น);
 * mutation ทุกตัวผ่าน Cloud Functions (createStockDoc/voidStockDoc/upsertStock*).
 * ดู docs/F17-STOCK-DESIGN.md
 */
@Injectable({ providedIn: 'root' })
export class StockService implements OnDestroy {
  private readonly _categories = signal<StockCategory[]>([]);
  private readonly _items = signal<StockItem[]>([]);
  private readonly _staff = signal<StockStaff[]>([]);
  private readonly _docs = signal<StockDocument[]>([]);
  private readonly _counts = signal<StockCount[]>([]);
  private readonly _loading = signal<boolean>(false);
  readonly categories = this._categories.asReadonly();
  readonly items = this._items.asReadonly();
  readonly staff = this._staff.asReadonly();
  readonly docs = this._docs.asReadonly();
  readonly counts = this._counts.asReadonly();
  readonly loading = this._loading.asReadonly();

  private unsubs: Unsubscribe[] = [];
  private refCount = 0;

  // ── Live data (shared listeners — attach จากหน้า stock) ──────────────────

  attachListeners(): () => void {
    this.refCount += 1;
    if (this.unsubs.length === 0) this.startListeners();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.refCount = Math.max(0, this.refCount - 1);
      if (this.refCount === 0) this.stopListeners();
    };
  }

  ngOnDestroy(): void { this.stopListeners(); }

  private startListeners(): void {
    this._loading.set(true);
    const err = (name: string) => (e: unknown) => {
      console.error(`[StockService] ${name} snapshot error`, e);
      this._loading.set(false);
    };

    this.unsubs.push(onSnapshot(
      query(collection(db, 'stock_categories'), where('is_deleted', '==', false)),
      (snap) => {
        const list: StockCategory[] = [];
        snap.forEach((d) => {
          const v = d.data() as Record<string, unknown>;
          list.push({
            id: d.id,
            name: (v['name'] as string) ?? '',
            sort_order: (v['sort_order'] as number) ?? 999,
            count_cadence: (v['count_cadence'] as 'monthly' | 'quarterly') ?? 'monthly',
            is_deleted: v['is_deleted'] === true,
          });
        });
        list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
        this._categories.set(list);
      },
      err('categories'),
    ));

    this.unsubs.push(onSnapshot(
      query(collection(db, 'stock_items'), where('is_deleted', '==', false)),
      (snap) => {
        const list: StockItem[] = [];
        snap.forEach((d) => {
          const v = d.data() as Record<string, unknown>;
          list.push({
            id: d.id,
            category_id: (v['category_id'] as string) ?? '',
            name: (v['name'] as string) ?? '',
            unit: (v['unit'] as string) ?? '',
            on_hand: (v['on_hand'] as number) ?? 0,
            min_qty: (v['min_qty'] as number | null) ?? null,
            last_unit_price: (v['last_unit_price'] as number | null) ?? null,
            material_id: (v['material_id'] as string | null) ?? null,
            is_active: v['is_active'] !== false,
            is_deleted: v['is_deleted'] === true,
          });
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        this._items.set(list);
        this._loading.set(false);
      },
      err('items'),
    ));

    this.unsubs.push(onSnapshot(
      query(collection(db, 'stock_staff'), where('is_deleted', '==', false)),
      (snap) => {
        const list: StockStaff[] = [];
        snap.forEach((d) => {
          const v = d.data() as Record<string, unknown>;
          list.push({ id: d.id, name: (v['name'] as string) ?? '', is_active: v['is_active'] !== false });
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        this._staff.set(list);
      },
      err('staff'),
    ));

    this.unsubs.push(onSnapshot(
      query(collection(db, 'stock_docs'), orderBy('doc_date', 'desc'), limit(DOCS_LIMIT)),
      (snap) => {
        const list: StockDocument[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<StockDocument, 'id'>) }));
        this._docs.set(list);
      },
      err('docs'),
    ));

    this.unsubs.push(onSnapshot(
      query(collection(db, 'stock_counts'), orderBy('submitted_at', 'desc'), limit(50)),
      (snap) => {
        const list: StockCount[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<StockCount, 'id'>) }));
        this._counts.set(list);
      },
      err('counts'),
    ));
  }

  private stopListeners(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
  }

  // ── Mutations (Cloud Functions) ───────────────────────────────────────────

  async createDoc(input: CreateStockDocInput): Promise<{ id: string; is_backdated: boolean }> {
    return this.call('createStockDoc', input);
  }

  async voidDoc(doc_id: string, reason: string): Promise<{ id: string }> {
    return this.call('voidStockDoc', { doc_id, reason });
  }

  async upsertItem(input: UpsertStockItemInput): Promise<{ id: string }> {
    return this.call('upsertStockItem', input);
  }

  async upsertCategory(input: UpsertStockCategoryInput): Promise<{ id: string }> {
    return this.call('upsertStockCategory', input);
  }

  async upsertStaff(input: { staff_id?: string; name: string; is_active?: boolean }): Promise<{ id: string }> {
    return this.call('upsertStockStaff', input);
  }

  // ── Sprint 2: รอบนับ + รายงาน ──

  async submitCount(input: SubmitStockCountInput): Promise<{ id: string }> {
    return this.call('submitStockCount', input);
  }

  async lockCount(count_id: string): Promise<{ id: string; adjust_doc_id: string | null; adjust_line_count: number }> {
    return this.call('lockStockCount', { count_id });
  }

  async discardCount(count_id: string, reason?: string): Promise<{ id: string }> {
    return this.call('discardStockCount', { count_id, ...(reason ? { reason } : {}) });
  }

  async computeReport(period: string): Promise<StockReport> {
    return this.call('computeStockReport', { period });
  }

  private async call<Req, Res>(name: string, data: Req): Promise<Res> {
    const fn = httpsCallable<Req, Res>(functions, name);
    try {
      return (await fn(data)).data;
    } catch (e: unknown) {
      const fe = e as FunctionsError;
      const code = fe?.code ?? 'unknown';
      const beMessage = typeof fe?.message === 'string' ? fe.message : '';
      const msg =
        code === 'functions/permission-denied' ? (beMessage || 'ไม่มีสิทธิ์ทำรายการนี้')
        : code === 'functions/invalid-argument' ? (beMessage || 'ข้อมูลไม่ถูกต้อง')
        : code === 'functions/failed-precondition' ? (beMessage || 'ไม่สามารถดำเนินการได้')
        : code === 'functions/not-found' ? (beMessage || 'ไม่พบข้อมูล')
        : code === 'functions/unauthenticated' ? 'กรุณาเข้าสู่ระบบใหม่'
        : (beMessage || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
      throw new StockError(code, msg);
    }
  }
}
