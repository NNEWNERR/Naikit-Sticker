---
version: design v1 (รอ confirm ก่อน build)
project: naikit-sticker
status: DESIGN — ต่อจาก F8. ทบทวน decision D5 (markDelivered gate) ใหม่
related: F8-SLIP-PAYMENT-DESIGN.md, FINANCE-CONTROLS.md, SCHEMA.md
---

# F9 — VAT + หัก ณ ที่จ่าย (WHT) + จังหวะรับเงิน (มัดจำ/บาลานซ์)

ปิดช่องว่างที่โมเดล F1–F8 ยังไม่มี: ภาษี + การปิดงานที่ถูกหัก ณ ที่จ่าย + จังหวะบันทึกเงิน

## บริบทธุรกิจ (ยืนยันแล้ว 2026-06-22)
- ร้าน**จด VAT** แต่ระบบนี้**ไม่ต้องออกใบกำกับภาษี** — ต้องการ VAT แค่เพื่อ**คำนวณราคาบางงานให้ถูก**
- **หัก ณ ที่จ่าย (WHT) บ่อย** — ลูกค้านิติบุคคล (B2B) เยอะ
- **มัดจำ/บาลานซ์หลากหลาย** — แล้วแต่งาน (เต็มก้อน / มัดจำ+บาลานซ์ / จ่ายตอนรับ)

---

## ปัญหา 3 จุดที่ต้องแก้

### P1. มัดจำที่กรอกตอนสร้าง ≠ เงินจริง
- `payment.deposit` (ตัวเลขบนใบงาน) **ไม่ทำให้ `paid_amount` ขยับ** — เงินจริงขยับเฉพาะตอน "บันทึกการจ่าย"
- → **deposit ต้องเป็น payment record** ไม่ใช่แค่ตัวเลข

### P2. markDelivered บังคับจ่ายครบ "ก่อน" ส่ง — ขัดกับ "รับเงินตอนส่งมอบ"
- D5 เดิม: โอน/เช็ค ต้อง `paid_amount ≥ total` ก่อนส่ง → แต่เคสจริงรับบาลานซ์**ตอน**ส่งมอบ
- `payment.payment_method` เป็นค่าเดียว → งานจริงมัดจำโอน+บาลานซ์เงินสด (2 วิธี) รองรับไม่ได้

### P3. WHT ทำให้งานปิดแล้วขึ้น "ค้างชำระตลอดกาล"
- ลูกค้าหัก WHT → จ่ายจริง = ยอดเต็ม − WHT → `paid_amount < total` ทั้งที่จบแล้ว
- ส่วน WHT ไม่ใช่หนี้ (เป็นเครดิตภาษี มีใบ 50 ทวิ)

---

## โมเดล: เพิ่ม `tax` block บน job

```ts
interface Tax {
  vat_mode: 'none' | 'exclusive' | 'inclusive'; // ไม่มี / VAT นอก / VAT ใน
  vat_rate: number;        // default 7 (0 ถ้า none)
  wht_rate: number;        // 0 | 1 | 2 | 3 | 5 (% หัก ณ ที่จ่าย, คิดจากฐานก่อน VAT)
  // ── derived (server คำนวณ) ──
  base: number;            // ราคางานก่อน VAT
  vat_amount: number;
  grand_total: number;     // ยอดออกบิล = base + vat
  wht_amount: number;      // = round(base × wht_rate%)
  net_receivable: number;  // = grand_total − wht_amount (เงินที่จะได้รับจริง)
  wht_cert_ref?: string;   // เลขใบ 50 ทวิ (เมื่อได้รับ)
}
```

### สูตรคำนวณ (`payment.total` = Σ work_items − discount เหมือนเดิม ไม่แตะ F1)
| vat_mode | base | vat_amount | grand_total |
|---|---|---|---|
| none | total | 0 | total |
| exclusive (นอก) | total | total × 7% | total × 1.07 |
| inclusive (ใน) | total ÷ 1.07 | total − base | total |

- `wht_amount = round2(base × wht_rate / 100)`  (WHT คิดจากฐานก่อน VAT — ตามสรรพากร)
- `net_receivable = grand_total − wht_amount`

> ตัวอย่าง: งาน 10,000 (ฐาน) · VAT นอก 7% · WHT 3%
> base 10,000 · vat 700 · grand_total 10,700 · wht 300 · **net_receivable 10,400**
> → ลูกค้าจ่ายจริง 10,400 + ออกใบ 50 ทวิ 300 = ปิดงาน

---

## เปลี่ยนสูตรปิดงาน (settlement)

- **เดิม:** `paid_amount ≥ payment.total`
- **ใหม่:** `paid_amount ≥ net_receivable` (จ่ายจริงครบ; ส่วน WHT มีเอกสาร)
- `outstanding = net_receivable − paid_amount` (ใช้ทั่ว dashboard/AR/markDelivered)

---

## P1 fix — มัดจำ = payment record

- ตอนสร้างใบงาน ถ้ารับมัดจำ → **บันทึกการจ่ายทันที** (1 payment record)
- `payment.deposit` เหลือเป็นแค่ "มัดจำที่ตั้งใจเก็บ" (display/quote) — **settlement ใช้ `paid_amount` (payments) เท่านั้น**
- job-level `payment.payment_method` กลายเป็น display ของ payment ล่าสุด/ผสม (ไม่ authoritative)

## P2 fix — markDelivered: รับเงิน "ตอน" ส่งมอบ (revise D5)

- **ยกเลิก gate "ต้องจ่ายครบก่อนส่ง"**
- markDelivered = จังหวะรับเงินก้อนสุดท้าย: UI โชว์ `outstanding` → seller เลือก
  1. **บันทึกบาลานซ์ + ส่งมอบ** (record payment ก้อนสุดท้าย แล้ว deliver ในสเต็ปเดียว) หรือ
  2. **ส่งแบบค้างชำระ** (เครดิต/AR) → `outstanding > 0` ขึ้น dashboard AR
- ไม่ผูกกับ `payment_method` ค่าเดียวอีก (ดู outstanding ตรงๆ)

## P3 fix — WHT settlement

- `wht_rate` ตั้งตอนสร้าง/แก้ (default 0; งาน B2B ตั้ง 1-3%)
- `wht_amount` server คำนวณ; `net_receivable` ลดตาม
- งานที่ paid_amount ครบ `net_receivable` = **ปิดงาน** (ไม่ขึ้นค้าง)
- dashboard AR แยก: "ค้างจริง" (outstanding) vs "รอใบ 50 ทวิ" (wht_amount > 0 && ยังไม่มี wht_cert_ref)

---

## ผลกระทบโค้ด

| ชั้น | เปลี่ยน |
|---|---|
| types/SCHEMA | + `Tax` block บน JobDoc; settlement = net_receivable |
| createJob/editJob | คำนวณ tax block จาก vat_mode/wht_rate + total; (เพิ่ม payment ถ้ารับมัดจำ) |
| markDelivered | ยกเลิก paid≥total gate → record-balance-or-AR (revise D5) |
| FE create/edit | + เลือก VAT (นอก/ใน/ไม่มี) + WHT % → โชว์ base/vat/grand/net แบบ live |
| FE worksheet-info | payment summary แสดง base/VAT/grand/WHT/net + outstanding ใช้ net_receivable |
| FE markDelivered | flow บันทึกบาลานซ์ + ส่งมอบ / ส่งแบบ AR |
| FE dashboard | AR แยก outstanding vs รอ 50 ทวิ; รายงานรวม VAT/WHT |

## Phased rollout
| งวด | scope |
|---|---|
| F9.1 | types + tax คำนวณใน createJob/editJob + SCHEMA (BE) |
| F9.2 | settlement = net_receivable + revise markDelivered (BE) |
| F9.3 | FE create/edit: VAT mode + WHT + live calc |
| F9.4 | FE worksheet-info: tax summary + markDelivered รับบาลานซ์/AR |
| F9.5 | FE dashboard: AR (outstanding vs รอ 50ทวิ) + รายงาน VAT/WHT |

## ✅ Defaults / decisions (เสนอ — confirm ได้)
1. VAT เป็น **per-job toggle** (default `none`; เลือก นอก/ใน ต่องาน) — ตรง "บางงาน"
2. VAT rate default **7**; WHT rate เลือก **0/1/2/3/5** (default 0)
3. WHT คิดจาก **ฐานก่อน VAT** (ตามสรรพากร)
4. **markDelivered เลิก hard-gate** → รับบาลานซ์ตอนส่ง หรือ ส่งแบบ AR (revise D5)
5. `payment.deposit` เก็บไว้เป็น display เฉยๆ; settlement ใช้ paid_amount + wht
6. ระบบนี้**ไม่ออกใบกำกับภาษี/50ทวิ** — แค่คำนวณ + เก็บเลขอ้างอิง (ออกเอกสารใช้ระบบบัญชีแยก)
