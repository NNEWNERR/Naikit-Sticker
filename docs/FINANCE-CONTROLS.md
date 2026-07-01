---
version: v1
project: naikit-sticker
status: design — F1+F2 implementing; F3–F6 planned
audience: ทั้ง FE (Naikit-Sticker) และ BE (Naikit-Sticker-BE) อ้างเอกสารนี้เป็น source of truth ของ financial controls
related: SCHEMA.md (data contract หลัก)
---

# Naikit Sticker — Financial Controls (ป้องกัน/ตรวจสอบการยักยอกเงิน)

เอกสารนี้กำหนดมาตรการป้องกันและตรวจสอบการยักยอกเงินโดยฝ่ายขาย (seller)
เกิดจากเหตุการณ์จริง: seller ยักยอกเงินบริษัท

## ปัญหา (threat model)

ปัจจุบัน seller คุมวงจรเงินทั้งหมดคนเดียว — **รับเงินลูกค้า + กรอกตัวเลขเอง + แก้ตัวเลขได้เอง**
โดยไม่มี source of truth อื่นมาเทียบ และ audit log ไม่เก็บค่าเดิม จึงตรวจย้อนไม่ได้

ช่องโหว่ที่พบในโค้ด (ณ 2026-06-21):

| # | ช่องโหว่ | ที่มา |
|---|---------|------|
| A | `payment.total` เป็น input อิสระที่ seller พิมพ์เอง ไม่ผูกกับผลรวม `work_items` | `create-work-sheet` Step 3 `formControlName="total"` |
| A2 | `validatePayment` ไม่บังคับ `remaining = total − deposit`, `deposit ≤ total`, `work_item.total = qty × unit_price` | `jobs.ts` validatePayment/validateWorkItem |
| B | audit `edit` event เก็บแค่ *ชื่อ* field ไม่เก็บค่าเก่า→ใหม่ | `jobs.ts:646` `payload: { fields }` |
| C | seller แก้ `payment` ได้อิสระตอน status ก่อนคอนเฟิร์ม | `editJob` EDITABLE_BEFORE_CONFIRM |
| D | เงินสดไม่ต้องแนบหลักฐาน; `delivery_slips` optional; `payment_method` ปล่อย `''` ได้ | `markDelivered` |

> แก่น: **เงินสด + แก้ตัวเลขได้ + audit ไม่เก็บค่าเดิม + ไม่มี reconcile กับเงินจริง**

## หลักการ: Separation of Duties

แยก "คนรับเงิน" (seller) ออกจาก "คนยืนยัน/กระทบยอด" (finance)
- seller: บันทึกยอดตอน**สร้าง**งานเท่านั้น แก้ตัวเลขเงินเองทีหลังไม่ได้
- `total` เป็นค่า **server-authoritative** คิดจากผลรวม `work_items` เสมอ — พิมพ์มั่วไม่ได้
- การแก้เงินหลังสร้าง ผ่าน `finance`/`admin` เท่านั้น + บันทึก before→after + เหตุผล (append-only ledger)
- ล็อกเงินถาวรหลังส่งมอบ
- เงินสดต้องกระทบยอดรายวัน

---

## Phase F1 — Payment integrity (server-authoritative total) ✅ implementing

BE บังคับความถูกต้องของตัวเลขทุก write path:

1. **`work_item.total === round(quantity × unit_price)`** (±0.01) — กันกรอก total ราย item มั่ว
2. **`total` คิดจาก server**: `total = Σ work_items.total − discount` — **ignore ค่า `total` ที่ client ส่ง**
3. **`discount`** (field ใหม่, default 0): `0 ≤ discount ≤ Σ work_items.total` — ส่วนลดต้องชัดเจน บันทึกได้ ตรวจได้
4. **`deposit`**: `0 ≤ deposit ≤ total`
5. **`remaining`** คิดจาก server: `remaining = total − deposit`

ผล: เคส "total=1000 / deposit=0 / remaining=0 แล้วเก็บสด 1000" เป็นไปไม่ได้อีก —
total จะถูก derive จากงานจริงเสมอ และ remaining สะท้อนยอดค้างจริง

> **หมายเหตุ deploy**: F1 เป็น BE-only ปลอดภัย deploy ทันที — ไม่ reject การสร้างงาน
> (BE override `total` ให้ถูกแทนที่จะปฏิเสธ). FE follow-up: ทำช่อง "ยอดรวม" เป็น read-only
> ผูกกับผลรวม items + เพิ่มช่อง "ส่วนลด" (อยู่ใน FE batch ของ F4)

## Phase F2 — Payment ledger (append-only, immutable trail) ✅ implementing

1. **ถอด `payment` ออกจาก `editJob`** — seller บันทึก payment ได้แค่ตอน `createJob`
2. **editJob แก้ `work_items` ได้** (ก่อนคอนเฟิร์ม) → BE **คำนวณ `total`/`remaining` ใหม่อัตโนมัติ**
   (คง deposit/discount/method เดิม); ถ้ายอดใหม่ < deposit → reject ให้ปรับมัดจำผ่าน finance ก่อน
   บันทึก payment เก่า→ใหม่ ใน edit event payload
3. **`adjustPayment` callable ใหม่** (role `finance`/`admin` เท่านั้น):
   - args: `{ job_id, deposit?, discount?, payment_method?, date_of_payment?, reason }` — `reason` บังคับ
   - คิด `total`/`remaining` ใหม่ตามกติกา F1
   - เขียน event `action='payment_adjust'` payload `{ before, after, reason }`
   - ใช้ได้ **ทุก status** (รวมหลังส่งมอบ — เพื่อให้ finance กระทบยอด/แก้ที่ผิดได้ โดยมีร่องรอย)
4. เพิ่ม action `payment_adjust` ใน enum; เพิ่ม role `finance` ใน Role union (ยังไม่มี user จนกว่า F3)

> ผลรวม F1+F2: ตัวเลขถูกบังคับให้ถูกต้อง + แก้เงินได้เฉพาะ finance + ทุกการแก้มี before/after + เหตุผล
> → ยักยอกแบบเงียบ (ลดยอดทีหลัง) ทำไม่ได้แล้ว

---

## Phase F3 — Role `finance` (read-all + reconcile) ✅ implemented (รอ deploy พร้อม FE sprint)

role ที่ 5: `seller | graphic | production | admin | finance`

| สิทธิ์ | finance |
|--------|---------|
| อ่านทุก job + job_events + comments + users (ไม่ผูก ownership) | ✓ |
| `adjustPayment` (มีตั้งแต่ F2) | ✓ |
| ปิดยอดเงินสดรายวัน | ✓ (F5) |
| เปลี่ยน status งาน / สร้างงาน / จัดการ user | ✗ |

**ทำแล้ว:**
- BE `types.ts`: `finance` เข้า `ALL_ROLES` (admin createUser/setUserRole สร้าง finance ได้); `admin.ts` validateRole message
- `firestore.rules`: helper `canReadAll()` (admin\|finance) → jobs read-all + users read-all; `isStaff()` += finance (job_events/comments)
- FE: `session.ts` Role/ROLES += finance · routing report(`/all`)+diary += finance · `jobs.service` watchMyJobs/watchVisibleJobs finance=all · `home.component` ROLE_DEFAULT_COLUMNS/MOBILE_TABS finance=all (read-only, ไม่มีปุ่มสร้าง) · nav (main-layout) report+diary += finance · report/diary attach users listener สำหรับ finance · user admin role label/badge += finance (dropdown สร้าง user มี finance อัตโนมัติ)

**⚠️ deploy:** finance ใช้งานได้ต่อเมื่อ **rules + FE deploy พร้อมกัน** (rules ไม่อยู่ใน CI hosting workflow → ต้อง `firebase deploy --only firestore:rules` เอง). **อย่าสร้าง user role finance จนกว่า rules+FE จะ live** (ไม่งั้น login ได้แต่ FE prod ยังไม่รู้จัก finance → หน้าโล่ง). finance ยังไม่มี dashboard เฉพาะ (F6) — ระหว่างนี้ใช้ home(read-all) + report + diary ได้

## Phase F4 — บังคับหลักฐานตามวิธีจ่าย (ปิดช่อง D) ✅ implemented (รอ deploy พร้อม FE sprint)

**ทำแล้ว:**
- BE `markDelivered`: ปฏิเสธถ้า `job.payment.payment_method === ''` (ต้องระบุวิธีชำระก่อนส่งมอบ); ถ้า method ∈ `โอน/เช็ค/เครดิต` → ต้องมี `delivery_slips` ≥ 1 (เดิม + ที่แนบใหม่). `เงินสด`/`อื่นๆ` ไม่บังคับสลิป (เงินสด → cash session F5)
- FE `create-work-sheet`: ช่อง "ยอดรวม" เป็น **read-only** = Σ items − ส่วนลด (getter `paymentTotal`) + เพิ่มช่อง **"ส่วนลด"** (formControl `discount`) + payment_method มี placeholder "เลือกช่องทาง" (default ''); `buildCreateJobPayload` ส่ง `discount` + total derived

**⚠️ deploy:** markDelivered enforcement เป็น behavior change บน live (งานที่ยังไม่มี method/สลิป จะส่งมอบไม่ได้จนกว่าจะแก้) → **bundle deploy พร้อม FE sprint** ไม่ปล่อย BE เดี่ยว (กันบล็อกการส่งมอบงานที่ค้างอยู่)

## Phase F5 — Cash reconciliation (กระทบยอดเงินสดรายวัน) ✅ implemented (BE; FE UI ใน F6)

collection `cash_sessions/{seller_uid}_{YYYYMMDD}` (วันตาม ICT/UTC+7):
- `system_total` = Σ `payment.total` ของงานเงินสดที่ `status='ส่งมอบแล้ว'` + ส่งมอบวันนั้น (server คำนวณ)
- `declared_total` = ยอดที่ seller นับส่งจริง · `variance = declared − system` (≠ 0 = ธงแดง)

**ทำแล้ว (BE):**
- `cash.ts`: `reconcileCashSession` (finance/admin — คำนวณ system_total + upsert doc, แก้ซ้ำได้จน close) + `closeCashSession` (lock). helper `ictDayBounds()` แปลง YYYYMMDD→UTC day-bounds, `computeCashSystemTotal()` query+sum
- `types.ts` CashSessionDoc + COL.cash_sessions; `index.ts` export
- `firestore.rules`: cash_sessions read canReadAll (finance/admin), write false
- `firestore.indexes.json`: 2 composite indexes (cash query + cash_sessions list)
- FE: `core/models/cash.ts` + `services/cash.service.ts` (reconcile/close/watchSessions) — **UI ยังไม่มี → อยู่ใน F6 Finance Dashboard**

**สมมติฐาน v1:** เงินสด = จ่ายเต็มยอด (`payment.total`) ตอนส่งมอบ. ถ้าในอนาคตมัดจำเงินสดคนละวัน ต้องแยกคิด (future refinement)

**⚠️ deploy:** ต้อง deploy functions + rules + **indexes** (`firebase deploy --only firestore:indexes`) — bundle FE sprint

## Phase F6 — Finance Dashboard (FE) ✅ implemented (รอ deploy พร้อม FE sprint)

หน้าใหม่ `pages/finance/` (standalone, route `/naikit-sticker/finance`, roleGuard admin+finance, nav SYSTEM + mobile):
- summary cards: ยอดขาย/เงินสด/สัดส่วนเงินสด (ธงแดง > 70%)/จำนวนครั้งปรับเงิน
- **กระทบยอดเงินสด**: ฟอร์ม reconcile (เลือก seller + วันที่ YYYYMMDD + ยอดนับได้) → `CashService.reconcile`; ตาราง sessions + variance + ปุ่มปิดรอบ (`close`)
- **ยอดขายแยก seller**: count/total/เงินสด/% เงินสด (เรียง % เงินสดมากก่อน — เพ่งเล็งคนเงินสดสูง)
- **ยอดขายแยกวิธีจ่าย**
- **audit ประวัติการเปลี่ยนยอดเงิน** (รวมทุกช่องทางที่เปลี่ยนยอด — ปิดช่องโหว่ risk B/C):
  วันที่/ใบงาน/**ที่มา**/โดย/ยอด before→after/มัดจำ before→after/เหตุผล (คลิกเปิดใบงาน). รวม 2 แหล่ง:
  - `payment_adjust` — การเงิน/แอดมินปรับ discount/deposit (payload `before`/`after`)
  - `edit` ที่ total เปลี่ยน — seller แก้ `work_items` ก่อนคอนเฟิร์ม (payload `payment_before`/`payment_after`);
    กรอง client-side เฉพาะที่ `total` ต่างจริง (แก้ชื่อ/เบอร์/หมายเหตุ ไม่ขึ้น). คอลัมน์ "ที่มา" ไฮไลต์ "แก้รายการงาน" สีเหลือง
- **outlier scan**: ส่งมอบแต่ deposit=0, ส่งมอบแต่ total=0, งานมีส่วนลด, งานที่ถูกลบ

**ทำแล้ว:** `finance.component.{ts,html}` (standalone); JobsService `watchPaymentAdjustEvents` + `watchEditEvents` + `watchDeletedJobs`; `firestore.indexes.json` +1 (`job_events action,at` — ใช้ทั้ง payment_adjust + edit); FE JobAction + worksheet-info ACTION_LABELS += payment_adjust; route + nav (sidebar+mobile)

**adjustPayment UI (ครบลูป):** ใน `worksheet-info` มีปุ่ม "💰 ปรับยอดเงิน (การเงิน)" สำหรับ role finance/admin → ฟอร์มปรับ discount/deposit/payment_method + เหตุผล (บังคับ) → `JobsService.adjustPayment` → event `payment_adjust`. payment summary แสดงส่วนลด + วิธีจ่ายด้วย

**ทั้งชุด F1–F6 implement ครบ** — เหลือ deploy bundle ตอนจบสปรินต์

---

## Phase F8 — Slip/Payment model + กันสลิปซ้ำ — DESIGN (ดู F8-SLIP-PAYMENT-DESIGN.md)

ปิดช่องโหว่ `delivery_slips` ที่เก็บแค่รูป (ไม่มี amount/ref → ตรวจสลิปซ้ำไม่ได้). โมเดล `payments` + `allocations` (1 การจ่าย ผูกหลายใบงาน) → hard rule `bank_ref` unique กันใช้สลิปซ้ำ พร้อมรองรับเคส multi-job/one-slip. **ยังเป็น design — รอ lock open decisions ก่อน build.** รายละเอียด: [`docs/F8-SLIP-PAYMENT-DESIGN.md`](./F8-SLIP-PAYMENT-DESIGN.md)

## Phase F7 — ราคากลาง (Rate Card + covert variance audit) — DESIGN (ดู F7-RATE-CARD-DESIGN.md)

ปิดช่องโหว่ที่ F1–F9 ยังไม่แตะ: **seller กดราคาในใบงานต่ำกว่าราคากลาง** แล้วเก็บเงินตามจริง ส่วนต่างเข้ากระเป๋า (ปนกับส่วนลดจริง → block ไม่ได้). เพิ่ม `rate_cards` (rate ขั้นบันไดตามขนาด, per_sqm/per_unit) → BE คำนวณ `price_audit` snapshot ลง job ตอนสร้าง/แก้ (silent, ไม่แตะ seller) → Finance Dashboard เห็นส่วนต่างแยก seller เชิงสถิติ. **ปิด "กดราคาในใบงาน" ได้ แต่ยังไม่ปิด "เก็บสดเกินที่บันทึก" (= ชั้น 2 receipt/QR แยกเฟส).** decisions D1–D7 lock แล้ว — รอ rate จริง + review ก่อน build. รายละเอียด: [`docs/F7-RATE-CARD-DESIGN.md`](./F7-RATE-CARD-DESIGN.md)

## Phase F9 — VAT + หัก ณ ที่จ่าย (WHT) + จังหวะรับเงิน — DESIGN (ดู F9-TAX-PAYMENT-DESIGN.md)

ปิดช่องว่างภาษี + การปิดงานที่ถูกหัก ณ ที่จ่าย + มัดจำ/บาลานซ์. เพิ่ม `tax` block (vat_mode นอก/ใน, wht_rate) → `net_receivable = grand_total − wht`; **settlement เปลี่ยนเป็น `paid_amount ≥ net_receivable`** (กัน WHT job ค้างตลอดกาล); **revise D5** — markDelivered เลิก hard-gate → รับบาลานซ์ตอนส่ง/ส่งแบบ AR. ระบบไม่ออกใบกำกับ (แค่คำนวณ). รายละเอียด: [`docs/F9-TAX-PAYMENT-DESIGN.md`](./F9-TAX-PAYMENT-DESIGN.md)

## Phase F15 — บันทึกการพิมพ์ + ตรวจสอบวัสดุ/เศษ — DESIGN (ดู F15-PRODUCTION-MATERIAL.md)

ปิดฝั่งที่ F1–F9/F7 ยังไม่แตะ: **ต้นทุนวัสดุ/การผลิตมองไม่เห็น** (คนพิมพ์เบิกเกิน/ตัดเสีย/วัสดุหาย). เพิ่ม `WorkItem.production` (วัสดุ/หน้ากว้างม้วน/ความยาว/จำนวนพิมพ์จริง) กรอกโดย role=production ตอน `upload_print` → **server คำนวณ `area_used` vs `area_billed` = เศษ%** + materials master (dropdown กันข้อมูลเลอะ) → Finance Dashboard เห็นเศษแยกคนพิมพ์/ยี่ห้อ. **F7 = audit ราคา(รายรับ) · F15 = audit วัสดุ(ต้นทุน) คู่กัน.** สติกเกอร์ชิ้นเล็กใช้ `roll_run` เฉลี่ยเศษระดับม้วน (กันตัวเลขเกินจริง). margin (area_used × cost) = F15.1 รอ `cost_per_sqm`. derived จาก print log จริง พ.ค.69. รายละเอียด: [`docs/F15-PRODUCTION-MATERIAL.md`](./F15-PRODUCTION-MATERIAL.md)

## Action enum เพิ่ม

```
payment_adjust   // finance/admin แก้เงินหลังสร้าง (before/after + reason)
material_upsert  // F15 — admin เพิ่ม/แก้ materials master
edit_production  // F15 — production/admin แก้บันทึกการพิมพ์ที่กรอกผิด (before/after)
```

## Payment shape (อัปเดต)

```ts
interface Payment {
  total: number;          // SERVER-AUTHORITATIVE = Σ work_items.total − discount
  discount: number;       // ใหม่: default 0, 0 ≤ discount ≤ Σ items
  deposit: number;        // 0 ≤ deposit ≤ total
  remaining: number;      // SERVER-DERIVED = total − deposit
  payment_method: 'เงินสด' | 'โอน' | 'เช็ค' | 'เครดิต' | 'อื่นๆ' | '';
  date_of_payment: Timestamp | null;
}
```

## เปลี่ยน controls นี้ทำยังไง

1. แก้เอกสารนี้ + SCHEMA.md ก่อน
2. แก้ `types.ts` (BE) + FE `core/models/job.ts` ให้ตรง
3. แก้ Cloud Functions + rules
4. แก้ FE service/page
