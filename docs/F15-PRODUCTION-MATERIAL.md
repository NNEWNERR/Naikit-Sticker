---
version: design v1 (2026-06-29) — derived จาก analysis ของ print log จริง (จุ่น/ชา) เดือน พ.ค.69
project: naikit-sticker
status: DESIGN — decisions ครบ พร้อม build; ตัวเลข threshold = placeholder (admin ปรับผ่าน config)
related: SCHEMA.md, F7-RATE-CARD-DESIGN.md, FINANCE-CONTROLS.md, project_naikit_excel_import (memory)
---

# F15 — บันทึกการพิมพ์ + ตรวจสอบวัสดุ/เศษ (Production & Material Audit)

ปิดช่องโหว่ที่ F1–F9 + F7 ยังไม่แตะ: **ต้นทุนฝั่งวัสดุ/การผลิตมองไม่เห็นเลย**
F7 จับ "seller กดราคาขาย" ได้ แต่ฝั่ง **คนพิมพ์เบิกวัสดุเกิน / ตัดเสีย / วัสดุหายจากสต็อก** ระบบ
ไม่มีข้อมูลใด ๆ มาเทียบ เพราะ `WorkItem` ปัจจุบันเก็บแค่ขนาด/จำนวน/ราคา **ไม่มีช่องวัสดุ**

> **F7 = audit ราคา (รายรับ) · F15 = audit วัสดุ (ต้นทุน)** — คู่กันปิดทั้ง 2 ฝั่งของกำไรต่อใบงาน

## บริบท / ที่มา

วิเคราะห์ print log จริงของจุ่น (ไวนิล) + ชา (สติกเกอร์) เดือน พ.ค.69 (489 รายการ) พบว่าคนพิมพ์
บันทึกข้อมูลทองที่ระบบไม่เก็บ: **ขนาดที่ลูกค้าสั่ง · หน้ากว้างม้วนที่ใช้ · ยี่ห้อวัสดุ · ด้านหลัง ·
ความยาว/ตรม.ที่ใช้จริง** → เทียบ "วัสดุที่ใช้จริง ↔ เนื้องานที่คิดเงิน" ได้เศษวัสดุ

ผล pilot (วิธีคำนวณรายใบ): วัสดุใช้จริง 2,045 ตรม. · เนื้องาน 1,708 ตรม. · **เศษ 16.5%**
(ไวนิล/จุ่น 13.1% — น่าเชื่อถือ; สติกเกอร์/ชา 39.3% — *เกินจริงจากวิธีวัด* ดู §D5)

---

## Decisions ที่ lock แล้ว

| # | Decision | สรุป |
|---|----------|------|
| D1 | ข้อมูลอยู่ไหน | **embedded `WorkItem.production`** — production อ่าน job ที่ตัวเองพิมพ์ได้อยู่แล้ว (ไม่ต้อง collection แยกแบบ F7 เพราะไม่ใช่ covert) |
| D2 | ใครกรอก / ตอนไหน | **role=production ตอน `upload_print`** (FUJI→graphic, non-FUJI→production ตาม F13) — เสียบฟอร์มในขั้นที่มีอยู่แล้ว ไม่เพิ่ม transition |
| D3 | Integrity | **server คำนวณ `area_used`/`area_billed`/`waste_pct` เอง** — client ส่งแค่ input ดิบ (วัสดุ/ม้วน/ความยาว/จำนวน); ห้ามเชื่อ client (F1 DNA) |
| D4 | วัสดุ master | collection **`materials/{id}`** (ยี่ห้อ → หน้ากว้างม้วนที่มี → ราคา/ตรม. optional) → dropdown ฝั่งคนพิมพ์ = ข้อมูลสะอาด รวมรายงานได้ (กัน "ดีรุยเซ่น" vs "ดีรุย เซ่น") |
| D5 | สติกเกอร์ชิ้นเล็ก | **เศษรายใบไม่แฟร์** กับงานเล็กบนม้วนกว้าง (วางหลายงานแชร์ม้วน) → รองรับ **`roll_run`** จัดกลุ่มหลาย WorkItem ที่พิมพ์รวมม้วนเดียว แล้วเฉลี่ยเศษระดับ run; ไวนิลวัดรายใบได้ตามปกติ |
| D6 | เกณฑ์ธง | `waste_soft_pct` / `waste_hard_pct` ใน `config/finance`; วัดเฉพาะงาน **area_billed ≥ floor** (กันงานจิ๋ว noise) |
| D7 | สิทธิอ่าน | production อ่าน production block ของงานตัวเองได้ (มันคืองานเขา); **scorecard เทียบข้ามคน + waste dashboard = admin/finance เท่านั้น** |
| D8 | ราคา/ต้นทุน | F15 เก็บ **`area_used`** เป็นแกน; margin (= area_used × cost/ตรม. เทียบ payment.total) เป็น **F15.1 เฟสถัดไป** เมื่อ `materials.cost_per_sqm` ครบ |

---

## 1. Schema

### 1.1 `WorkItem.production` (embedded — เพิ่มใน SCHEMA.md)

```ts
interface WorkItem {
  // ...เดิม: type, width, height, unit_of_length, option, quantity, unit_price, total
  production?: {                    // กรอกโดย role=production ตอน upload_print (D2); optional จนกว่าจะพิมพ์
    // ── คนพิมพ์กรอก (input ดิบ) ──
    material_id: string;           // ref materials/{id} (ยี่ห้อ+ชนิด) — dropdown (D4)
    material_label: string;        // snapshot ('ดีรุยเซ่น หลังขาว') กันชื่อเปลี่ยน
    backing: 'หลังขาว' | 'หลังดำ' | 'หลังเทา' | '';  // เฉพาะไวนิล
    roll_width_m: number;          // หน้ากว้างม้วน — dropdown ตาม material (F7 Q2b: ไวนิล 1.12/1.32/1.62/2.22/2.62/3.22 · สติกเกอร์ 1.27)
    length_used_m: number;         // ความยาวที่ใช้จริงบนม้วน
    qty_printed: number;           // จำนวนพิมพ์จริง (prefill = work_item.quantity)
    roll_run_id: string | null;    // D5 — ผูกหลาย item ที่พิมพ์รวมม้วน (null = พิมพ์เดี่ยว); วัดเศษระดับ run
    // ── server คำนวณ (read-only, D3) ──
    area_used_sqm: number;         // = roll_width_m × length_used_m  (ต่อ item; ถ้า roll_run → เฉลี่ยตามสัดส่วน area_billed)
    area_billed_sqm: number;       // = (w_m × h_m) × qty_printed     (เนื้องานจริง)
    waste_pct: number;             // = (area_used − area_billed)/area_used × 100 (0 ถ้า area_used=0)
    waste_severity: 'none' | 'soft' | 'hard';  // ตาม config (D6); งาน area_billed < floor → 'none'
    printed_by_uid: string;        // auto = ผู้กด upload_print (server set; ปลอมไม่ได้)
    printed_at: Timestamp;         // serverTimestamp
  };
}
```

> ไวนิล: `length_used_m` = ความยาวบนม้วน · สติกเกอร์: เหมือนกัน (ม้วน 1.27) — สูตรเดียวกัน
> งานต่อผ้า/ต่อแผ่น (ด้านสั้น > หน้ากว้างม้วนสุด) → flag `paneled: true` คำนวณ area_used = ceil(side/roll)×roll×len

### 1.2 `materials/{material_id}` (ใหม่)

`material_id` = canonical เช่น `vinyl__deruyzen` / `sticker__hp`. เขียนผ่าน CF เท่านั้น (admin); อ่าน: staff ทุก role (ต้องใช้ทำ dropdown)

| field | type | notes |
|---|---|---|
| `category` | `'vinyl' \| 'sticker'` | จับคู่กับ type_code (F7) |
| `brand` | string | 'ดีรุยเซ่น' / 'นก' / 'BB' / 'HP' / 'JH' / 'โปสเตอร์' / 'ช้าง' / 'กล่องไฟ' / 'ซีทรู' |
| `label` | string | ป้ายแสดง ('ดีรุยเซ่น (ไวนิล)') |
| `roll_widths_m` | number[] | หน้ากว้างม้วนที่ยี่ห้อนี้มี (เลือกใน dropdown) |
| `cost_per_sqm` | number \| null | ต้นทุน/ตรม. — F15.1 (margin); null = ยังไม่กรอก |
| `is_active` | boolean | inactive = ไม่โผล่ใน dropdown (เก็บไว้เทียบประวัติ) |
| `created_at / updated_at / updated_by_uid` | | serverTimestamp / admin |
| `is_deleted / deleted_at` | boolean / Timestamp\|null | soft delete |

### 1.3 `config/finance` (เพิ่ม field — D6)

```ts
{
  // ...เดิม (variance_soft_pct, variance_hard_pct จาก F7)
  waste_soft_pct: 30,        // |waste| ≥ 30% = soft (เหลือง)
  waste_hard_pct: 50,        // |waste| ≥ 50% = hard (แดง)
  waste_audit_floor_sqm: 0.5 // วัดเฉพาะงาน area_billed ≥ 0.5 ตรม. (กันงานจิ๋ว noise; D6)
}
```

---

## 2. คำนวณ — `computeProductionAudit()` (BE, D3)

```
computeProductionAudit(workItem, input, config):
  w_m = toMeters(workItem.width, workItem.unit_of_length)   // reuse F7 toMeters()
  h_m = toMeters(workItem.height, workItem.unit_of_length)
  qty = input.qty_printed
  R   = input.roll_width_m
  side = min(w_m, h_m)                       // ด้านสั้นต้องลอดหน้ากว้างม้วน (F7 Q2)
  area_billed = (w_m × h_m) × qty
  // area_used: ถ้าคนพิมพ์กรอก length_used_m → ใช้ตรง (แม่นสุด); ไม่งั้น derive จากขนาด+ม้วน
  if input.length_used_m > 0:
    area_used = R × input.length_used_m
    paneled = side > R
  else:                                       // derive (กรณี import/ไม่กรอก)
    long = max(w_m, h_m)
    if side ≤ R: area_used = R × long × qty; paneled = false
    else:        panels = ceil(side / R); area_used = panels × R × long × qty; paneled = true
  waste_pct = area_used > 0 ? (area_used − area_billed)/area_used × 100 : 0
  severity  = area_billed < config.waste_audit_floor_sqm ? 'none'
            : |waste_pct| ≥ config.waste_hard_pct ? 'hard'
            : |waste_pct| ≥ config.waste_soft_pct ? 'soft' : 'none'
  return { area_used_sqm: round3(area_used), area_billed_sqm: round3(area_billed),
           waste_pct: round1(waste_pct), waste_severity: severity, paneled }
```

**roll_run (D5):** ถ้าหลาย WorkItem ใน roll_run เดียวกัน → คำนวณ `area_used` ของ run ครั้งเดียว
(= R × max length ของ run, หรือ Σ length ถ้าวางต่อกัน) แล้ว **เฉลี่ยลงแต่ละ item ตามสัดส่วน area_billed**
→ เศษระดับ run ไม่ใช่รายชิ้น (แก้เคสสติกเกอร์เล็ก 88% ปลอม)

**ตรวจกับเคสจริง (pilot):** ไวนิล 80×180 ม้วน 1.12 → side 0.8≤1.12 → used = 1.12×1.8 = 2.016;
billed = 1.44 → waste 28.6% ✓ (soft). สติกเกอร์ 30×20 ม้วน 1.27 พิมพ์เดี่ยว → 88% (hard) แต่ถ้าอยู่
roll_run รวม 10 งาน → เฉลี่ยเหลือ ~15% ✓

---

## 3. UI — ฟอร์มคนพิมพ์ (FE)

เสียบในขั้น `upload_print` (production claim งานแล้วกดแนบงานพิมพ์). หน้าจอมือถือ/แท็บเล็ตข้างเครื่อง:

```
┌─ บันทึกการพิมพ์ · พค.142 "มะพร้าวน้ำหอม" ─────┐
│ ลูกค้าสั่ง: 150 × 50 cm × 2 ชิ้น  (อ่านอย่างเดียว)│
│ ยี่ห้อวัสดุ     [ ดีรุยเซ่น ▾ ]   ← materials master │
│ ด้านหลัง       [ หลังขาว ▾ ]                       │
│ หน้ากว้างม้วน  [ 1.62 m ▾ ]      ← roll_widths_m   │
│ ความยาวที่ใช้   [ 1.6 ] m                           │
│ จำนวนพิมพ์จริง  [ 2 ]                               │
│ □ พิมพ์รวมม้วนกับงานอื่น (เลือก roll run)           │
│ ───────────────────────────────                   │
│ 📐 วัสดุใช้ 2.59 · เนื้องาน 1.50 · ♻️ เศษ 42% ⚠️    │
│              [ บันทึก & ส่งงานต่อ ]                 │
└────────────────────────────────────────────────────┘
```

- เศษ% คำนวณ **live ฝั่ง client เพื่อโชว์** (server คำนวณซ้ำเป็นตัวจริง — D3); เตือนทันทีถ้า ≥ hard
- ยี่ห้อ/ม้วน = dropdown จาก `materials` (D4); จำนวนพิมพ์ prefill จาก work_item.quantity
- `printed_by_uid` server เซ็ตเอง — กัน "คนแนบ ≠ คนพิมพ์" ตามที่ F13/SCHEMA ระบุไว้แล้ว

---

## 4. จุดแก้ตามชั้น

### BE (`Naikit-Sticker-BE`)
- `production.ts` (ใหม่): `computeProductionAudit()` + roll_run averaging + reuse `toMeters` (จาก F7 pricing.ts)
- `jobs.ts` → `uploadPrint`: รับ payload `production[]` (ต่อ work_item) → validate + คำนวณ server →
  เขียนลง `work_items[i].production` + set `printed_by_uid/at`. **ไม่ reject งานเศษสูง** (แค่ flag)
- `materials.ts` (ใหม่): callable `upsertMaterial` / `listMaterials` (admin write; staff read)
- `types.ts`: `MaterialDoc`, `WorkItem.production`, `COL.materials`; action enum += `material_upsert`,
  `edit_production` (production/admin แก้ค่าที่กรอกผิด → event audit before/after)
- cache `materials` + `config/finance` ใน instance memory (ref: Firebase Functions v2 cost)

### Rules (`firestore.rules`)
- `materials`: read = signed-in staff; write = false (CF)
- `WorkItem.production` อยู่ใน job doc → ใช้ read-scope ของ jobs เดิม (production เห็นงานตัวเอง)
- waste dashboard/scorecard ข้ามคน = query โดย admin/finance (canReadAll) เท่านั้น

### Indexes (`firestore.indexes.json`)
- ไม่ต้องเพิ่มทันที — waste audit อ่านจาก jobs ที่ query อยู่แล้ว; ถ้าทำ dashboard filter ตาม
  `work_items.production.waste_severity` ต้อง denormalize flag สูงสุดขึ้น job-level (เพิ่มทีหลังเมื่อทำ UI)

### FE (`Naikit-Sticker`)
- ฟอร์มบันทึกการพิมพ์ (§3) ในขั้น upload_print + `MaterialService` (listMaterials → dropdown)
- **Finance Dashboard** เพิ่มการ์ด: เศษรวม/เดือน · เศษ% แยกคนพิมพ์ · แยกยี่ห้อ · TOP งานเศษสูง
- Settings (admin): manage `materials` (ยี่ห้อ/หน้ากว้าง/ราคา)

---

## 5. Migration / Backfill (จาก Excel import — ดู memory project_naikit_excel_import)

1. **seed `materials`** — จากยี่ห้อที่เจอใน log จริง: ดีรุยเซ่น/นก/BB/HP/JH/โปสเตอร์/ช้าง/กล่องไฟ/ซีทรู
   + roll widths (F7 Q2b). `cost_per_sqm = null` (กรอกทีหลัง)
2. **backfill `WorkItem.production`** ตอน import งานเก่า — parser print log (จุ่น/ชา) มี field ครบ
   (ยี่ห้อ/ม้วน/ความยาว→ตรม.) → คำนวณ `computeProductionAudit` ย้อนหลัง mark `backfilled: true`
3. งานที่ import แล้วไม่มี print log match → `production` = undefined (ปกติ — งานที่ไม่ผ่านพิมพ์/ข้อมูลขาด)

---

## 6. งานเสีย (defects) + Settings + Finance dashboard

### 6.1 งานเสีย — `defects/{id}` (เพิ่ม 2026-06-29)

งานพิมพ์เสีย/ตัดเสีย = วัสดุถูกใช้แต่ไม่มีรายได้ → ไม่ปรากฏใน work_item.production (งานนั้นพิมพ์ใหม่)
ทำให้เศษ "จริง" ถูกซ่อน. บันทึกงานเสียแยกเป็น collection `defects` (ดู SCHEMA.md) ให้ finance เห็น
spoilage rate แยกคน/ยี่ห้อ/สาเหตุ — เป็น audit ตรงของการรั่ว.

- **callable `recordDefect`** (seller เจ้าของงาน + production/graphic/admin; seller จำกัดเฉพาะใบงานตัวเอง): รับ `{job_id?, work_item_index?, reason, detail,
  material_id, roll_width_m, length_used_m, qty_spoiled, occurred_at?}` → server validate material +
  คำนวณ `area_wasted_sqm = roll_width × length` + set `recorded_by_uid/name` + เขียน defect doc
  (+ job_event `defect_record` ถ้าผูกงาน). `detail` บังคับเมื่อ reason='อื่นๆ'.
- **callable `voidDefect`** (admin): set status='voided' + reason (บันทึกผิด/ซ้ำ).
- **read scope:** finance/admin ทั้งหมด; production เฉพาะ `recorded_by_uid == self`.
- **UI:** ปุ่ม "บันทึกงานเสีย" ในหน้าใบงาน (ช่วงผลิต) — ฟอร์มคล้ายบันทึกการพิมพ์ + เลือกสาเหตุ + รายละเอียด.
  โชว์พื้นที่วัสดุที่เสียสด.

### 6.2 Settings (admin) — จัดการ `materials` (ก)
หน้า manage materials (mirror rate-card): list แยก category → form upsert (ยี่ห้อ/label/หน้ากว้างม้วน
หลายค่า/cost_per_sqm/active) → callable `upsertMaterial`. toggle active เร็วจาก list.

### 6.3 Finance dashboard — เศษวัสดุ (ข)
**callable `computeWasteSummary({period})`** (finance/admin) — server aggregate (mirror F14 pattern):
- ดึงงานส่งมอบในเดือน (date_of_completion) → Σ `work_items.production` แยก **คนพิมพ์** + **ยี่ห้อ** →
  area_used/billed/waste%
- ดึง `defects` (active) ในเดือน (occurred_at) → Σ area_wasted แยกคน/ยี่ห้อ/สาเหตุ
- คืน `{ printers[], materials[], defects_by_reason[], totals }`
การ์ด: เศษรวม/เดือน · เศษ% แยกคนพิมพ์ · แยกยี่ห้อ · งานเสีย (พื้นที่+จำนวน แยกสาเหตุ) · TOP งานเศษสูง

---

## 7. Open questions

- (เคาะทีหลัง) **roll_run UX** — คนพิมพ์ผูกงานรวมม้วนยังไง: เลือกตอนพิมพ์ หรือ admin จัดกลุ่มย้อนหลัง?
  เริ่มแบบง่าย: optional checkbox + เลือกงานในคิวเดียวกัน
- (F15.1) **margin report** — รอ `materials.cost_per_sqm` ครบ → area_used × cost เทียบ payment.total =
  กำไรขั้นต้นรายใบ + flag งานต่ำกว่าทุน
- (refine) **denormalize `max_waste_severity` ขึ้น job-level** เพื่อ index/filter dashboard เร็ว
- (refine) **stock reconciliation** — note "เบิกม้วนใหม่" ใน log → ผูกกับ `materials` เป็นการเบิกสต็อก
  เทียบ Σ area_used รายยี่ห้อ/เดือน = วัสดุรั่ว (F15.2)

---

## เปลี่ยน design นี้ทำยังไง
1. แก้เอกสารนี้ + `SCHEMA.md` (WorkItem.production + materials) + `FINANCE-CONTROLS.md` (อัปสถานะ F15) ก่อน
2. แก้ `types.ts` (BE) + FE models ให้ตรง
3. แก้ Cloud Functions (uploadPrint + materials) + rules
4. แก้ FE service/page (ฟอร์มพิมพ์ + dashboard + settings)
