---
version: design v1 (decisions locked 2026-06-23)
project: naikit-sticker
status: Stage 1 (AR aging) + Stage 2 (unified ledger + migration) implemented (local, ยัง NOT pushed)
related: F5 (cash reconcile), F8 (slip/payment), F9 (tax), F10 (fees), F11 (other_fee)
---

# F12 — Payment ledger รวมศูนย์ + AR aging

## ปัญหา (ที่นิวชี้ 2026-06-23)

การจ่ายจริงมี **2 รอบ** (มัดจำ → ตอนรับงาน/เครดิต) ร้านต้องเก็บ **วันที่ · จำนวน · วิธี** ของทุกรอบ
และ **เครดิต (ลูกหนี้) ไม่ควรค้างนาน**

### ช่องโหว่ในระบบปัจจุบัน

1. **`payment.deposit` ไม่นับใน `paid_amount`/`outstanding`** — `createJob` ตั้ง `paid_amount: 0` เสมอ;
   `outstanding = receivable − paid_amount` (ไม่ลบ deposit). มัดจำเงินสดที่กรอกตอนสร้าง → ยอดค้างยังเต็ม
2. **เงินสดไม่มี ledger รายรอบ** — `payments` (F8) รองรับแค่ โอน/เช็ค; เงินสดเดินผ่าน deposit field +
   markDelivered (ไม่บันทึก วัน/บาท) + F5 reconcile รายวัน (aggregate). จับ "จ่ายวันไหน กี่บาท" ต่อรอบไม่ได้
3. **ไม่มี AR aging** — finance มี list "ลูกหนี้ค้างชำระ" แต่ไม่บอก "ค้างกี่วัน" / ไม่มีธงเตือนเกินกำหนด

## เป้าหมาย: ledger เดียวเป็น source of truth ของ "จ่ายแล้ว"

ทุกการจ่าย (มัดจำ + ยอดรับงาน + เงินสด + โอน/เช็ค) = 1 record ใน `payments` ที่มี
`{ paid_at, amount, method, bank_ref?, slip?, allocations }` → `paid_amount = Σ active − refunds`
→ `outstanding = receivable − paid_amount` ถูกต้องเสมอ ทุกวิธีจ่าย

## Decisions (LOCKED)

- **D1** — รวม **ทุกวิธี** เข้า `payments` ledger เดียว (รวมเงินสด). `paid_amount` = source of truth เดียว
- **D2** — **มัดจำตอนสร้าง = ledger entry แรก** อัตโนมัติ: `createJob` ถ้า `deposit > 0` → post payment
  `{ amount: deposit, method: payment_method, paid_at: date_of_payment, source: 'deposit' }`.
  `payment.deposit` คงไว้เป็น snapshot (display/back-compat) แต่ **ไม่ใช้คำนวณ outstanding อีก**
- **D3** — `createPayment` รองรับ `method='เงินสด'` (เดิมแค่ โอน/เช็ค); เงินสดไม่ต้องมี slip/bank_ref
- **D4** — **F5 cash reconcile เปลี่ยนฐาน**: `system_total` = Σ **ledger cash payments** (`method='เงินสด'`,
  `paid_at` ในวันนั้น ICT, per seller) แทน `Σ payment.total ของงานเงินสดที่ส่งมอบ`. เก็บเงินตามวันรับเงินจริง
  (ตัดปัญหา deposit เงินสดวันหนึ่ง + balance อีกวัน)
- **D5** — **adjustPayment ไม่แก้ deposit อีก** (deposit เป็น ledger แล้ว) — finance แก้เงินผ่าน void/เพิ่ม
  ledger entry แทน. คง discount/fee/method ปรับได้
- **D6** — **AR aging: เกิน 30 วัน นับจาก `date_of_completion` = ธงแดง** สำหรับงานส่งมอบแล้วที่ยังค้าง
- **D7** — **Migration** จำเป็น: งานเดิมที่ `deposit > 0` → backfill ledger "deposit" payment 1 รายการ
  (mark `backfilled:true`, idempotent, dry-run default) เพื่อให้ `paid_amount`/outstanding ถูกย้อนหลัง

## Rollout

- **Stage 1 — AR aging (DONE 2026-06-23, FE-only, non-breaking):** finance dashboard เพิ่ม "ค้างกี่วัน"
  + ธงแดง > 30 วัน + เรียงค้างนานสุดก่อน + นับงานเกินกำหนด. ใช้ `date_of_completion` + `paid_amount` เดิม
- **Stage 2 — Unified ledger (DONE local 2026-06-23, breaking + migration — ยัง NOT pushed):**
  1. ✅ BE types: `PaymentDoc.source: 'deposit' | 'payment'`; createPayment เซ็ต source='payment'
     (รับ `method='เงินสด'` อยู่แล้ว — slip บังคับเฉพาะโอน/เช็ค)
  2. ✅ createJob: post deposit เป็น ledger entry (D2, helper `buildDepositPaymentData`) + `paid_amount`
     เริ่มจาก deposit + guard (ต้องมีวิธีจ่ายจริง + deposit ≤ amountDue)
  3. ✅ F5 `computeCashSystemTotal` → นับ ledger cash (`method='เงินสด'`, paid_at ในวัน, attribute ต่อ seller) (D4)
  4. ✅ adjustPayment: ถอด deposit (D5) — force `deposit = before.deposit`
  5. ✅ FE: payment.ts source; worksheet-info "บันทึกการจ่าย" + เงินสด (slip/bank_ref ขึ้นเฉพาะโอน/เช็ค) +
     payment list แสดง "มัดจำ"/วันที่ + adjust form ถอดช่องมัดจำ (D5)
  6. ✅ Migration `scripts/backfill-deposit-ledger.ts` (D7, idempotent + dry-run)
  7. ✅ index ใหม่: `payments (is_deleted, status, method, seller_uids array-contains, paid_at)` สำหรับ F5 D4

**Deploy Stage 2 (bundle):** push BE functions (createJob/adjustPayment/cash เปลี่ยน) + FE hosting +
`firebase deploy --only firestore:indexes` (index ใหม่ payments — ต้อง build ก่อน F5 ใช้ได้) +
รัน `backfill-deposit-ledger.ts --apply` **หลัง** deploy (กัน F5 นับซ้ำช่วงคาบเกี่ยว). ⚠️ deploy D4(cash)+
migration ใกล้กัน — ก่อน migrate เสร็จ งานเก่ายังไม่มี ledger มัดจำ → cash reconcile จะ "ขาด" ชั่วคราว

## ความเสี่ยง Stage 2

- **Double-count F5**: ต้องสลับ D4 พร้อม deploy เดียวกับ migration — ไม่งั้นเงินสดนับ 2 ทาง
- **deposit field ซ้ำซ้อน**: หลัง D2 ต้องชัดเจนว่า outstanding ใช้ paid_amount เท่านั้น (ห้าม UI ไหนลบ deposit ซ้ำ)
- **markDelivered เงินสด**: ปัจจุบันถือว่ารับครบตอนส่ง — หลัง D1 ควรเตือนให้บันทึก ledger เงินสดก่อน/ตอนส่ง
