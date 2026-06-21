---
version: design v1 (ยังไม่ implement — รอ lock decisions)
project: naikit-sticker
status: DESIGN — ต้องยืนยัน "Open decisions" ก่อนเริ่ม build
related: FINANCE-CONTROLS.md (F1–F6), SCHEMA.md
audience: ทั้ง FE (Naikit-Sticker) + BE (Naikit-Sticker-BE)
---

# F8 — Slip / Payment model + กันสลิปซ้ำ

ส่วนขยายของ financial controls (ต่อจาก F1–F6 ใน FINANCE-CONTROLS.md)

## 1. ปัญหา & เป้าหมาย

**ช่องโหว่ปัจจุบัน:** `delivery_slips` เก็บแค่ `JobImage[]` (url + uploaded_by + at) — **ไม่มีจำนวนเงิน, ไม่มีเลขอ้างอิงโอน, ไม่ผูกข้ามใบงาน** → ตรวจสลิปซ้ำไม่ได้เลย

**vector ที่ต้องปิด:** seller เอาสลิปโอนของงานจริงใบหนึ่ง ไปแนบเป็นหลักฐาน "จ่ายแล้ว" ให้อีกใบงาน (ที่จริงรับเงินสดแล้วเก็บเข้ากระเป๋า) = ใช้สลิปซ้ำกลบยอด

**ข้อจำกัดสำคัญ (ห้ามพัง):** มีเคส legit ที่ **ลูกค้าสั่งหลายใบงาน จ่ายสลิปเดียว** → กฎ "1 สลิป = 1 ใบงาน ห้ามซ้ำ" ใช้ไม่ได้

**เป้าหมาย:**
1. มองสลิป = "ยอดเงิน + เลขอ้างอิง" ไม่ใช่แค่รูป
2. ผูกสลิปเดียวกับหลายใบงานได้ (รองรับเคส legit) โดยมีการ reconcile ผลรวม
3. ตรวจจับการใช้สลิป/เลขอ้างอิงซ้ำข้ามกลุ่ม/ลูกค้า
4. รู้ว่าแต่ละใบงาน "จ่ายจริงไปเท่าไหร่" (paid vs outstanding)

## 2. Non-goals
- ไม่ทำ OCR อ่านสลิปอัตโนมัติ (เฟสนี้กรอก amount/ref เอง; hash เป็น optional)
- ไม่เชื่อมธนาคาร/verify โอนจริง (นอกขอบเขต)
- ไม่ยุ่ง F5 cash_sessions เดิม (ดู §11 ความสัมพันธ์)

## 3. สถานะปัจจุบัน (ของจริงในโค้ด)
- `jobs.payment` = `{ total, discount, deposit, remaining, payment_method, date_of_payment }`
- `jobs.delivery_slips: JobImage[]` (แนบตอน `markDelivered`)
- F4: `markDelivered` บังคับ `payment_method ≠ ''`; ถ้า โอน/เช็ค/เครดิต → `delivery_slips ≥ 1` (แค่ "มีรูป" — ไม่เช็คยอด/ซ้ำ)

## 4. โมเดลหลัก — collection `payments` (one doc = หนึ่งการจ่ายจริง)

หนึ่ง "การจ่าย" (สลิปโอน 1 ครั้ง / รับเงินสด 1 ก้อน) = 1 doc; ผูกได้หลายใบงานผ่าน `allocations`

### `payments/{paymentId}`
| field | type | required | notes |
|---|---|---|---|
| `method` | `'เงินสด' \| 'โอน' \| 'เช็ค' \| 'เครดิต' \| 'อื่นๆ'` | ✓ | |
| `amount` | number | ✓ | ยอดเงินจริงในสลิป/ที่รับ |
| `bank_ref` | string | — | เลขอ้างอิงโอน / 4 ตัวท้าย+เวลา (โอน/เช็ค **บังคับ**); เงินสด = `''` |
| `slip_url` | string \| null | — | รูปสลิป (โอน/เช็ค **บังคับ**) |
| `slip_hash` | string \| null | — | optional image fingerprint (sha256) — จับภาพซ้ำ |
| `paid_at` | Timestamp | ✓ | วันเวลาที่จ่าย |
| `allocations` | `{ job_id: string; amount: number }[]` | ✓ | จัดสรรเงินก้อนนี้ลงแต่ละใบงาน (min 1) |
| `allocated_total` | number | ✓ | = Σ allocations.amount (denormalized) |
| `customer_name` | string | ✓ | snapshot — ช่วย dedupe ข้ามลูกค้า |
| `status` | `'active' \| 'voided'` | ✓ | voided = เช็คเด้ง/โอนปลอม/ยกเลิก → **ไม่นับใน paid_amount** (ดู §15) |
| `voided_reason` / `voided_by_uid` / `voided_at` | string / string\|null / Timestamp\|null | — | เซ็ตเมื่อ void |
| `note` | string | — | |
| `created_by_uid` / `created_at` | string / Timestamp | ✓ | |
| `updated_by_uid` / `updated_at` | string / Timestamp | ✓ | |
| `is_deleted` / `deleted_at` | boolean / Timestamp\|null | ✓ | soft delete (ใช้กรณีกรอกผิดล้วนๆ; การยกเลิกจริงใช้ void/refund) |

> `jobs.paid_amount` = Σ allocations จาก payment ที่ `status='active'` AND `is_deleted=false` − Σ refunds (§15)

### ฝั่ง `jobs` (derived/denormalized)
- เพิ่ม `paid_amount: number` (= Σ allocations ที่ชี้มาที่ใบงานนี้ จากทุก payment ที่ไม่ลบ) — อัปเดตโดย CF
- `outstanding = payment.total − paid_amount` (computed ฝั่ง FE)
- คง `delivery_slips` ไว้เพื่อ backward-compat (history); flow ใหม่ใช้ `payments` (ดู migration §11)

## 5. Invariants (บังคับฝั่ง Cloud Function)
1. **`allocated_total = Σ allocations.amount ≤ amount`** — จัดสรรเกินยอดสลิปไม่ได้ (overpay สลิปทอน = ปล่อยได้, ขาด = ปล่อยได้/flag)
2. **method ∈ {โอน, เช็ค} → `bank_ref` ไม่ว่าง + `slip_url` ไม่ว่าง**
3. **per-job: Σ(allocations active ของใบงานนั้น) ≤ job.payment.total** — จ่ายเกินยอดงานไม่ได้ (เกิน = ต้องผ่าน refund §15)
4. ทุก `allocations[].job_id` ต้องมีจริง + ไม่ถูกลบ + (ถ้า seller สร้าง) ต้องเป็นงานของตัวเอง
5. **`bank_ref` (ไม่ว่าง) ต้อง unique ข้าม payments ที่ไม่ลบ** ← กฎหลักกันสลิปซ้ำ (ดู §6)
6. **`editJob`/`adjustPayment` ห้ามทำให้ `job.payment.total < paid_amount`** — ถ้าจะลดยอดต่ำกว่าที่จ่ายมาแล้ว ต้องคืนเงินส่วนเกิน (refund §15) ก่อน → CF reject พร้อมข้อความชี้ไป refund flow
7. **`deleteJob` ของงานที่มี active payment → reject** ("ต้อง void/refund payment ก่อนลบ") — กันเงินค้างลอย (orphaned allocation)

## 6. การตรวจจับสลิปซ้ำ (reuse detection)
- **Hard rule (CF reject):** `bank_ref` ซ้ำ = ปฏิเสธตอนสร้าง payment. โอน 1 ครั้งจริง = ref เดียว = payment doc เดียว → จะใช้ซ้ำอีกใบไม่ได้. **เคส multi-job รองรับด้วย `allocations` หลายงานใน payment เดียว** (ไม่ต้องสร้าง doc ซ้ำ)
- **Soft flag (dashboard):**
  - `slip_hash` เดียวกันแต่ `bank_ref`/`customer_name` ต่าง → ภาพสลิปซ้ำ/ตัดต่อ
  - `amount` ของ payment < `allocated_total` (จัดสรรไม่ครบ — ปกติ; เกิน = ถูก reject แล้ว)
  - payment ที่ allocations ชี้ไปงานต่าง `customer_name` กัน → น่าสงสัย (สลิปลูกค้า A ไปจ่ายงานลูกค้า B)

## 7. เคส multi-job / one-slip (หัวใจ)
ลูกค้าสั่ง 3 ใบงาน (รวม 4,500) โอนสลิปเดียว 4,500:
→ สร้าง **payment 1 doc**: amount 4500, bank_ref "x", allocations `[{J1,1500},{J2,2000},{J3,1000}]`
→ invariant ผ่าน (Σ=4500 ≤ 4500), แต่ละงาน paid_amount ครบ → ปิดงานได้
→ ใช้ ref นี้ซ้ำอีกไม่ได้ (hard rule #5). **legit ผ่าน, reuse ถูกปิด** ด้วยโมเดลเดียว

### 7b. จ่ายหลายงวด / 1 งาน (มัดจำโอน → ที่เหลือเงินสดวันรับงาน)
งาน J1 ยอด 3,000: มัดจำโอน 1,000 (วันสั่ง) + เงินสด 2,000 (วันรับ)
→ **payment 2 doc**: P1 {โอน, 1000, ref, alloc [{J1,1000}]} + P2 {เงินสด, 2000, alloc [{J1,2000}]}
→ `J1.paid_amount = 3000` (Σ active payments) = total → `markDelivered` ผ่าน
→ ยืนยัน: เงื่อนไข markDelivered เช็ค **ผลรวมทุก payment** ไม่ใช่ใบเดียว (§10)

## 8. RBAC
| action | seller | finance | admin |
|---|---|---|---|
| createPayment (ผูกงานตัวเอง) | ✓ งานที่ `seller_uid=self` | ✓ ทุกงาน | ✓ |
| editPayment / deletePayment | — | ✓ + reason | ✓ + reason |
| read payments | งานของตัวเอง | ทั้งหมด | ทั้งหมด |
- ทุก mutation ผ่าน Cloud Function (rules `write:false`); read scoped ตามตาราง
- แก้/ลบ payment → log `payment_event` (before/after/reason) แบบเดียวกับ `payment_adjust`

## 9. firestore.rules + indexes
- `match /payments/{id}`: `read: canReadAll() || (role=='seller' && resource.data ผูกงานตัวเอง*)`; `write: false`
  - *seller read: ผูกงานตัวเองตรวจยากใน rules (allocations เป็น array) → ตัวเลือก: เก็บ `seller_uids: string[]` denormalized บน payment เพื่อ rules เช็ค `request.auth.uid in resource.data.seller_uids`
- indexes: `payments (bank_ref)` [unique enforced by CF, index for lookup], `payments (is_deleted, created_at desc)`, `payments (seller_uids array-contains, ...)` ถ้าต้อง query ฝั่ง seller

## 10. Cloud Functions (callables ใหม่)
- `createPayment { method, amount, bank_ref?, slip_url?, slip_hash?, paid_at, allocations[], customer_name }` → validate invariants + เช็ค bank_ref unique (tx) + เขียน payment + อัปเดต `jobs.paid_amount` ทุกงานใน allocations (tx) + audit
- `editPayment { payment_id, ...patch, reason }` (finance/admin)
- `voidPayment { payment_id, reason }` (finance/admin) — เช็คเด้ง/ปลอม/ยกเลิก → `status='voided'` + ลด paid_amount คืน (§15)
- `deletePayment { payment_id, reason }` (finance/admin) — soft delete (กรณีกรอกผิดล้วนๆ) + ลด paid_amount คืน
- `createRefund` / `voidJobAndRefund` (finance/admin) — คืนเงิน/ยกเลิกงานหลังจ่าย (§15)
- ปรับ `markDelivered` (F4): โอน/เช็ค → เปลี่ยนจาก "ต้องมี delivery_slips ≥ 1" เป็น **"`paid_amount ≥ total` จากผลรวม payment ที่ active ทุกใบ"** (รองรับจ่ายหลายงวด — มัดจำโอน + balance; ดู §7b). `เครดิต` = ยอมให้ outstanding > 0 (จ่ายทีหลัง) แต่ flag ใน dashboard. `เงินสด`/`อื่นๆ` = ผ่าน F5 reconcile

**Atomicity (#8):** `createPayment`/`void`/`refund` ที่กระทบหลายงาน ต้องอัปเดต `jobs.paid_amount` ทุกงาน **ใน transaction เดียว** กับการเขียน payment + audit — ห้าม drift. Firestore tx เขียนได้ ≤ 500 docs แต่ contention สูงถ้าเยอะ → **จำกัด allocations ≤ 20 งาน/payment** (เกินนั้นแยกหลาย payment). อ่านงานทั้งหมดก่อน (tx.get) แล้วค่อยเขียน

## 11. ความสัมพันธ์กับ F4/F5/F6 + migration
- **F4 markDelivered:** evolve เงื่อนไขหลักฐานจาก "รูป" → "payment record ที่มียอด+ref" (โอน/เช็ค)
- **F5 cash_sessions:** เงินสดก็เป็น `payments` (method=เงินสด) ได้ → อนาคต `system_total` คำนวณจาก payments แม่นกว่า (เฟสนี้ยังไม่แตะ F5)
- **F6 dashboard:** เพิ่ม panel "สลิป/การจ่าย" — reuse flags (dup ref/hash, cross-customer), งานที่ outstanding > 0 แต่ ส่งมอบแล้ว
- **migration `delivery_slips`:** เอกสารเก่าคง `delivery_slips` ไว้ (read-only history). ไม่ backfill เป็น payments (ไม่มี amount/ref ย้อนหลัง). flow ใหม่หลัง deploy ใช้ payments

## 12. Phased rollout
| งวด | scope |
|---|---|
| F8.1 | schema `payments` + types + rules + indexes (deploy ได้ ไม่กระทบ FE) |
| F8.2 | BE `createPayment` + invariants + bank_ref unique + อัปเดต paid_amount + audit |
| F8.3 | BE editPayment/voidPayment/deletePayment + evolve markDelivered (sum-of-payments) |
| F8.4 | BE refund/void-job-and-refund flow + total<paid guard + deleteJob guard (§15) |
| F8.5 | FE: ฟอร์มบันทึกการจ่าย (amount/ref/slip/หลายงาน) + ปุ่ม void/refund (finance) |
| F8.6 | FE Finance Dashboard: panel reuse detection + outstanding + refund/void log |
| F8.7 (opt) | bank reconcile: เทียบ Σ โอน/เช็ค active กับ statement ธนาคารจริง (mirror F5 cash) |

## 13. ⚠️ Open decisions (ต้องยืนยันก่อน build)
1. **bank_ref ซ้ำ = hard reject หรือ soft flag?** — แนะนำ **hard reject** (กันได้จริง) แต่ถ้าบางทีลูกค้าโอนหลายรอบ ref ใกล้กัน/กรอกผิด อาจรำคาญ → fallback: reject เฉพาะซ้ำ "ทั้ง ref+amount เท่ากัน"
2. **seller สร้าง payment ได้ไหม หรือเฉพาะ finance/admin?** — seller สร้าง = สะดวก (คนรับเงิน) แต่ลด separation; finance-only = ปลอดภัยกว่าแต่คอขวด. แนะนำ seller สร้างได้ (งานตัวเอง) + dashboard/reconcile เป็นตัวจับ
3. **markDelivered ผูกกับ payment เลย หรือยังให้แนบรูปได้อยู่?** — แนะนำเปลี่ยนเป็น payment-based แต่ช่วง transition ให้ยอมรับทั้งสอง
4. **เก็บ slip_hash ไหม?** (ต้องคำนวณ sha256 ฝั่ง FE ตอน upload) — แนะนำเก็บ (ถูก + เพิ่มสัญญาณจับภาพซ้ำ)
5. **เงินสดเป็น payment doc ด้วยไหม หรือเฉพาะ โอน/เช็ค?** — เฟสนี้โฟกัส โอน/เช็ค (ตัวที่มีสลิป); เงินสดทำผ่าน F5 reconcile ไปก่อน
6. **partial payment / มัดจำ:** payment ก้อนมัดจำ (โอน) + ก้อน balance (เงินสด) = 2 payments ต่อ 1 งาน — โมเดล allocations รองรับ (§7b) ยืนยันว่าโอเค
7. **markDelivered บังคับ `paid_amount ≥ total` ไหม?** — แนะนำบังคับเฉพาะ โอน/เช็ค; เงินสด/อื่นๆ ผ่าน F5; **เครดิต = ปล่อย outstanding ได้** (จ่ายทีหลัง) + flag dashboard. ยืนยันว่าธุรกิจมี "ส่งของก่อนเก็บเงิน" จริงไหม
8. **refund/void อนุมัติโดยใคร?** — แนะนำ **finance/admin เท่านั้น** (seller ขอ refund เองไม่ได้ = กันปลอมยกเลิกดูดเงิน). ยืนยัน
9. **void ต่างจาก delete payment ยังไง?** — void = เคยจ่ายจริงแต่ภายหลังเสีย (เช็คเด้ง/ยกเลิก) เก็บประวัติ; delete = กรอกผิดล้วนๆ. ทั้งคู่ลด paid_amount แต่ void เก็บ audit ชัดกว่า

## 15. Refund / Void / Reversal (ยกเลิก, คืนเงิน, เช็คเด้ง)

เคสที่มักลืม แล้วกลายเป็นช่องโกง ("ปลอมยกเลิกเพื่อดูดเงินคืน") — ต้องมีโมเดลชัด

**3 สถานการณ์ที่ต่างกัน:**

| สถานการณ์ | กลไก | ผลต่อ paid_amount |
|---|---|---|
| **เช็คเด้ง / โอนปลอม / payment เสีย** | `voidPayment` → `status='voided'` + reason | ลดคืน (ไม่นับ voided) |
| **กรอก payment ผิดล้วนๆ** | `deletePayment` → soft delete | ลดคืน |
| **ลูกค้ายกเลิก/คืนงานหลังจ่ายจริง** (เงินออกจริง) | `createRefund` → doc แยก money-out | net = paid − refunded |

### `refunds/{refundId}` (เงินออก — ต้อง finance/admin อนุมัติ)
| field | type | notes |
|---|---|---|
| `job_id` (หรือ allocations หลายงาน) | string | งานที่คืนเงิน |
| `amount` | number | ยอดคืน (≤ paid_amount ของงาน) |
| `method` | enum | ช่องทางคืน (เงินสด/โอน) |
| `reason` | string | บังคับ |
| `approved_by_uid` | string | finance/admin (ไม่ใช่ seller) |
| `created_at` / `is_deleted` ... | | |

**กฎ:**
- `createRefund` role **finance/admin เท่านั้น** (seller ขอเองไม่ได้ = กันปลอมยกเลิกดูดเงิน)
- `amount ≤ job.paid_amount` (คืนเกินที่จ่ายมาไม่ได้)
- ยกเลิกงานที่จ่ายแล้ว = `createRefund` (ถ้าคืนเงิน) → แล้วค่อย void/delete job; **`deleteJob` ที่มี active payment ถูก block** (invariant #7) จนกว่าจะ void/refund ก่อน
- **total < paid (invariant #6):** ลด total ต่ำกว่าจ่ายแล้ว → CF ชี้ไป refund ส่วนเกินก่อน
- ทุก void/refund → audit event (`payment_void` / `refund`) before/after + reason + actor → โผล่ใน dashboard

### Dashboard (F8.6) เพิ่ม flag
- refund/void log (ใคร/เมื่อ/ยอด/เหตุผล) — โดยเฉพาะ **refund บ่อยผิดปกติต่อ seller**
- งาน `ส่งมอบแล้ว` ที่ `outstanding > 0` (ส่งของแต่ยังเก็บเงินไม่ครบ — โดยเฉพาะที่ไม่ใช่เครดิต)

## 16. ข้อจำกัด & control นอกระบบ (สำคัญ — ซอฟต์แวร์จบตรงไหน)

F1–F8 ตรวจได้เฉพาะ **"สิ่งที่ถูกบันทึกในระบบ"** vector ข้างล่างอยู่นอกขอบเขต ต้องเสริมด้วยกระบวนการ:

| ความเสี่ยง | ทำไมซอฟต์แวร์จับไม่ได้ | control นอกระบบที่ต้องมี |
|---|---|---|
| **งานนอกระบบ (off-book/ghost)** | งานที่ไม่เคยสร้าง = มองไม่เห็น 100% | คุมวัสดุ/สต็อก (เบิกไวนิล/หมึกผูกใบงาน), เทียบวัสดุที่ใช้ vs ยอดในระบบ, ใบเสร็จมีเลขใบงานทุกครั้งให้ลูกค้าถือ (ลูกค้า = พยาน) |
| **โอนปลอม / ref แต่งขึ้น** | ระบบ verify กับธนาคารจริงไม่ได้; uniqueness กันแค่ "ซ้ำ" ไม่กัน "แต่งใหม่" | **reconcile Σ payment(โอน) active เทียบ statement ธนาคารจริงเป็นงวด** (F8.7) + slip_hash จับภาพซ้ำ/ตัดต่อ |
| **สมรู้ร่วมคิด (finance/admin เองโกง หรือ seller+production)** | controls ตั้งบนสมมติฐาน "ผู้ทุจริต = คนเดียว" | finance ≠ ผู้ถือเงินสด, เจ้าของจริง review log เป็นงวด, **แยกคนอนุมัติ refund ออกจากคนรับเงิน** |
| **ปลอมยกเลิก/refund ดูดเงิน** | ถ้า refund อนุมัติได้ง่าย | refund = finance/admin only + reason + audit (§15) |

> หลักการ: ซอฟต์แวร์ทำให้ "การโกงที่บันทึกไว้" ตรวจเจอและแก้ยาก; แต่ "การไม่บันทึก" ต้องปิดด้วยกระบวนการ (วัสดุ/ใบเสร็จ/แบ่งหน้าที่)

## 17. สรุป
โมเดล `payments` + `allocations` ปิด vector สลิปซ้ำ (hard rule: ref unique) พร้อมรองรับ multi-job/one-slip + จ่ายหลายงวด/งาน ในโมเดลเดียว + ให้ข้อมูล paid/outstanding ที่ระบบยังไม่มี. เติม refund/void/reversal (§15) ปิดเคสยกเลิก/เช็คเด้ง/แก้ยอดหลังจ่าย. §16 ระบุชัดว่าซอฟต์แวร์จบตรงไหน ต้องเสริมด้วย control นอกระบบ (off-book/fake-ref/collusion). ตอนนี้เป็น **design** — รอ lock §13 (9 decisions) ก่อน implement ตาม F8.1–F8.7
