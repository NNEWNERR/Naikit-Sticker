import { Component, OnInit } from '@angular/core';
import { PriceAuditService, RateCardError } from 'src/app/services/price-audit.service';
import { RateCard } from 'src/app/core/models/price-audit';

/**
 * Rate card management (F7) — admin จัดการราคากลางต่อ (type, option).
 * ราคากลางใช้คำนวณ price audit (ตรวจการกดราคา) ฝั่ง BE. ดู docs/F7-RATE-CARD-DESIGN.md
 *
 * mode per_sqm: rate(tier) ตาม "ด้านสั้น" เทียบหน้ากว้าง roll (max_side เมตร; ว่าง = ต่อผ้า/ไม่จำกัด).
 * mode per_unit: ราคา/ชิ้นคงที่ (ตรายาง).
 */

const TYPE_LABEL: Record<string, string> = {
  vinyl: 'ไวนิล',
  sticker_print: 'สติกเกอร์ พิมพ์',
  sticker_cut: 'สติกเกอร์ ตัด',
  stamp: 'ตรายาง',
};
const TYPE_CODES = ['vinyl', 'sticker_print', 'sticker_cut', 'stamp'];

interface TierEdit {
  max_side: number | null;
  rate: number;
}
interface EditModel {
  isNew: boolean;
  type_code: string;
  option_code: string;
  label: string;
  mode: 'per_sqm' | 'per_unit';
  tiers: TierEdit[];
  unit_price: number | null;
  is_active: boolean;
}

interface TypeGroup {
  type_code: string;
  label: string;
  cards: RateCard[];
}

@Component({
  selector: 'app-rate-card',
  templateUrl: './rate-card.component.html',
  styleUrls: ['./rate-card.component.scss'],
})
export class RateCardComponent implements OnInit {
  readonly typeCodes = TYPE_CODES;

  cards: RateCard[] = [];
  loading = false;
  error = '';
  editing: EditModel | null = null;
  saving = false;
  saveErr = '';

  constructor(private svc: PriceAuditService) {}

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.cards = await this.svc.listRateCards();
    } catch (e) {
      this.error = e instanceof RateCardError ? e.message : 'โหลดราคากลางไม่สำเร็จ';
    } finally {
      this.loading = false;
    }
  }

  /** จัดกลุ่มตาม type สำหรับแสดงผล. */
  get groups(): TypeGroup[] {
    return TYPE_CODES.map((tc) => ({
      type_code: tc,
      label: TYPE_LABEL[tc] ?? tc,
      cards: this.cards
        .filter((c) => c.type_code === tc)
        .sort((a, b) => a.option_code.localeCompare(b.option_code)),
    })).filter((g) => g.cards.length > 0);
  }

  typeLabel(code: string): string {
    return TYPE_LABEL[code] ?? code;
  }

  /** สรุป rate ย่อสำหรับแถว list. */
  summary(c: RateCard): string {
    if (c.mode === 'per_unit') return `฿${c.unit_price ?? 0}/ชิ้น`;
    const rates = (c.tiers ?? []).map((t) => t.rate);
    if (rates.length === 0) return '—';
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    return min === max ? `฿${min}/ตร.ม.` : `฿${min}–${max}/ตร.ม. (${rates.length} ขั้น)`;
  }

  // ── Edit / create ──────────────────────────────────────────────────────────

  startEdit(c: RateCard): void {
    this.saveErr = '';
    this.editing = {
      isNew: false,
      type_code: c.type_code,
      option_code: c.option_code,
      label: c.label,
      mode: c.mode,
      tiers: (c.tiers ?? []).map((t) => ({ max_side: t.max_side, rate: t.rate })),
      unit_price: c.unit_price,
      is_active: c.is_active,
    };
  }

  startNew(): void {
    this.saveErr = '';
    this.editing = {
      isNew: true,
      type_code: 'vinyl',
      option_code: '',
      label: '',
      mode: 'per_sqm',
      tiers: [{ max_side: 1.12, rate: 0 }],
      unit_price: null,
      is_active: true,
    };
  }

  cancel(): void {
    this.editing = null;
    this.saveErr = '';
  }

  onModeChange(): void {
    if (!this.editing) return;
    if (this.editing.mode === 'per_sqm' && this.editing.tiers.length === 0) {
      this.editing.tiers = [{ max_side: null, rate: 0 }];
    }
    if (this.editing.mode === 'per_unit' && this.editing.unit_price == null) {
      this.editing.unit_price = 0;
    }
  }

  addTier(): void {
    this.editing?.tiers.push({ max_side: null, rate: 0 });
  }

  removeTier(i: number): void {
    this.editing?.tiers.splice(i, 1);
  }

  async save(): Promise<void> {
    const e = this.editing;
    if (!e) return;
    this.saveErr = '';

    if (!e.option_code.trim()) { this.saveErr = 'ต้องระบุ option_code'; return; }
    if (!e.label.trim()) { this.saveErr = 'ต้องระบุชื่อแสดงผล'; return; }
    if (e.mode === 'per_sqm') {
      if (e.tiers.length === 0) { this.saveErr = 'per_sqm ต้องมีอย่างน้อย 1 ขั้น'; return; }
      if (e.tiers.some((t) => !(t.rate >= 0))) { this.saveErr = 'rate ต้องเป็นตัวเลข ≥ 0'; return; }
    } else if (!(Number(e.unit_price) >= 0)) {
      this.saveErr = 'ราคา/ชิ้น ต้องเป็นตัวเลข ≥ 0'; return;
    }

    this.saving = true;
    try {
      await this.svc.upsertRateCard({
        type_code: e.type_code,
        option_code: e.option_code.trim(),
        label: e.label.trim(),
        mode: e.mode,
        is_active: e.is_active,
        ...(e.mode === 'per_sqm'
          ? { tiers: e.tiers.map((t) => ({ max_side: t.max_side === null || t.max_side === undefined || (t.max_side as unknown as string) === '' ? null : Number(t.max_side), rate: Number(t.rate) })) }
          : { unit_price: Number(e.unit_price) }),
      });
      this.editing = null;
      await this.load();
    } catch (err) {
      this.saveErr = err instanceof RateCardError ? err.message : 'บันทึกไม่สำเร็จ';
    } finally {
      this.saving = false;
    }
  }

  /** toggle active เร็ว ๆ จาก list (เขียนทับด้วยค่าเดิม + สลับ is_active). */
  async toggleActive(c: RateCard): Promise<void> {
    this.saving = true;
    this.saveErr = '';
    try {
      await this.svc.upsertRateCard({
        type_code: c.type_code,
        option_code: c.option_code,
        label: c.label,
        mode: c.mode,
        is_active: !c.is_active,
        ...(c.mode === 'per_sqm' ? { tiers: c.tiers } : { unit_price: c.unit_price }),
      });
      await this.load();
    } catch (err) {
      this.saveErr = err instanceof RateCardError ? err.message : 'สลับสถานะไม่สำเร็จ';
    } finally {
      this.saving = false;
    }
  }

  trackByCard = (_i: number, c: RateCard): string => c.id ?? `${c.type_code}__${c.option_code}`;
  trackByTier = (i: number): number => i;
}
