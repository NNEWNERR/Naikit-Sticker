---
version: v2 (rebuild)
project: naikit-sticker (Firebase)
backend: Naikit-Sticker-BE (Cloud Functions v2)
frontend: Naikit-Sticker (Angular 17 + Tailwind)
audience: ทั้ง FE และ BE อ้างเอกสารนี้เป็น source of truth
---

# Naikit Sticker — Schema (v2 rebuild)

เอกสารนี้กำหนด **schema ของ Firestore + RBAC + status transitions** สำหรับการรื้อรอบที่ 2
ทั้ง FE (`Naikit-Sticker`) และ BE (`Naikit-Sticker-BE`) ต้อง consistent กับเอกสารนี้
การแก้ schema ต้องอัปเดตเอกสารนี้ก่อนแก้โค้ด

## หลักการ

- **Identity = Firebase Auth uid** — ทุก collection ที่มี ownership ใช้ `*_uid` (string) ที่ตรงกับ Firebase Auth uid
- **Role = custom claim** — เก็บใน Firebase Auth ID token (`role`); FE อ่านจาก token, BE/rules อ่านจาก `request.auth.token.role`
- **Soft delete** — ทุก collection มี `is_deleted: boolean` + `deleted_at: Timestamp | null`; query ต้อง filter `where('is_deleted', '==', false)`
- **Server timestamps** — ใช้ `serverTimestamp()` ทุกที่; ห้าม `new Date()` ฝั่ง client สำหรับ `created_at` / `updated_at`
- **No hex/style ใน templates** — บังคับโดย `npm run design:lint`
- **เลิกใช้** legacy field: `book.*`, `project_id`, `group_id`, `modify` (จาก Krungthon-Air leftover)

## Collections

### `users/{uid}`

Key = Firebase Auth uid ของ user

| field | type | required | notes |
|---|---|---|---|
| `username` | string | ✓ | unique, lowercase, [a-z0-9_]+ |
| `display_name` | string | ✓ | ชื่อที่แสดง ("ฟลุ๊ค") |
| `role` | `'seller' \| 'graphic' \| 'production' \| 'admin' \| 'finance' \| 'stock'` | ✓ | mirror ของ custom claim. `finance` = ผู้ตรวจเงิน (F3): read-all (jobs/job_events/comments/users ทั้งหมดเหมือน admin) + adjustPayment; ไม่ทำ workflow/สร้างงาน/จัดการ user. `stock` = พนักงานสต๊อก (F17): อ่าน/เขียนเฉพาะ stock_* — ไม่เห็น jobs/เงิน (home redirect ไป /stock) |
| `is_active` | boolean | ✓ | false = ล็อกล็อกอิน |
| `created_at` | Timestamp | ✓ | serverTimestamp |
| `created_by_uid` | string | ✓ | admin uid ที่สร้าง (หรือ `"system"` สำหรับ seed) |
| `updated_at` | Timestamp | ✓ | serverTimestamp ทุก update |
| `updated_by_uid` | string | ✓ | admin uid ที่แก้ไขล่าสุด (หรือ `"system"`) |
| `is_deleted` | boolean | ✓ | |
| `deleted_at` | Timestamp \| null | ✓ | |

**สำคัญ**: doc นี้ถูกสร้าง/แก้ไข **ผ่าน Cloud Function เท่านั้น** — `firestore.rules` ห้าม client write ตรง
เพราะ password + custom claim ต้องเซ็ตพร้อมกันใน admin context

### `jobs/{jobId}`

ใบงานหลัก — แทนที่ `jobs` collection เดิม (ลบทิ้งทั้งหมด)

| field | type | required | notes |
|---|---|---|---|
| `serial_number` | string | ✓ | unique ต่อปี (e.g. "NK-2604-018"); index ASC |
| `customer_name` | string | ✓ | |
| `contact` | `'หน้าร้าน' \| 'เฟสบุ๊ค' \| 'ไลน์' \| 'อีเมล' \| 'โทรศัพท์'` | ✓ | |
| `phone` | string | — | |
| `line_name` | string | — | |
| `is_urgent` | boolean | ✓ | default false |
| `status` | StatusEnum (ดูข้างล่าง) | ✓ | default `'รอออกแบบ'` |
| `seller_uid` | string | ✓ | uid ของผู้สร้าง (role=seller) — เป็นเจ้าของฝั่งขาย |
| `design_uid` | string \| null | ✓ | null = ยังอยู่ในคิวกลางออกแบบ |
| `print_uid` | string \| null | ✓ | null = ยังอยู่ในคิวกลางผลิต |
| `work_items` | `WorkItem[]` | ✓ | embedded; min length 1 เมื่อ submit |
| `payment` | `Payment` | ✓ | embedded; ดูข้างล่าง |
| `worksheet_image` | string \| null | — | URL จาก Storage |
| `reference_images` | string[] | — | max 10 |
| `design_images` | `Image[]` | — | |
| `print_images` | `Image[]` | — | |
| `date_of_acceptance` | Timestamp | ✓ | วันลูกค้านัดรับงาน |
| `design_date` | Timestamp \| null | — | ตั้งเมื่อ claim design |
| `date_of_submission` | Timestamp \| null | — | ตั้งเมื่อ graphic submit แบบ |
| `confirm_uid` | string \| null | — | uid ของ seller ที่กดคอนเฟิร์ม |
| `confirm_date` | Timestamp \| null | — | |
| `print_date` | Timestamp \| null | — | ตั้งเมื่อ claim print |
| `date_of_completion` | Timestamp \| null | — | ตั้งเมื่อกดส่งมอบ |
| `remark` | string | — | |
| `created_at` | Timestamp | ✓ | serverTimestamp |
| `created_by_uid` | string | ✓ | = seller_uid (ยกเว้น admin สร้างแทน) |
| `updated_at` | Timestamp | ✓ | serverTimestamp ทุก update |
| `updated_by_uid` | string | ✓ | |
| `is_deleted` | boolean | ✓ | |
| `deleted_at` | Timestamp \| null | ✓ | |

**Embedded types:**

```ts
type StatusEnum =
  | 'รอออกแบบ'        // เพิ่ง create — ยังไม่มี design_uid
  | 'กำลังออกแบบ'      // graphic claim แล้ว — มี design_uid
  | 'รอคอนเฟิร์มแบบ'   // graphic submit — รอ seller คอนเฟิร์ม
  | 'คอนเฟิร์มแล้ว'     // seller คอนเฟิร์ม — รอเข้าคิวผลิต
  | 'รอผลิต'           // ส่งเข้าคิวผลิต — ยังไม่มี print_uid
  | 'กำลังผลิต'        // production claim — มี print_uid
  | 'รอส่งมอบ'         // พิมพ์เสร็จ — รอส่งลูกค้า
  | 'ส่งมอบแล้ว';      // ปิดงาน

interface WorkItem {
  type: string;          // 'ไวนิล' | 'สติกเกอร์' | 'ตรายาง' | ...
  width: number;
  height: number;
  unit_of_length: 'mm.' | 'cm.' | 'inch' | 'm.';
  option: string;        // 'ตาไก่' | 'พับขอบ' | ...
  quantity: number;
  unit_price: number;
  total: number;         // = quantity * unit_price
  production?: Production;// F15 — กรอกโดย role=production ตอน upload_print; optional จนกว่าจะพิมพ์
}

interface Production {   // F15 — บันทึกการพิมพ์ + audit วัสดุ/เศษ. ดู docs/F15-PRODUCTION-MATERIAL.md
  material_id: string;   // ref materials/{id}
  material_label: string;// snapshot ('ดีรุยเซ่น หลังขาว')
  backing: 'หลังขาว' | 'หลังดำ' | 'หลังเทา' | '';  // เฉพาะไวนิล
  roll_width_m: number;  // หน้ากว้างม้วน (dropdown ตาม material; F7 Q2b)
  length_used_m: number; // ความยาวที่ใช้จริง — คนพิมพ์กรอก
  qty_printed: number;   // จำนวนพิมพ์จริง (prefill = quantity)
  roll_run_id: string | null;        // ผูกหลาย item พิมพ์รวมม้วน (null = เดี่ยว)
  // ── SERVER-คำนวณ (read-only; ห้ามเชื่อ client) ──
  area_used_sqm: number;             // = roll_width_m × length_used_m
  area_billed_sqm: number;           // = (w × h) × qty_printed
  waste_pct: number;                 // = (used − billed)/used × 100
  waste_severity: 'none' | 'soft' | 'hard'; // ตาม config/finance (area_billed < floor → none)
  printed_by_uid: string;            // auto = ผู้กด upload_print (server set)
  printed_at: Timestamp;
}

interface Payment {
  total: number;         // SERVER-AUTHORITATIVE = sum(work_items.total) - discount; client total ถูก ignore
  discount: number;      // default 0; 0 ≤ discount ≤ sum(work_items.total)
  shipping_fee: number;  // F10 — ค่าส่ง (ลูกค้าจ่ายเพิ่ม), บวกท้ายบิล นอกฐาน VAT/WHT; default 0
  transfer_fee: number;  // F10 — ค่าธรรมเนียม เช็ค/โอน (ลูกค้าจ่ายเพิ่ม), นอกฐาน VAT/WHT; default 0
  other_fee: number;     // ค่าใช้จ่ายอื่นๆ ที่เป็นบริการ (เช่น ค่าออกแบบ) — **อยู่ในฐาน VAT/WHT**;
                         // แยกจาก total เพื่อไม่ให้ F7 price-audit เพี้ยน; default 0
  other_fee_note: string;// บังคับเมื่อ other_fee > 0 (กัน catch-all ไร้ที่มา)
  deposit: number;       // 0 ≤ deposit ≤ (total + other_fee)
  remaining: number;     // SERVER-DERIVED = (total + other_fee) - deposit (ค่างาน)
  payment_method: 'เงินสด' | 'โอน' | 'เช็ค' | 'เครดิต' | 'อื่นๆ' | '';
  date_of_payment: Timestamp | null;
}
// ยอดที่ลูกค้าต้องจ่าย/ร้านต้องได้รับ (F10) = tax.net_receivable + shipping_fee + transfer_fee
//   (other_fee อยู่ในฐาน VAT/WHT แล้ว → สะท้อนใน tax.net_receivable; ไม่บวกซ้ำ)
// ฐานภาษี (F9) = total + other_fee (taxableTotal); settlement/guards/payment cap ใช้ net_receivable+fees
// invariant บังคับฝั่ง BE (F1): work_item.total === quantity × unit_price.
// แก้ payment หลังสร้างได้เฉพาะ finance/admin ผ่าน adjustPayment. ดู docs/FINANCE-CONTROLS.md

interface Tax {                  // F9 — server คำนวณจาก (payment.total + other_fee) + vat_mode/wht_rate
  vat_mode: 'none' | 'exclusive' | 'inclusive'; // ไม่มี / VAT นอก / VAT ใน
  vat_rate: number;             // 7 (0 ถ้า none)
  wht_rate: number;             // 0|1|2|3 (% หัก ณ ที่จ่าย, คิดจากฐานก่อน VAT)
  base: number; vat_amount: number; grand_total: number;
  wht_amount: number;           // base × wht_rate%
  net_receivable: number;       // grand_total − wht_amount (ยอดที่จะได้รับจริง)
  wht_cert_ref: string;         // เลขใบ 50 ทวิ
}
// settlement (F9): paid_amount ≥ net_receivable = ปิดงาน (กัน WHT job ค้างตลอดกาล).
// markDelivered ไม่ hard-gate การจ่ายแล้ว — รับบาลานซ์ตอนส่ง/ส่งแบบ AR. ดู docs/F9-TAX-PAYMENT-DESIGN.md

interface Image {
  id: string;            // uuid
  url: string;
  uploaded_at: Timestamp;
  uploaded_by_uid: string;
}
```

**Indexes** — `firestore.indexes.json` คือ authoritative (ตรงกับ query จริงใน `jobs.service.ts`)
รายการข้างล่างเป็น guideline เชิงแนวคิด; query ปัจจุบัน **ไม่ได้ `orderBy('created_at')`** (sort ฝั่ง client)
จึงไม่ได้สร้าง composite index ที่มี `created_at` — เพิ่มเมื่อ query เปลี่ยนไป `orderBy` จริงเท่านั้น

```
jobs: (is_deleted, seller_uid)
jobs: (is_deleted, design_uid)
jobs: (is_deleted, print_uid)
jobs: (is_deleted, status, design_uid)         # graphic queue
jobs: (is_deleted, status, print_uid)          # production queue
```

### `job_events/{eventId}`

Audit log — เขียน **ทุก action** ที่เปลี่ยน state ของ job
ห้าม client เขียนตรง — ผ่าน Cloud Function เท่านั้น

| field | type | required | notes |
|---|---|---|---|
| `job_id` | string | ✓ | reference ไป jobs/{id} |
| `actor_uid` | string | ✓ | ผู้กระทำ |
| `actor_role` | role enum | ✓ | snapshot ตอนเกิด event |
| `action` | ActionEnum | ✓ | ดูข้างล่าง |
| `from_status` | StatusEnum \| null | — | เฉพาะ action = 'status_change' |
| `to_status` | StatusEnum \| null | — | เฉพาะ action = 'status_change' |
| `payload` | object | — | context (เช่น { design_uid_set: 'xxx' }) |
| `at` | Timestamp | ✓ | serverTimestamp |

```ts
type ActionEnum =
  | 'create'              // สร้างใบงานใหม่
  | 'edit'                // แก้ field non-state
  | 'claim_design'        // graphic claim จากคิวกลาง
  | 'assign_design'       // seller มอบหมายงานตัวเองให้กราฟิกโดยตรง (📨 ส่งให้กราฟิก) — status='รอออกแบบ' AND design_uid=null; admin ทุกงาน
  | 'transfer_design'     // graphic ส่งต่องานที่ตนถือให้กราฟิกคนอื่น (🔄 ส่งต่องาน) — status='กำลังออกแบบ' AND design_uid=self; status คงเดิม
  | 'claim_print'         // ทีมผลิต/กราฟิก(FUJI) claim ต่อ task
  | 'submit_design'       // graphic ส่งแบบ
  | 'confirm_design'      // seller คอนเฟิร์ม
  | 'request_revision'    // seller ขอแก้
  | 'start_print'         // graphic ส่งเข้าคิวผลิต (เขียนโดย sendToProduction — ชื่อ action เป็น legacy)
  | 'upload_print'        // อัปรูปงานพิมพ์
  | 'mark_delivered'      // ส่งมอบ
  | 'payment_record'      // F8 — บันทึกการจ่าย
  | 'payment_void'        // F8 — void payment (เช็คเด้ง/ปลอม/ยกเลิก)
  | 'refund_request'      // F8 — seller ขอคืนเงิน
  | 'refund_approve'      // F8 — finance/admin อนุมัติคืนเงิน
  | 'refund_reject'       // F8 — finance/admin ปฏิเสธคำขอคืนเงิน
  | 'rate_card_upsert'    // F7 — admin สร้าง/แก้ราคากลาง
  | 'material_upsert'     // F15 — admin เพิ่ม/แก้ materials master
  | 'edit_production'     // F15 — แก้บันทึกการพิมพ์ที่กรอกผิด (before/after + reason) — ทีมที่ดูแลเครื่องของ item นั้น (graphic=FUJI, production=non-FUJI) + admin; ผ่าน callable editProduction
  | 'defect_record'      // F15 — บันทึกงานเสีย (production/graphic/admin + seller เจ้าของงาน)
  | 'defect_void'        // F15 — admin ยกเลิกงานเสียที่บันทึกผิด
  | 'receipt_regenerate'  // F14 — สุ่ม receipt_code ใหม่ (ลิงก์ใบเสร็จเก่าหลุด)
  | 'stock_category_upsert' // F17 — เพิ่ม/แก้หมวดสต๊อก (สร้าง: stock/admin · แก้: admin)
  | 'stock_item_upsert'     // F17 — เพิ่ม/แก้รายการสต๊อก (สร้าง: stock/admin · แก้: admin)
  | 'stock_staff_upsert'    // F17 — เพิ่ม/แก้รายชื่อผู้รับของ (stock/admin)
  | 'stock_doc_create'      // F17 — สร้างเอกสาร receive/issue (stock/admin) · adjust/opening (admin)
  | 'stock_doc_void'        // F17 — void เอกสารสต๊อก (stock: ใบตัวเองวันเดียวกับที่คีย์ / admin: ทุกใบ)
  | 'payment_adjust'      // finance/admin แก้เงินหลังสร้าง (payload: before/after/reason)
  | 'comment_add'
  | 'comment_delete'
  | 'admin_reassign'      // admin เปลี่ยน design_uid / print_uid / seller_uid — **ไม่แตะ status**
  | 'admin_set_status'    // admin override สถานะใบงาน (escape hatch — reason บังคับ, from/to ลง audit); ผ่าน callable adminSetStatus
  | 'delete'              // admin soft-delete job
  | 'restore';            // admin restore
```

### `comments/{commentId}`

ไม่เปลี่ยนโครงมาก — แค่ migrate ให้ใช้ uid

| field | type | required |
|---|---|---|
| `job_id` | string | ✓ |
| `user_uid` | string | ✓ |
| `user_display_name` | string | ✓ | snapshot กันชื่อเปลี่ยน |
| `text` | string | ✓ |
| `likes` | number | ✓ | default 0 |
| `replies` | `Reply[]` | ✓ | embedded |
| `created_at` | Timestamp | ✓ |
| `is_deleted` | boolean | ✓ |
| `deleted_at` | Timestamp \| null | ✓ |

```ts
interface Reply {
  id: string;
  user_uid: string;
  user_display_name: string;
  text: string;
  created_at: Timestamp;
}
```

### `cash_sessions/{seller_uid}_{YYYYMMDD}` (F5)

กระทบยอดเงินสดรายวันต่อ seller. เขียนผ่าน Cloud Function เท่านั้น (`reconcileCashSession`/`closeCashSession`); อ่านได้เฉพาะ finance/admin. ดู docs/FINANCE-CONTROLS.md

| field | type | notes |
|---|---|---|
| `seller_uid` | string | |
| `date` | string | 'YYYYMMDD' (ICT) |
| `system_total` | number | Σ `payment.total` ของงานเงินสด (`payment_method='เงินสด'`) ที่ `status='ส่งมอบแล้ว'` + `date_of_completion` ในวันนั้น (ICT) — server คำนวณ |
| `job_count` | number | จำนวนงานเงินสดที่นับ |
| `declared_total` | number | ยอดที่ seller นับส่งจริง |
| `variance` | number | `declared_total − system_total` (≠ 0 = ธงแดง) |
| `status` | `'open' \| 'closed'` | closed = lock แก้ไม่ได้ |
| `note` | string | |
| `reconciled_by_uid` / `reconciled_at` | string / Timestamp | finance/admin ที่กระทบยอดล่าสุด |
| `closed_by_uid` / `closed_at` | string\|null / Timestamp\|null | |
| `created_at` / `updated_at` | Timestamp | |

Index: `cash_sessions (seller_uid, date desc)` + `jobs (is_deleted, seller_uid, status, payment.payment_method, date_of_completion)` สำหรับคำนวณ system_total

### `payments/{paymentId}` (F8 + F12)

หนึ่งการจ่ายจริง (เงินสด/สลิปโอน/เช็ค 1 รายการ) ผูกได้หลายใบงานผ่าน `allocations`. เขียนผ่าน Cloud Function เท่านั้น; อ่าน: finance/admin ทั้งหมด, seller เฉพาะที่ `seller_uids` มี uid ตัวเอง. ดู docs/F8-SLIP-PAYMENT-DESIGN.md + docs/F12-PAYMENT-LEDGER-DESIGN.md
**F12:** ทุกการจ่าย (มัดจำ+งวด+เงินสด+โอน/เช็ค) เป็น ledger record เดียวกัน · field `source: 'deposit' | 'payment'` (deposit = มัดจำที่ createJob post อัตโนมัติ). เงินสดไม่ต้องมี slip/bank_ref

| field | type | notes |
|---|---|---|
| `method` | `'โอน' \| 'เช็ค' \| ...` | เฟสนี้โฟกัส โอน/เช็ค (เงินสด via F5) |
| `amount` | number | ยอดเงินจริงในสลิป |
| `bank_ref` | string | เลขอ้างอิงโอน/เช็ค — ซ้ำ = soft flag (ไม่ block) |
| `slip_url` / `slip_hash` | string\|null | hash = sha256 จับภาพซ้ำ/ตัดต่อ |
| `paid_at` | Timestamp | |
| `allocations` | `{job_id, amount}[]` | จัดสรรลงแต่ละใบงาน; Σ ≤ amount |
| `allocated_total` | number | = Σ allocations.amount |
| `seller_uids` | string[] | denormalized — rules read-scope |
| `customer_name` | string | snapshot |
| `status` | `'active' \| 'voided'` | voided ไม่นับใน paid_amount |
| `voided_reason/by/at` | | เซ็ตเมื่อ void |
| `created/updated_*` · `is_deleted/deleted_at` | | |

### `refunds/{refundId}` (F8)

คืนเงิน — seller ขอ (`pending`) → finance/admin อนุมัติ (`approved`). อ่าน: finance/admin + seller เจ้าของงาน

| field | type | notes |
|---|---|---|
| `job_id` | string | |
| `amount` | number | ≤ job.paid_amount |
| `method` | `'เงินสด' \| 'โอน'` | ช่องทางคืน |
| `reason` | string | บังคับ |
| `status` | `'pending' \| 'approved' \| 'rejected'` | |
| `seller_uid` | string | rules read-scope |
| `requested_by_uid/at` · `approved_by_uid/at` | | แยกคนขอ/คนอนุมัติ |
| `created/updated_at` · `is_deleted/deleted_at` | | |

> `jobs` field `paid_amount: number` (default 0) = Σ allocations active − refunds approved
> **F12:** รวมมัดจำด้วย (มัดจำ = ledger entry `source:'deposit'`) → `paid_amount` = source of truth ของ "จ่ายแล้ว" ทุกวิธี; `payment.deposit` กลายเป็น snapshot (ไม่ใช้คำนวณ outstanding). `outstanding = (net_receivable+ค่าส่ง+ค่าธรรมเนียม) − paid_amount`
> Action enum เพิ่ม: `payment_record`, `payment_void`, `refund_request`, `refund_approve`, `refund_reject`

### `materials/{material_id}` (F15)

`material_id` = canonical (`vinyl__deruyzen` / `sticker__hp`). วัสดุ master สำหรับ dropdown ฝั่งคนพิมพ์ + คิดเศษ/ต้นทุน. เขียนผ่าน Cloud Function เท่านั้น (admin); อ่าน: staff ทุก role (ใช้ทำ dropdown). ดู docs/F15-PRODUCTION-MATERIAL.md

| field | type | notes |
|---|---|---|
| `category` | `'vinyl' \| 'sticker'` | จับคู่ type_code (F7) |
| `brand` | string | 'ดีรุยเซ่น'/'นก'/'BB'/'HP'/'JH'/'โปสเตอร์'/'ช้าง'/'กล่องไฟ'/'ซีทรู' |
| `label` | string | ป้ายแสดง |
| `roll_widths_m` | number[] | หน้ากว้างม้วนที่มี (F7 Q2b: ไวนิล 1.12/1.32/1.62/2.22/2.62/3.22 · สติกเกอร์ 1.27) |
| `cost_per_sqm` | number \| null | ต้นทุน/ตรม. — F15.1 margin; null = ยังไม่กรอก |
| `is_active` | boolean | inactive = ไม่โผล่ dropdown |
| `created_at / updated_at / updated_by_uid` | | serverTimestamp / admin |
| `is_deleted / deleted_at` | boolean / Timestamp\|null | soft delete |

> `config/finance` (F15): เพิ่ม `waste_soft_pct` (30) · `waste_hard_pct` (50) · `waste_audit_floor_sqm` (0.5)

### `defects/{defectId}` (F15 — งานเสีย)

บันทึกงานพิมพ์เสีย/ตัดเสีย — วัสดุถูกใช้แต่ไม่มีรายได้ = แหล่งรั่ว/เศษที่ audit ตรง. เขียนผ่าน Cloud Function เท่านั้น (`recordDefect` — **seller เจ้าของงาน** + production/graphic/admin; seller บันทึกได้เฉพาะใบงานของตัวเอง); อ่าน: finance/admin ทั้งหมด + ผู้บันทึกเฉพาะของตัวเอง (recorded_by_uid). ดู docs/F15-PRODUCTION-MATERIAL.md §6.1

| field | type | required | notes |
|---|---|---|---|
| `job_id` | string \| null | ✓ | ผูกใบงาน (null = เสียลอย ไม่ผูกงาน เช่น ทดสอบเครื่อง) |
| `serial_number` | string | ✓ | snapshot ('' ถ้าไม่ผูก) |
| `work_item_index` | number \| null | ✓ | รายการในใบงานที่เสีย (null = ทั้งงาน/ไม่ระบุ) |
| `reason` | `'เครื่องมีปัญหา' \| 'ตัดเสีย' \| 'สีเพี้ยน' \| 'วัสดุมีตำหนิ' \| 'ลูกค้าเปลี่ยนแบบ' \| 'อื่นๆ'` | ✓ | |
| `detail` | string | ✓ | รายละเอียดเพิ่ม — บังคับเมื่อ reason='อื่นๆ' |
| `material_id` | string | ✓ | ref materials/{id} |
| `material_label` | string | ✓ | snapshot |
| `roll_width_m` | number | ✓ | หน้ากว้างม้วน |
| `length_used_m` | number | ✓ | ความยาวที่เสีย |
| `qty_spoiled` | number | ✓ | จำนวนที่เสีย |
| `area_wasted_sqm` | number | ✓ | **SERVER** = roll_width_m × length_used_m |
| `recorded_by_uid` | string | ✓ | auto = ผู้บันทึก (server) |
| `recorded_by_name` | string | ✓ | snapshot display_name |
| `occurred_at` | Timestamp | ✓ | วันที่เกิดงานเสีย (default now) |
| `status` | `'active' \| 'voided'` | ✓ | voided = admin ยกเลิก (ไม่นับใน report) |
| `voided_reason/by/at` | | — | เซ็ตเมื่อ void |
| `created_at / updated_at` | Timestamp | ✓ | serverTimestamp |
| `is_deleted / deleted_at` | boolean / Timestamp\|null | ✓ | soft delete |

### `stock_*` (F17 — สต๊อกวัสดุอุปกรณ์ภายในร้าน)

ดู docs/F17-STOCK-DESIGN.md — หลักการ: **สต๊อก = ledger ของ movement (append-only)**;
เอกสารแก้ไม่ได้ มีแต่ void+สร้างใหม่; `on_hand` เป็น SERVER-COMPUTED ใน transaction เดียวกับเอกสาร
อ่าน: `stock`/finance/admin (rules `canReadStock`); role อื่นไม่เห็น; เขียนผ่าน CF เท่านั้น

**`stock_categories/{id}`** — id = slug(ชื่อ) — `name` · `sort_order` · `count_cadence: 'monthly'|'quarterly'`
(ตรายาง = quarterly) + timestamps/soft-delete

**`stock_items/{id}`** — `category_id` · `name` · `unit` (free text — ม้วน/แผ่น/รีม/แกลอน/...) ·
`on_hand` (**SERVER**) · `min_qty: number|null` (เตือนใกล้หมด) · `last_unit_price: number|null`
(อัปเดตจาก receive line ล่าสุดที่มีราคา) · `material_id: string|null` (เชื่อม F15 — อนาคตหักอัตโนมัติ) ·
`is_active` + timestamps/soft-delete. Import 386 รายการจาก Excel: `scripts/import-stock-master.ts`

**`stock_docs/{id}`** — ledger append-only. **กระดาษจริง = ใบรวมรายวัน** (ทั้งเบิกและรับ) →
ผู้รับของ/ผู้ขาย/บิล อยู่**ต่อบรรทัด** และ item ซ้ำในใบได้ (คนละคนเบิกของเดียวกัน — server รวม
delta ต่อ item ใน transaction):
`type: 'opening'|'receive'|'issue'|'adjust'` · `doc_date` (วันที่หน้ากระดาษ — role stock ย้อนหลังได้
≤7 วัน, admin ไม่จำกัด, ห้ามอนาคต) · `is_backdated` (**SERVER**) · `lines[]: {item_id,
item_name(snapshot), unit(snapshot), qty, unit_price|null, recipient_name|null (บังคับต่อบรรทัดเมื่อ
issue — ชื่อใหม่ auto-เพิ่มเข้า stock_staff), supplier|null, bill_no|null (optional ต่อบรรทัดเมื่อ receive)}`
· doc-level `supplier`/`bill_no`/`recipient_name` = null เสมอ (คงไว้เพื่อ compat) · issue: `job_serial?`
· adjust: `adjust_reason` (บังคับ) · `note` · `recorded_by_uid/name` · `status: 'active'|'voided'`
+ `voided_reason/by/at`. เบิกเกินคงเหลือ = failed-precondition (ledger ห้ามติดลบ — บังคับหา movement
ตกหล่นก่อน); void = ทั้งใบ (ย้อนทุกบรรทัด); void ที่ทำให้ติดลบ = ให้ใช้ adjust แทน

**`stock_staff/{id}`** — master รายชื่อผู้รับของ (พนักงานร้าน > app users): `name` · `is_active`

**`stock_counts/{id}`** (S2) — รอบนับจริง: `type: 'full'|'spot'` · `scope_category_ids[]` ·
`status: 'submitted'|'locked'|'discarded'` · `paper_confirmed` (บังคับ true — ยืนยันกระดาษลงครบก่อนนับ) ·
`lines[]: {item_id, item_name, unit, counted_qty, ledger_qty(snapshot ตอน submit), diff}` ·
`counted_by_uid/name` · `submitted_at` · `locked_by_uid/at` · `adjust_doc_id`. FE นับแบบ blind
(ไม่โชว์ยอด ledger ระหว่างนับ). lock (admin) = สร้างเอกสาร adjust อัตโนมัติ โดย delta คำนวณ**สด**
(counted − on_hand ปัจจุบัน — กัน drift ระหว่างรอ lock) แล้ว set on_hand = counted

Callables (F17): `createStockDoc` (stock/admin; adjust/opening = admin) · `voidStockDoc`
(stock: ใบตัวเอง+วันเดียวกับที่คีย์ / admin) · `upsertStockItem`/`upsertStockCategory`
(สร้าง: stock/admin · แก้: admin — กัน rename กลบร่องรอย) · `upsertStockStaff` (stock/admin) ·
**S2:** `submitStockCount` (stock/admin) · `lockStockCount` (admin) · `discardStockCount`
(admin/ผู้นับเอง) · `computeStockReport({period:'YYYYMM'})` (stock/finance/admin) — รายงานรายเดือน
ต่อรายการ ยกมา/รับ/ใช้/ส่วนต่างนับจริง/คงเหลือ/มูลค่า (invariant: ยกมา+รับ−ใช้±ปรับ=คงเหลือ;
closing derive จาก on_hand ปัจจุบัน rollback เอกสารหลังสิ้นเดือน; มูลค่า = last_unit_price ปัจจุบัน)
· หน้าปริ้น `/naikit-sticker/stock-print/:period` (print → PDF)

### Collections ที่ **เลิกใช้**

ลบทิ้งทั้งหมดจาก Firebase console ก่อนเริ่ม Phase 3:

- `groups` — กลุ่มสิทธิ์เดิม (แทนด้วย role ใน users)
- `sites` — สาขา (ไม่ใช้ใน workflow จริง — ลูกค้าหน้าร้านอย่างเดียว)
- `schedules` — leftover Krungthon-Air
- `slots` — leftover Krungthon-Air
- `broadcasts` — leftover Krungthon-Air
- `services` — leftover Krungthon-Air

## RBAC Matrix

`request.auth.token.role` = role ของ user ที่ login

### Read

> **finance** (F3): อ่านได้ทั้งหมดเหมือน admin ทุกแถวข้างล่าง (jobs/job_events/comments/users) — เพื่อตรวจเงิน/กระทบยอด แต่ write ไม่ได้ (mutations ผ่าน Cloud Functions เท่านั้น)

| Action | seller | graphic | production | admin |
|---|---|---|---|---|
| `users/{uid}` | self only | self only | self only | ทั้งหมด |
| `jobs/{id}` ที่ `seller_uid == self.uid` | ✓ | — | — | ✓ |
| `jobs/{id}` ที่ `design_uid == self.uid` | — | ✓ | — | ✓ |
| `jobs/{id}` ที่ `print_uid == self.uid` | — | — | ✓ | ✓ |
| `jobs/{id}` ที่ `status in ['รอออกแบบ']` (คิวกลางออกแบบ) | — | ✓ | — | ✓ |
| `jobs/{id}` ที่ `status in ['คอนเฟิร์มแล้ว', 'รอผลิต']` (คิวกลางผลิต) | — | — | ✓ | ✓ |
| `job_events` ของ job ที่ตัวเองอ่านได้ | ✓ | ✓ | ✓ | ✓ |
| `comments` ของ job ที่ตัวเองอ่านได้ | ✓ | ✓ | ✓ | ✓ |

### Write — แต่ละ action ผ่าน Cloud Function (เพื่อ atomic update jobs + job_events + verify transition)

| Action | seller | graphic | production | admin | Transition |
|---|---|---|---|---|---|
| `create_job` | ✓ → `seller_uid=self` | — | — | ✓ (เลือก seller_uid ใดก็ได้) | — → `'รอออกแบบ'` |
| `edit_job` (non-state field, **ไม่รวม payment**) | ✓ ถ้า `seller_uid=self` AND `status in [รอออกแบบ, กำลังออกแบบ, รอคอนเฟิร์มแบบ]` | — | — | ✓ ทุก status | — (ถ้าแก้ `work_items` → total/remaining recompute อัตโนมัติ) |
| `claim_design` | — | ✓ ถ้า `status='รอออกแบบ'` AND `design_uid=null` | — | ✓ | `รอออกแบบ` → `กำลังออกแบบ` |
| `assign_design` | ✓ ถ้า `seller_uid=self` AND `status='รอออกแบบ'` AND `design_uid=null` | — | — | ✓ ทุกงาน | `รอออกแบบ` → `กำลังออกแบบ` (มอบหมายกราฟิกที่เลือกโดยตรง — ปุ่ม 📨 ส่งให้กราฟิก) |
| `transfer_design` | — | ✓ ถ้า `design_uid=self` AND `status='กำลังออกแบบ'` | — | ✓ | — (status คงเดิม; เปลี่ยนแค่ design_uid — ปุ่ม 🔄 ส่งต่องาน) |
| `submit_design` | — | ✓ ถ้า `design_uid=self` AND `status='กำลังออกแบบ'` | — | ✓ | `กำลังออกแบบ` → `รอคอนเฟิร์มแบบ` |
| `confirm_design` | ✓ ถ้า `seller_uid=self` AND `status='รอคอนเฟิร์มแบบ'` | — | — | ✓ | `รอคอนเฟิร์มแบบ` → `คอนเฟิร์มแล้ว` |
| `request_revision` | ✓ ถ้า `seller_uid=self` AND `status='รอคอนเฟิร์มแบบ'` | — | — | ✓ | `รอคอนเฟิร์มแบบ` → `กำลังออกแบบ` |
| `send_to_production` | — | ✓ ถ้า `design_uid=self` AND `status='คอนเฟิร์มแล้ว'` | — | ✓ | `คอนเฟิร์มแล้ว` → `รอผลิต` |
| `claim_print` (F13 ต่อ task) | — | ✓ ถ้า task `eligible` มี `fuji` (งาน FUJI) | ✓ ถ้า task `eligible` มี non-FUJI | ✓ | task `รอผลิต` → `กำลังผลิต`; job = derived (`deriveProductionStatus`). payload `machine` **บังคับ**เมื่อ role มีเครื่องให้เลือก >1 ใน eligible (เช่น `large_sticker`/`uv` — สติ๊กเกอร์ใหญ่ D2 vs สติกเกอร์ UV) |
| `upload_print` (F13 ต่อ task) | — | ✓ ตรงเครื่อง (FUJI) | ✓ ตรงเครื่อง (non-FUJI) | ✓ | **คนแนบ ≠ คนผลิตได้** (แค่อยู่ทีมที่ทำเครื่องนั้น). ทุก task เสร็จ → job `รอส่งมอบ`. **F15:** รับ payload `production[]` (วัสดุ/ม้วน/ความยาว/จำนวน) → server คำนวณ `area_used/billed/waste_pct` + set `printed_by_uid`. ดู docs/F15-PRODUCTION-MATERIAL.md |
| `edit_production` (F15) | — | ✓ item เครื่อง FUJI | ✓ item เครื่อง non-FUJI | ✓ ทุก item | — (ไม่เปลี่ยน status). แก้ได้เฉพาะ item ที่**มี** `production` แล้ว (สร้างครั้งแรกผ่าน `upload_print` เท่านั้น); ผ่าน callable `editProduction({job_id, production[], reason})` — `reason` บังคับ; server คำนวณ area/waste ใหม่ แต่**คง** `printed_by_uid`/`printed_at` เดิม; event `edit_production` เก็บ before/after ต่อ item |
| `mark_delivered` | ✓ ถ้า `seller_uid=self` AND `status='รอส่งมอบ'` | — | — | ✓ | `รอส่งมอบ` → `ส่งมอบแล้ว`. **F9 (แทนที่ F4 เดิม):** ไม่ hard-gate การจ่ายแล้ว — ส่งมอบแบบค้างชำระได้ (เครดิต/ลูกหนี้/AR); settlement ปิดเมื่อ `paid_amount ≥ net_receivable`. `delivery_slips` = optional (แนบถ้ามี). ดู docs/F9-TAX-PAYMENT-DESIGN.md |
| `adjust_payment` (F2) | — | — | — | ✓ ทุก status | **finance** ด้วย (role ที่ 5 — ดู F3). แก้ discount/deposit/method/date + บังคับ `reason` → event `payment_adjust` before/after. total ยังคิดจาก work_items |
| `admin_reassign` | — | — | — | ✓ ทุก status | (เปลี่ยน design_uid / print_uid / seller_uid — **ไม่แตะ status**; เปลี่ยนสถานะใช้ `admin_set_status`) |
| `admin_set_status` | — | — | — | ✓ ทุก status | override สถานะเป็นค่าใดก็ได้ใน StatusEnum (escape hatch — เช่น ย้อน `คอนเฟิร์มแล้ว` → `กำลังออกแบบ` เมื่อลูกค้าเปลี่ยนใจ) ผ่าน callable `adminSetStatus({job_id, status, reason})` — `reason` บังคับ; **ไม่ auto-แก้ field ปลายทาง** (print_tasks จะถูก reset ใหม่ตอน send_to_production รอบถัดไป; date_of_completion เซ็ตเมื่อ set เป็น `ส่งมอบแล้ว`) |
| `delete_job` (soft) | — | — | — | ✓ | (set `is_deleted=true`) |
| `restore_job` | — | — | — | ✓ | (set `is_deleted=false`) |
| `add_comment` | ✓ readable | ✓ readable | ✓ readable | ✓ | — |
| `delete_comment` | ✓ own | ✓ own | ✓ own | ✓ ทุก comment | — |

### Admin-only ผ่าน Callable Functions

| Function | Args | Effect |
|---|---|---|
| `createUser` | `{username, password, role, display_name}` | สร้าง Firebase Auth user + set custom claim + Firestore users doc (best-effort atomic — rollback Auth ถ้าขั้นใดล้ม) |
| `setUserRole` | `{uid, role}` | เปลี่ยน custom claim + Firestore `role` + revoke refresh tokens (บังคับ relogin); แอดมินกดเปลี่ยน role ตัวเองออกจาก admin ไม่ได้ |
| `setUserActive` | `{uid, active: boolean}` | toggle `is_active` + Firebase Auth `disabled` + revoke tokens เมื่อ deactivate; แอดมินปิดบัญชีตัวเองไม่ได้ |
| `resetPassword` | `{uid, password}` | ตั้ง password ใหม่ + revoke tokens ทุก device |
| `upsertMaterial` (F15) | `{material_id?, category, brand, label, roll_widths_m, cost_per_sqm?, is_active}` | เพิ่ม/แก้ materials master (admin) → event `material_upsert` |
| `listMaterials` (F15) | `{}` | list materials (staff ทุก role — ใช้ทำ dropdown ฟอร์มพิมพ์) |
| `upsertRateCard` / `listRateCards` (F7) | ดู docs/F7-RATE-CARD-DESIGN.md | ราคากลาง (admin write / staff read) → event `rate_card_upsert` |
| `adminSetStatus` | `{job_id, status, reason}` | override สถานะใบงานข้าม state machine (escape hatch) — reason บังคับ → event `admin_set_status` (from/to/reason) |

### Callable Functions อื่นๆ (ไม่ใช่ admin-only — สรุปรวม; รายละเอียดดู design doc ของแต่ละ F)

| Function | ใคร | Effect |
|---|---|---|
| `updateMyProfile` | ทุก role (ตัวเอง) | แก้ display_name/avatar + **เปลี่ยนรหัสผ่านตัวเอง** (ต้องส่งรหัสปัจจุบัน) |
| `listGraphics` | seller/admin | รายชื่อกราฟิก active สำหรับ picker มอบหมาย/ส่งต่องาน |
| `editProduction` (F15) | production/graphic/admin | แก้บันทึกการพิมพ์ — ดู row ใน write matrix |
| `createPayment/voidPayment/deletePayment/editPayment` (F8/F12) | ดู docs/F8+F12 | payments ledger |
| `requestRefund/approveRefund/rejectRefund` (F8) | seller ขอ / finance+admin ตัดสิน | คืนเงิน |
| `reconcileCashSession/closeCashSession` (F5) | finance/admin | กระทบยอดเงินสดรายวัน |
| `recordDefect/voidDefect` (F15) | ดู §defects | งานเสีย |
| `computeWasteSummary` (F15) / `computeMaterialSummary`+`saveMaterialReconcile` | finance/admin | waste dashboard / กระทบยอดวัสดุ |
| `regenerateReceiptCode` (F14) | seller เจ้าของงาน/admin | สุ่มโค้ดใบเสร็จใหม่ → event `receipt_regenerate` |
| `getReceipt` (F14) | public (no-auth) | อ่านใบเสร็จผ่าน QR code |

## Status state machine (visual)

```
                    ┌── claim_design (graphic) ──→ กำลังออกแบบ
รอออกแบบ ───────────┤
                    └── assign_design (seller/admin)

                              ↓ submit_design

                         รอคอนเฟิร์มแบบ
                          ↓               ↓
            request_revision       confirm_design
                          ↓               ↓
                  กำลังออกแบบ        คอนเฟิร์มแล้ว
                                          ↓
                                  send_to_production
                                          ↓
                    ┌── claim_print ──→ กำลังผลิต
              รอผลิต ┤                       ↓
                    └── (admin claim ได้)  upload_print
                                          ↓
                                       รอส่งมอบ
                                          ↓
                                    mark_delivered
                                          ↓
                                      ส่งมอบแล้ว  (terminal)
```

ห้าม transition อื่นนอกจาก table ข้างบน — Cloud Function ปฏิเสธทุกคำขอที่ไม่ตรง
**ยกเว้น** `admin_set_status` (admin เท่านั้น + reason บังคับ) = escape hatch ข้าม state machine ได้ทุกทิศ — ใช้เมื่อ workflow ปกติพาไปไม่ถึง (เช่น คอนเฟิร์มผิด)

## Storage paths

มี 2 รูปแบบ path จริง (ดู `storage.rules` ที่บังคับ + เป็น source of truth ฝั่ง Storage):

```
# Create flow — create-work-sheet.component.ts
# bucket = per-submission UUID (serial ยัง gen ฝั่ง server ตอนยังอัปไฟล์ จึงใช้ UUID แทน)
images/{year}/{month}/{bucket-uuid}/worksheet/{uuid}-{name}.{ext}
images/{year}/{month}/{bucket-uuid}/reference/{uuid}-{name}.{ext}

# Design/print/slip artwork — jobs.service.ts uploadImages() (submitDesign / uploadPrint / markDelivered)
jobs/{jobId}/design/{uuid}.{ext}
jobs/{jobId}/print/{uuid}.{ext}
jobs/{jobId}/slip/{uuid}.{ext}        # F4/F8 delivery slips
```

Rules (`storage.rules`):
- Read: signed-in staff ทุกคน (อ่าน object ได้ถ้า login)
- Write: client อัปตรงด้วย `uploadBytes` (authenticated) — rules บังคับ signed-in + content-type
  (image/* | application/pdf) + size cap (images 20MB / jobs 50MB) + `{kind}` whitelist;
  จากนั้นส่ง download URL ให้ Cloud Function บันทึกลง job. **ไม่ได้อัปผ่าน Function**

## Auth flow

1. ฟอร์ม login ฝั่ง FE: `username` + `password`
2. FE map: `email = ${username}@naikit.local`
3. `signInWithEmailAndPassword(auth, email, password)`
4. ดึง `idTokenResult` → อ่าน `claims.role`
5. ถ้า `role` ไม่มี → throw (user ที่ไม่ได้ตั้ง role ผ่าน `createUser` จะใช้งานไม่ได้ — fail-safe)
6. AppStateService เก็บ `{ uid, username, display_name, role, is_active }` ใน BehaviorSubject
7. RoleGuard ตัดสินใจตาม `role`; ถ้า `is_active=false` → ออกจากระบบทันที

## Seed admin คนแรก

ก่อนใช้งานครั้งแรก รัน script `Naikit-Sticker-BE/scripts/seed-admin.ts` ครั้งเดียว:

```
ENV: GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
ARGS: --username admin --password <strong> --display-name "ผู้ดูแลระบบ"
EFFECT: สร้าง Firebase Auth user + set custom claim role=admin + Firestore users doc
```

หลังจากนั้น admin login ผ่าน UI ปกติแล้วใช้ Settings > Users สร้างพนักงานคนอื่น

## เปลี่ยน schema นี้ทำยังไง

1. แก้ `SCHEMA.md` ก่อน
2. อัปเดต `firestore.rules` + `firestore.indexes.json` ให้ตรง
3. แก้ FE service / type / page ที่อ้างถึง
4. แก้ BE Cloud Function ที่อ้างถึง
5. ถ้าเป็น breaking change ของ field → เพิ่ม migration script + รัน in-place

ห้าม diverge ระหว่าง FE และ BE — เอกสารนี้คือสัญญา
