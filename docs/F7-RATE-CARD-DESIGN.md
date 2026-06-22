---
version: design v3 (Q1–Q4 + Q2b เคาะแล้ว 2026-06-22; tier revise = ด้านสั้นเทียบหน้ากว้าง roll; rate = placeholder)
project: naikit-sticker
status: DESIGN — decisions ครบ; rate table = placeholder "ใช้ไปก่อน แก้ทีหลัง" (admin ปรับผ่าน UI) — พร้อม build
related: FINANCE-CONTROLS.md, SCHEMA.md, F8-SLIP-PAYMENT-DESIGN.md, F9-TAX-PAYMENT-DESIGN.md
---

# F7 — ราคากลาง (Rate Card + Covert Variance Audit)

ปิดช่องโหว่ที่ F1–F9 ยังไม่แตะ: **seller ตั้งราคาในใบงานต่ำกว่าราคากลาง** แล้วเก็บเงินลูกค้าตามจริง
ส่วนต่างเข้ากระเป๋า — เป็นได้ทั้ง "ส่วนลดจริง" และ "จงใจกดเพื่อยักยอก" ปนกัน

## บริบท / threat model

เหตุการณ์จริง: ราคากลางไวนิลโครงไม้ 100×100 ซม. = 250 บาท/ตร.ม., 4 ป้าย = 1,000 บาท
seller ลงใบงาน "4 ชิ้น 800 บาท" เก็บสด 1,000 รายงาน 800 → 200 เข้ากระเป๋า

**ทำไม F1–F9 จับไม่ได้:**
- F1 บังคับแค่ `total = Σ(qty × unit_price) − discount` ให้ consistent **กันเอง** — แต่ `unit_price`
  ยังเป็นค่าที่ seller กำหนดเอง (จริง ๆ modal เก็บ `total` ต่อรายการตรง ๆ ด้วยซ้ำ ดู
  `work-item-modal.component.ts:28-39`; `unit_price` derive ทีหลัง `create-work-sheet.component.ts:896`)
- ระบบ**ไม่มี price anchor ใด ๆ** มาเทียบว่า "ราคาที่ควรเป็นคือเท่าไหร่" → F7 = ราคาอ้างอิงตัวแรกของระบบ
- F5 (cash reconcile) ก็ผ่านสะอาด เพราะ `system_total` คิดจาก `payment.total` ที่ seller บันทึก (800)

**แก่น:** การกดราคาที่ "ปนกับส่วนลดจริง" → block ไม่ได้ (พังธุรกิจ) ต้อง **มองเห็น + ระบุตัวคน +
ดูเชิงสถิติ** เปลี่ยนการรั่วเงียบ → สัญญาณที่สาวกลับได้

> **ขอบเขตที่ F7 ปิดได้/ไม่ได้** — F7 จับ "กดราคาในใบงาน" ได้เชิงสถิติ
> แต่ **ยังไม่ปิด "เก็บสด 1,000 บันทึก 800"** (กรณีลงราคาในใบงานถูกต้อง แต่ไปเก็บลูกค้าเกินปากเปล่า)
> เพราะไม่มี source of truth ฝั่งลูกค้า — อันนั้นคือ **ชั้น 2 (customer receipt / QR PromptPay)** แยกเฟส

---

## Decisions ที่ lock แล้ว

| # | Decision | สรุป |
|---|----------|------|
| D1 | ขอบเขต type | เฉพาะที่คิดเป็นสูตร: **ไวนิล + สติกเกอร์/สติกเกอร์ตัด** (per_sqm) + **ตรายาง** (per_unit catalog); type อื่นไม่มี rate = ไม่ flag |
| D2 | Key | **Normalize เป็น canonical key** — รวม 2 type lists ให้ตรง, map label ไทย→code, migrate งานเก่า |
| D3 | UX | **Silent** — ไม่แตะ modal/seller; คิดเบื้องหลังล้วน (covert audit) |
| D4 | สูตร | **rate ขั้นบันไดตามขนาด** — tier เลือกด้วย **ด้านสั้น** min(ก,ส) เทียบหน้ากว้าง roll (Q2 revised); `expected = rate(tier) × พื้นที่ × qty` |
| D5 | เกณฑ์ | **2 ระดับ soft/hard** + admin ตั้ง % เองใน config; dashboard เรียง per-seller |
| D6 | Integrity | **ตรึง snapshot ตอนสร้าง** — immutable |
| D7 | ดูแล | **admin แก้ผ่าน UI** (+ Cloud Function audit); **finance read-only** |
| Q1 | rate จริง | **สมมติตามตลาด "ใช้ไปก่อน แก้ทีหลัง"** (ดู §3) — admin ปรับผ่าน UI ภายหลัง |
| Q2 | นิยาม tier | **ด้านสั้น min(ก,ส)** เทียบหน้ากว้าง roll จริง (revise — เดิมด้านยาวสุด แต่ roll ยาวไม่จำกัด ตัวจำกัดคือด้านสั้นที่ต้องลอดหน้ากว้าง) |
| Q3 | tier ตรายาง | **ไม่คิด tier** — ตรายาง = ราคาต่อดวงคงที่ต่อ Q-code (per_unit flat) |
| Q4 | seller อ่าน audit | **อ่านไม่ได้** → ย้าย `price_audit` ออกจาก job doc ไป collection แยก `price_audits/` (canReadAll เท่านั้น) |
| Q2b | หน้ากว้าง roll | ไวนิล: **1.12 / 1.32 / 1.62 / 2.22 / 2.62 / 3.22 ม.** · สติกเกอร์: **1.27 ม.** (เกินสุด = ต่อผ้า/แผ่น) |

---

## 1. Canonical key (D2)

ปัญหาปัจจุบัน: `type`/`option` เก็บเป็น **label ไทยดิบ** และ list 2 ที่ไม่ตรงกัน
(`create-work-sheet.component.ts:509` มี `สติกเกอร์ พิมพ์`, modal `work-item-modal.component.ts:47`
มี `โลอัพ`/`แบล็คลิส` เพิ่ม) → ถ้า rate lookup ด้วย string ตรง ๆ จะ miss เงียบ ๆ

```ts
// shared constant — BE owns; FE import ไปใช้ build dropdown ด้วย (เลิก hardcode 2 ที่)
const TYPE_CANON: Record<string, string> = {
  'ไวนิล': 'vinyl',
  'สติกเกอร์': 'sticker_print', 'สติกเกอร์ พิมพ์': 'sticker_print',
  'สติกเกอร์ตัด': 'sticker_cut',
  'ตรายาง': 'stamp',
  // type นอกขอบเขต F7 → ไม่ต้อง map (lookup miss = ไม่ flag)
};

const OPTION_CANON: Record<string, string> = {
  'โครงไม้': 'wood', 'โครงเหล็ก': 'metal', 'ตาไก่': 'takai', 'พับขอบ': 'seal',
  'ปล่อยขอบ': 'non-seal', 'ร้อยท่อ': 'roty', 'กรอบไม้': 'frame-wood',
  'ธงญี่ปุ่นหน้า': 'jp-flag-1', 'ธงญี่ปุ่นหน้า-หลัง': 'jp-flag-2',
  'ติดฟิวเจอร์บอร์ด 3 มิล': 'fb-3', 'ติดฟิวเจอร์บอร์ด 5 มิล': 'fb-5',
  'ติดพลาสวูด 3 มิล': 'pw-3', 'ติดพลาสวูด 5 มิล': 'pw-5', 'ติดพลาสวูด 10 มิล': 'pw-10',
  'ติดอะคริลิค': 'acrylic',
  // สติกเกอร์ตัด ใช้ option code ชุดเดียวกัน (fb/acrylic/pw) แต่ rate แยกตาม type_code
  'ติดฟิวเจอร์บอร์ด': 'fb', 'ติดพลาสวูด': 'pw',
  // ตรายาง: Q-code ใช้ตรง ๆ เป็น option_code (Q-04 … Q-53)
};

function canonKey(type: string, option: string): { type_code?: string; option_code?: string } {
  const t = TYPE_CANON[type?.trim()];
  if (!t) return {};                       // type นอกขอบเขต → ไม่ flag
  if (t === 'stamp') return { type_code: t, option_code: option?.trim() }; // Q-code ตรง ๆ
  return { type_code: t, option_code: OPTION_CANON[option?.trim()] };
}
```

> ⚠️ **งานที่ต้องทำก่อน build:** รวม type list 2 ที่ให้เป็นชุดเดียว (canonical) แล้วให้ทั้ง parent
> component + modal import จากที่เดียว — ไม่งั้น label ใหม่ที่ไม่อยู่ใน map จะ lookup miss เงียบ ๆ

---

## 2. Schema

### 2.1 `rate_cards/{rate_id}`

`rate_id` = `${type_code}__${option_code}` (deterministic — กัน duplicate + upsert ง่าย)
เขียนผ่าน **Cloud Function เท่านั้น** (admin); อ่าน: admin + finance

| field | type | notes |
|---|---|---|
| `type_code` | string | canonical (vinyl/sticker_print/sticker_cut/stamp) |
| `option_code` | string | canonical / Q-code |
| `label` | string | ป้ายแสดงผล (เช่น "ไวนิล โครงไม้") — snapshot ไว้โชว์ |
| `mode` | `'per_sqm' \| 'per_unit'` | per_sqm = คิดจากพื้นที่ × rate(tier); per_unit = ราคาต่อชิ้นคงที่ (ตรายาง) |
| `tiers` | `Tier[]` | **per_sqm เท่านั้น** — ขั้นบันไดตาม **ด้านยาวสุด** (Q2) |
| `unit_price` | number \| null | **per_unit เท่านั้น** — ราคาต่อดวงคงที่ (ตรายาง, Q3 ไม่มี tier) |
| `is_active` | boolean | inactive = ไม่ใช้ lookup (เก็บไว้เทียบประวัติ) |
| `version` | number | เพิ่มทีละ 1 ทุกครั้งที่ upsert — เก็บลง snapshot (D6) |
| `created_at / updated_at` | Timestamp | serverTimestamp |
| `updated_by_uid` | string | admin ที่แก้ล่าสุด |
| `is_deleted / deleted_at` | boolean / Timestamp\|null | soft delete |

```ts
interface Tier {
  max_side: number | null;   // เมตร — หน้ากว้าง roll ที่ tier นี้รองรับ (null = ใหญ่กว่าทุก roll = ต้องต่อผ้า)
  rate: number;              // บาท/ตร.ม. ใน tier นี้
}
// เลือก tier: side = min(w,h) แปลงเป็นเมตร (ด้านสั้นต้องลอดหน้ากว้าง roll) → tier แรกที่ side ≤ (max_side ?? Infinity)
// expected ของ item = rate(tier) × area × qty   (area = w_m × h_m ต่อ 1 ชิ้น)
```

### 2.2 `price_audits/{job_id}` (Q4 — แยกจาก job doc)

⚠️ Firestore **ซ่อน field รายตัวไม่ได้** — ถ้าเก็บ `price_audit` ใน `jobs/{id}` ที่ seller เจ้าของอ่านได้
(ดู RBAC ใน SCHEMA.md) seller จะอ่าน variance ตัวเองผ่าน console/SDK ได้ → ทำลาย covert (D3)
ดังนั้นเก็บใน collection แยก `price_audits/{job_id}` (1:1 กับ job, key = job_id) เขียนผ่าน CF เท่านั้น
อ่าน **canReadAll() เท่านั้น (admin/finance)** — seller/graphic/production อ่านไม่ได้เลย

| field | type | notes |
|---|---|---|
| `job_id` | string | = doc id |
| `serial_number` | string | snapshot — โชว์ใน dashboard ไม่ต้อง join |
| `seller_uid` | string | snapshot — aggregate per-seller / index |
| `expected_total` | number | Σ expected ของ item ที่ match rate ได้ |
| `actual_total` | number | = payment.total (server-authoritative) |
| `variance_baht` | number | actual − expected (ลบ = ขายต่ำกว่ากลาง) |
| `variance_pct` | number | variance_baht / expected_total × 100 (0 ถ้า expected_total = 0) |
| `severity` | `'none' \| 'soft' \| 'hard'` | ตาม config (D5) |
| `rate_version_map` | `Record<string, number>` | rate_id → version ที่ใช้ตอนคำนวณ (D6 audit) |
| `matched_count` | number | จำนวน item ที่ match rate |
| `unmatched_count` | number | item ที่หา rate ไม่เจอ (ไม่นับใน expected — กัน false flag) |
| `computed_at` | Timestamp | serverTimestamp; เขียนใหม่ทุกครั้งที่ createJob/editJob recompute |
| `job_created_at` | Timestamp | snapshot วันสร้างงาน — ใช้ filter ช่วงเวลาใน dashboard |

> snapshot คือตัวตรึง (D6): สะท้อนราคากลาง ณ วันทำจริง แม้ admin แก้ rate ทีหลัง doc นี้ไม่ขยับ
> (เขียนซ้ำเฉพาะตอน seller/admin แก้ใบงานเอง ซึ่งก็ถูกแล้ว — ราคาบนงานเปลี่ยน)

### 2.3 `config/finance` (เพิ่ม field — D5)

```ts
{
  variance_soft_pct: 10,   // |variance| ≥ 10% = soft (เหลือง)
  variance_hard_pct: 20,   // |variance| ≥ 20% = hard (แดง)
}
```

---

## 3. Rate table (Q1 — สมมติ "ใช้ไปก่อน แก้ทีหลัง"; Q2 tier = ด้านสั้นเทียบหน้ากว้าง roll)

> ⚠️ **ทุกตัวเลขเป็นค่าสมมติตามตลาด** — admin ปรับผ่าน UI ภายหลังได้ (D7). tier เลือกจาก **ด้านสั้น
> min(ก,ส)** ของชิ้นงานเทียบหน้ากว้าง roll จริง (Q2b). เพื่อไม่ต้องกรอกราคามือเป็นร้อยช่อง →
> seed ด้วย **ฐาน/ตร.ม. ต่อ option × ตัวคูณ tier** (shared): `rate(option,tier) = base(option) × factor(tier)`
> seed script คำนวณให้, แล้ว admin ปรับรายช่องผ่าน UI ทีหลัง

### 3.1 ตัวคูณ tier (factor) — ใช้ร่วมทุก option

**ไวนิล** (เลือกจาก min side เทียบ roll):

| ด้านสั้น ≤ (ม.) | 1.12 | 1.32 | 1.62 | 2.22 | 2.62 | 3.22 | >3.22 (ต่อผ้า) |
|---|---|---|---|---|---|---|---|
| factor | 1.00 | 1.05 | 1.10 | 1.15 | 1.20 | 1.25 | 1.50 |

**สติกเกอร์** (พิมพ์/ตัด): ≤1.27 ม. → 1.00 · >1.27 ม. (ต่อแผ่น) → 1.50

> เหตุผล: roll กว้างกว่า = วัสดุแพงต่อ ตร.ม. กว่า + เกินหน้ากว้างสุดต้องต่อ = แรงงานเพิ่ม.
> ⚠️ โมเดลนี้ไม่มี "small-job premium" (งานจิ๋วแพงต่อ ตร.ม. จากค่าตั้งเครื่อง) — งานพื้นที่เล็กมาก
> expected จะต่ำ → ถ้าร้านมี min charge งานจิ๋วอาจขึ้น soft flag "ฝั่งขายแพงกว่ากลาง" (ไม่ใช่เรื่องโกง) →
> ดู open Q เรื่อง min charge

### 3.2 ฐาน บาท/ตร.ม. ต่อ option (= rate ที่ tier เล็กสุด, factor 1.00)

**ไวนิล (vinyl):** non-seal 140 · takai 160 · seal 160 · roty 160 · jp-flag-1 200 · jp-flag-2 340 ·
**wood 250** (anchor ตรงเคสจริง) · frame-wood 320 · metal 380

**สติกเกอร์พิมพ์ (sticker_print):** fb-3 350 · fb-5 400 · pw-3 450 · pw-5 550 · pw-10 750 · acrylic 900

**สติกเกอร์ตัด (sticker_cut)** (ตัดแรงงานมากกว่า): fb 450 · pw 550 · acrylic 950

### 3.3 ตรายาง (stamp) — per_unit, บาท/ดวง (Q3 ไม่มี tier)

| Q-code | ขนาด | บาท/ดวง |  | Q-code | ขนาด | บาท/ดวง |
|---|---|---|---|---|---|---|
| Q-04 | 4×60 mm | 180 |  | Q-16 | 36×61 mm | 320 |
| Q-05 | 11×25 mm | 150 |  | Q-18 | 22×69 mm | 300 |
| Q-10 | 11×40 mm | 180 |  | Q-24 | 28×78 mm | 380 |
| Q-11 | 16×48 mm | 200 |  | Q-26 | 16×83 mm | 350 |
| Q-12 | 24×49 mm | 250 |  | Q-32 | ⌀16 mm | 200 |
| Q-13 | 13×49 mm | 200 |  | Q-34 | ⌀20 mm | 230 |
| Q-14 | 14×60 mm | 230 |  | Q-53 | ⌀38 mm | 450 |

---

## 4. คำนวณ — `computePriceAudit()` (BE)

```
computePriceAudit(work_items, financeConfig, rateCards):
  expected_total = 0; matched = 0; unmatched = 0; versionMap = {}
  for wi in work_items:
    {type_code, option_code} = canonKey(wi.type, wi.option)
    if !type_code: continue                       // นอกขอบเขต → ข้าม (ไม่ใช่ unmatched)
    rate = rateCards[`${type_code}__${option_code}`]
    if !rate or !rate.is_active: unmatched++; continue
    if rate.mode == 'per_unit':
      exp = rate.unit_price × wi.quantity          // ตรายาง — ราคาต่อดวง × จำนวน (Q3)
    else: // per_sqm
      w_m = toMeters(wi.width, wi.unit_of_length)
      h_m = toMeters(wi.height, wi.unit_of_length)
      side = min(w_m, h_m)                          // Q2 revised — ด้านสั้น (ต้องลอดหน้ากว้าง roll)
      tier = first tier where side ≤ (tier.max_side ?? Infinity)
      exp = tier.rate × (w_m × h_m) × wi.quantity
    expected_total += exp; matched++; versionMap[rate.id] = rate.version
  // actual_total = payment.total (คิดโดย F1 แล้ว)
  variance_baht = actual_total − expected_total
  variance_pct  = expected_total > 0 ? variance_baht / expected_total × 100 : 0
  severity = matched == 0 ? 'none'
           : |variance_pct| ≥ hard_pct ? 'hard'
           : |variance_pct| ≥ soft_pct ? 'soft' : 'none'
  return { expected_total, actual_total, variance_baht, variance_pct, severity,
           rate_version_map: versionMap, matched_count: matched, unmatched_count: unmatched }
```

**`toMeters(v, unit)`** — `mm.→ /1000`, `cm.→ /100`, `inch→ ×0.0254`, `m.→ ×1`
(unit_of_length เป็น SCHEMA enum อยู่แล้ว — modal map ผ่าน `mapUnitOfLength()`)

> **severity คิดทั้ง 2 ทาง** (`|variance_pct|`) — ขายต่ำกว่ากลาง = ยักยอก (เป้าหลัก) แต่ขายสูงกว่ามาก
> ก็ anomaly (พิมพ์เลขผิด/ชาร์จเกิน) ควรเห็นด้วย. `matched_count == 0` → severity = none (งานนอกสูตรล้วน)

**ตรวจสอบกับเคสจริง:** ไวนิลโครงไม้ 100×100ซม. 4 ชิ้น → min side = 1ม. (≤1.12 → factor 1.00) →
rate = 250 × 1.00 = 250 → exp = 250 × (1×1) × 4 = 1,000; actual = 800 → variance = −200 = −20%
→ **severity = hard** ✓ (ตรงเป้า)

---

## 5. จุดแก้ตามชั้น

### BE (`Naikit-Sticker-BE`)
- `pricing.ts` (ใหม่): `TYPE_CANON`/`OPTION_CANON`/`canonKey`/`toMeters`/`computePriceAudit`
- `jobs.ts`: ใน `createJob` + `editJob` (path ที่ recompute total) → โหลด active rate_cards + config →
  เรียก `computePriceAudit` → **เขียน/อัปเดต `price_audits/{job_id}`** (ไม่ใช่ field ใน job; Q4). **ไม่ reject**
- `rateCards.ts` (ใหม่): callable `upsertRateCard` (admin; version++; event audit) +
  `listRateCards` (admin/finance). deterministic id `${type_code}__${option_code}`
- `types.ts`: `RateCardDoc`, `PriceAuditDoc`, `COL.rate_cards`, `COL.price_audits`; action enum += `rate_card_upsert`
- (perf) cache rate_cards + config ใน memory ของ function instance — เลี่ยง read ทุก createJob
  (ดู reference: Firebase Functions v2 cost — lazy/preferRest)
- **deleteJob/restoreJob**: soft-delete `price_audits/{job_id}` คู่กัน (กัน dashboard นับงานที่ลบแล้ว)

### Rules (`firestore.rules`)
- `rate_cards`: read `canReadAll()` (admin\|finance); write `false` (CF เท่านั้น)
- `price_audits`: read `canReadAll()` **เท่านั้น** (seller/graphic/production = deny); write `false` (CF เท่านั้น)

### Indexes (`firestore.indexes.json`)
- `rate_cards (is_deleted, is_active, type_code)` — list ใน admin UI
- `price_audits (is_deleted, severity, job_created_at desc)` — dashboard ดึงงาน flag
- `price_audits (is_deleted, seller_uid, severity)` — aggregate per-seller

### FE (`Naikit-Sticker`)
- **Finance Dashboard** (`pages/finance/`) เพิ่ม:
  - การ์ด **"ส่วนต่างราคากลางแยก seller"** — Σ `variance_baht` (เฉพาะที่ติดลบ) + จำนวน hard flag,
    เรียงมาก→น้อย (คนกดราคาบ่อยลอยขึ้น = สัญญาณเชิงสถิติ)
  - ตารางงาน `severity ≥ soft` (จาก `price_audits`) — ใบงาน / seller / expected vs actual /
    variance% / badge สี (คลิกเปิดงาน)
  - `PriceAuditService` (watchFlagged / aggregateBySeller) อ่าน `price_audits`
- **Settings (admin)** — หน้า manage rate card: list + form upsert tier/unit_price (`RateCardService` → CF)
- type/option dropdown ใน create-work-sheet + modal → import จาก canonical source เดียว (ดู D2)
- ⚠️ **seller flow ไม่เปลี่ยน** (D3) — ไม่มี hint/badge/บังคับเหตุผลใด ๆ; seller อ่าน price_audits ไม่ได้ (Q4)

---

## 6. Migration

1. **canonical lists** — รวม type/option 2 ที่ + เพิ่ม map; ตรวจ label ที่ใช้จริงใน prod ว่า map ครบ
2. **seed rate_cards** — admin กรอกผ่าน UI หลัง deploy (หรือ one-off `scripts/seed-rate-cards.ts`
   ใส่ตาราง §3 เป็นค่าเริ่ม แล้ว admin ปรับ — เร็วกว่ากรอกมือ 30+ แถว; D7 = UI เป็นตัวแก้หลัก)
3. **backfill `price_audits` งานเก่า** (optional) — `scripts/backfill-price-audit.ts` คำนวณย้อนหลังด้วย
   rate ปัจจุบัน mark `backfilled: true` (งานเก่าไม่มี rate_version ตรงยุค) — หรือเริ่มจับจากนี้ไป

---

## 7. Open questions (เคาะหมดแล้ว — เหลือ refinement ทีหลัง)

- ~~Q1 rate จริง~~ → **สมมติตามตลาด §3 "ใช้ไปก่อน แก้ทีหลัง"** (admin ปรับผ่าน UI)
- ~~Q2 นิยาม tier~~ → **ด้านสั้น min(w,h)** เทียบหน้ากว้าง roll (revise จากด้านยาวสุด)
- ~~Q2b หน้ากว้าง roll~~ → **ไวนิล 1.12/1.32/1.62/2.22/2.62/3.22 ม. · สติกเกอร์ 1.27 ม.**
- ~~Q3 tier ตรายาง~~ → **ไม่มี — ราคาต่อดวงคงที่**
- ~~Q4 seller อ่าน audit~~ → **อ่านไม่ได้ → collection แยก `price_audits/`**
- (refine ทีหลัง) **min charge งานจิ๋ว** — งานพื้นที่เล็กมากที่ร้านคิดราคาขั้นต่ำ จะ expected ต่ำ →
  อาจขึ้น soft flag ฝั่ง "ขายแพงกว่ากลาง" (ไม่ใช่โกง). ถ้า noise เยอะ เพิ่ม `min_charge` ต่อ option
  หรือไม่ flag ฝั่งบวกสำหรับงาน area < X
- (refine ทีหลัง) **นามบัตร/ใบปลิว** (ต่อปึก/100ใบ) ยังไม่ flag (D1) — ทำ F7.1 mode `per_pack` ถ้าต้องการ

---

## เปลี่ยน design นี้ทำยังไง
1. แก้เอกสารนี้ + `FINANCE-CONTROLS.md` (อัปสถานะ F7) + `SCHEMA.md` (rate_cards + price_audits) ก่อน
2. แก้ `types.ts` (BE) + FE models ให้ตรง
3. แก้ Cloud Functions + rules + indexes
4. แก้ FE service/page
