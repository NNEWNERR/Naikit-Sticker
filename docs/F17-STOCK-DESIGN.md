# F17 — ระบบสต๊อกวัสดุอุปกรณ์ภายในร้าน (Stock Management)

> สถานะ: **Sprint 1 implemented 2026-07-08 (ยังไม่ deploy)** — BE callables + rules + import script +
> FE หน้า /stock (คงเหลือ/ลงบันทึก/ประวัติ) + role `stock`. ค้าง: Sprint 2 (รอบนับ+report) / Sprint 3
> (spot-check+print). design สรุปจาก grill session 2026-07-08
> เป้าหมายหลัก: **กันของหาย/รั่วไหล** (audit-grade) · รอง: รู้มูลค่า + เตือนของใกล้หมด
> อ้างอิงข้อมูลจริง: `D:\นิว 30-4-69\สต๊อก\สต๊อก มกราคม 69.xlsx` (~386 items / 16 หมวด / สมุดใหม่ทุกเดือน + ชีทรายวัน 31 ชีท — หยุดทำไปตั้งแต่ ก.พ. 69)

## 1. หลักการ

1. **สต๊อก = ledger ของ movement** ไม่ใช่ตัวเลขที่แก้มือ (pattern เดียวกับ payments F12)
2. Movement **ห้ามลบ-ห้ามแก้** — มีแต่ void + สร้างใหม่ พร้อมเหตุผล (log ครบ)
3. **ความจริงทางกายภาพชนะเสมอ** — นับจริงแล้วไม่ตรง → adjust ให้ตรง แต่ประวัติส่วนต่างเก็บสะสมเป็นรายงานรั่วไหล
4. หน่วย audit ของวัสดุม้วน = **ม้วนเต็ม** (ม้วนเปิดค้าง 1–2 ม้วน/วัสดุ = โซนประมาณ ไม่บังคับวัด)
5. เขียนผ่าน Cloud Function เท่านั้น, rules deny-by-default (pattern เดิมของแอป)

## 2. สิ่งที่ Excel เดิมแพ้ → แอปแก้

| ปัญหา Excel | ทางแก้ในแอป |
|---|---|
| copy โครง 456 แถว × 31 ชีท/เดือน | บันทึกเฉพาะ movement ที่เกิดจริง ยอดคำนวณเอง |
| คอลัมน์ราคา มีแต่ว่างทั้งไฟล์ | กรอกราคาจุดเดียว = ตอนรับเข้า (มีบิลในมือ) optional ต่อบรรทัด |
| ยอดใช้จริง/ส่วนต่าง แทบไม่ได้กรอก | โหมดนับจริงบังคับ flow + gen adjust ให้ |
| ไม่รู้ใครเบิก/ใครบันทึก | ทุก movement มี recorded_by + ผู้รับของ |
| item ชื่อ "0" (data quality) | master + validation |

## 2.5 รูปแบบการทำงานจริง (ยืนยัน 2026-07-08)

- role `stock` มี **คนเดียว** (ไม่มี backup — ถ้าลา admin ทำแทน)
- หน้างาน: คนมาเบิก → **จดกระดาษ** ก่อน → stock **ลงระบบวันต่อวัน** (transcribe ตอนว่าง/สิ้นวัน)
- ดังนั้น **การลงย้อนหลังคือ workflow ปกติ** ไม่ใช่ข้อยกเว้น:
  - `doc_date` เลือกได้ (default = วันนี้) — role stock ย้อนได้สูงสุด **7 วัน**, เกินนั้น admin เท่านั้น
  - `is_backdated` = ระบบเซ็ตอัตโนมัติเมื่อ doc_date < วันที่คีย์จริง (เก็บไว้วิเคราะห์ ไม่ใช่ตราบาป)
  - UI ต้องมี **โหมด "ลงบันทึกประจำวัน"**: เลือกวันครั้งเดียว → คีย์ใบเบิกหลายใบต่อเนื่อง (ผู้รับ+รายการ) เร็วๆ จากกระดาษ โดยไม่ต้องเลือกวันใหม่ทุกใบ
- ผลต่อการนับจริง: ledger ตามหลังความจริงได้ ~1 วัน → ก่อนเปิดรอบนับ (full/spot) ระบบบังคับติ๊กยืนยัน **"กระดาษเบิกลงระบบครบแล้ว"** — กันส่วนต่างปลอมจากใบที่ยังไม่ได้คีย์

## 3. Roles

| การกระทำ | สิทธิ์ |
|---|---|
| บันทึกรับเข้า / ใบเบิก | **role ใหม่ `stock`** (admin ทำแทนได้) |
| เพิ่ม item/หมวดใหม่ | `stock` (ต้องลื่นตอนรับของเจอ SKU ใหม่) |
| แก้ชื่อ/ย้ายหมวด/ปิดการใช้งาน item | admin เท่านั้น (กัน rename กลบร่องรอย) |
| void movement | `stock` เฉพาะของตัวเอง **ภายในวันเดียวกับที่คีย์** (นับจาก created_at ไม่ใช่ doc_date); พ้นนั้น admin |
| adjust (หลังนับจริง) | admin เท่านั้น |
| ดู dashboard/ประวัติ | admin, stock; finance เห็น report มูลค่า/ส่วนต่าง |

## 4. Data model (Firestore — ชื่อ collection เสนอ รอ implement ตอนอัปเดต SCHEMA.md)

- **`stock_categories/{id}`** — `name`, `sort_order`, `count_cadence: 'monthly' | 'quarterly'` (ตรายาง = quarterly), soft-delete
- **`stock_items/{id}`** — `category_id`, `name`, `unit` (ม้วน/แผ่น/รีม/แกลอน/...), `min_qty?` (เตือนใกล้หมด), `last_unit_price?` (อัปเดตอัตโนมัติจากรับเข้าครั้งล่าสุดที่มีราคา), `material_id?` (เชื่อม F15 — อนาคตหักอัตโนมัติจาก productions), `on_hand` (server-computed), `is_active`, timestamps, soft-delete
- **`stock_docs/{id}`** — เอกสารหลายบรรทัด. **แก้ 2026-07-09: กระดาษจริง = ใบรวมรายวัน**
  (ทั้งเบิกและรับ — หลายคน/หลายบิลในใบเดียว) → ผู้รับของ/ผู้ขาย/บิล ย้ายไป**ต่อบรรทัด**:
  - `type: 'opening' | 'receive' | 'issue' | 'adjust'`
  - `lines[]: { item_id, item_name(snapshot), unit(snapshot), qty, unit_price?,
    recipient_name (บังคับต่อบรรทัดเมื่อ issue — ชื่อใหม่ auto-เพิ่มเข้า stock_staff),
    supplier?, bill_no? (ต่อบรรทัดเมื่อ receive) }` — **item ซ้ำในใบได้** (server รวม delta ต่อ item)
  - issue: `job_serial?` (ระดับใบ) · adjust: `adjust_reason` บังคับ · `note?`
  - `recorded_by_uid/name`, `doc_date` (เลือกย้อนหลังได้ ดู §2.5; `is_backdated` server เซ็ตอัตโนมัติ), `status: 'active' | 'voided'`, `voided_by/reason/at` — void = ทั้งใบ (ผิดบรรทัดเดียว → void แล้วคีย์ใหม่ หรือ admin adjust)
- **`stock_counts/{id}`** — รอบนับจริง: `scope_category_ids[]`, `type: 'full' | 'spot'`, `status: 'draft' → 'submitted' → 'locked'`, `lines[]: { item_id, counted_qty, ledger_qty(snapshot), diff }`, `counted_by`, `locked_by` → ตอน lock ระบบ gen `stock_docs` type=adjust ให้อัตโนมัติ (เหตุผลบังคับต่อบรรทัดที่ diff)
- **`stock_staff/{id}`** — master รายชื่อผู้รับของ (พนักงานร้าน > users ที่มี login; stock/admin เพิ่มได้เอง)
- events collection เดิม: เพิ่ม action enum `stock_*`

## 5. เงิน (ตัดสินใจแล้ว: แบบเบา)

- ราคาต่อหน่วยกรอก **เฉพาะตอนรับเข้า, optional ต่อบรรทัด** (บิลมาทุกครั้งแต่ไม่ทุกรายการมีราคา)
- ตีมูลค่าด้วย **ราคาล่าสุด** (ไม่ทำ FIFO/average) — item ไม่เคยมีราคา → รายงานแยกกลุ่ม "ยังไม่มีราคา" ไม่ปนเป็น 0 บาท
- รายงานส่วนต่างแสดงเป็น **บาท** → finance จัดลำดับได้

## 6. การนับจริง (ตัดสินใจแล้ว)

- **นับเต็มรายเดือน** ต่อหมวด; หมวดตรายาง (143 items) ทุก 3 เดือน
- **spot check รายสัปดาห์ ~10 items (10–15 นาที)** ระบบเลือกให้: ของแพงที่ขยับสัปดาห์นี้ + เคยมีส่วนต่าง + สุ่ม 2–3 → deterrence
- **รายงานสรุปเดือนละครั้ง**
- flow เมื่อไม่ตรง: นับซ้ำ → หา movement ตกหล่น (ลงย้อนหลังได้, log `is_backdated`) → admin adjust + เหตุผล → ส่วนต่างสะสมเข้า report + ธงแดง: item diff ติดกัน 2 เดือน / เกิน threshold

## 7. เริ่มระบบ (migration)

1. **Import โครง** 386 items + 16 หมวด + หน่วย จาก Excel (script idempotent แบบ import-history.ts) — เฉพาะ master ไม่เอาตัวเลข (ตัวเลขตายไปตั้งแต่ ก.พ. 69)
2. **Opening count**: role stock เดินนับทั้งร้านใส่ระบบ → admin ล็อกเป็น baseline (`stock_docs` type=opening) → ledger เดินจากตรงนั้น

## 8. Reorder เตือนใกล้หมด (ตัดสินใจแล้ว: เบา)

`min_qty` optional ต่อ item + badge แดงบน dashboard เมื่อ on_hand < min — ไม่มี LINE/Discord notification ใน v1

## 9. รายงาน + export (ยืนยันรูปแบบ 2026-07-08)

**รายงานหลักต่อผู้บริหาร = ตารางรายวัสดุ รายเดือน** (โครงเดียวกับชีท "สรุป" Excel เดิม) เรียงตามหมวด:

> ลำดับ | รายการ | หน่วย | **ยกมา** | **รับเข้า** | **ใช้ไป** | **คงเหลือ** | ส่วนต่างนับจริง | หมายเหตุ

- invariant ทุกแถว: `ยกมา + รับ − ใช้ ± adjust = คงเหลือ` (server คำนวณ)
- คอลัมน์ส่วนต่างคงไว้เสมอ (โจทย์หลัก=ของหาย) — แถวไม่มี diff ปล่อยว่าง
- หัวแต่ละหมวด: บรรทัดสรุปรวมมูลค่า รับ/ใช้/คงเหลือ ของหมวด
- ท้ายรายงาน: กล่อง "รายการที่ต้องดู" **เฉพาะเมื่อมี** (diff ซ้ำ ≥2 เดือน / เกิน threshold / ต่ำกว่า min_qty) + บรรทัดสุขภาพระบบ (นับครบตามกำหนดไหม, % คีย์ช้า)
- ระบบไม่ออกรายงานเดือนถ้ารอบนับเดือนนั้นยังไม่ lock (กันรายงานจากตัวเลขที่ไม่มีใครยืนยัน)
- Dashboard สดในแอป (admin/finance) ดูได้ตลอด ไม่ต้องรอสิ้นเดือน
- **Export = หน้า HTML พร้อมปริ้น (print → PDF)** — ไม่ทำ .xlsx (pattern เดียวกับใบเสร็จ F14)

## 10. Non-goals v1

- ติดตามรายม้วน (ม้วนไหนเหลือกี่เมตร) / barcode / PO-supplier management
- หักสต๊อกอัตโนมัติจาก productions (F15) — เตรียม `material_id` ไว้แล้ว ทำภายหลัง
- FIFO/average costing · multi-location

## 11. Sprint slicing (เสนอ)

| Sprint | ขอบเขต |
|---|---|
| S1 | schema + functions + import master + ฟอร์มรับเข้า/ใบเบิก + dashboard คงเหลือ + history |
| S2 | opening count + นับเต็มรายเดือน + adjust flow + รายงานส่วนต่าง |
| S3 | spot-check picker + report พร้อมปริ้น + min_qty badge + void flow ครบ |

> Deploy ตาม policy: FE deploy เมื่อ sprint เสร็จ; functions/indexes deploy ได้ก่อนถ้าไม่กระทบ FE
