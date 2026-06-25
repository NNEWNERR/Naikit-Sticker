---
version: design v1 (ยังไม่ implement — รอ review + lock §14)
project: naikit-sticker
status: DRAFT — decisions หลักเคาะแล้ว (QR ออกทุกงาน), เหลือ confirm รายละเอียด §14
related: F8-SLIP-PAYMENT-DESIGN.md (§16 ข้อจำกัด control นอกระบบ), FINANCE-CONTROLS.md, SCHEMA.md
audience: ทั้ง FE (Naikit-Sticker) + BE (Naikit-Sticker-BE)
---

# F14 — ใบเสร็จ QR + Reconcile วัสดุ (ปิด off-book / ghost jobs)

ส่วนต่อจาก F1–F13 ที่อยู่ "นอกระบบ" — ปิด vector ที่ซอฟต์แวร์การเงินจับไม่ได้ตาม
F8 §16: **งานที่ไม่เคยถูกบันทึก (off-book/ghost)**

## 1. ปัญหา & เป้าหมาย

**ช่องโหว่ที่ F1–F13 ปิดไม่ได้:** F1–F13 ตรวจได้เฉพาะ "สิ่งที่ถูกบันทึกในระบบ"
seller ที่รับงาน ทำงาน เก็บเงินสด **โดยไม่สร้างใบงานเลย** = ระบบมองไม่เห็น 100%
(วัสดุถูกใช้จริง เงินเข้ากระเป๋า ไม่มี trace ใดๆ)

**เป้าหมาย (เน้นยืดหยุ่น — ไม่ hard-gate workflow ใดๆ):**
1. ทำให้ "งานนอกระบบ" มีต้นทุน/แรงเสียดทาน → สร้าง **พยานภายนอก** (ลูกค้า) ที่ผูกกับ
   ระบบทุกงาน ผ่านใบเสร็จ QR ที่ resolve ได้เฉพาะงานที่มีจริงในระบบ
2. ให้ **สัญญาณเชิงแนวโน้ม** ว่าวัสดุที่ใช้จริง ≈ งานในระบบไหม (advisory ล้วน)
3. ทั้งหมด **optional ต่อการทำงานจริง** — ไม่ใช้ก็ไม่มีอะไรพัง

> หลักการ (F8 §16): ซอฟต์แวร์ทำให้ "การโกงที่บันทึกไว้" ตรวจเจอยาก; "การไม่บันทึก"
> ปิดด้วย **กระบวนการ** (พยานลูกค้า + แนวโน้มวัสดุ) ไม่ใช่กฎ DB

## 2. Non-goals
- **ไม่ทำ inventory เข้มงวด** — สต๊อกร้านไม่แม่นยำ (ม้วนคร่อมเดือน, เศษ, งานเสีย) →
  material reconcile เป็น **advisory เชิงแนวโน้ม** ไม่ใช่ตัวเลขผูกมัด ไม่ block อะไร
- ไม่บังคับให้ทุกงานต้องออกใบเสร็จให้ลูกค้า (ระบบ "ออก code ทุกงาน" แต่การยื่นให้ลูกค้า
  = นโยบายร้าน ไม่ enforce ในโค้ด)
- ไม่ทำ payment portal (ลูกค้ากดจ่ายผ่าน QR) ในเฟสนี้ — เป็น future phase [D3]
- ไม่ verify ตัวตนลูกค้า / login ลูกค้า — receipt เป็น public read ผ่าน code ลับ

## 3. สถานะปัจจุบัน (ของจริงในโค้ด)
- `jobs/{id}` มี `serial_number` (NK-YYMM-NNN), `work_items[]` (มี width/height/
  unit_of_length/quantity/total), `payment.total`/`paid_amount`, `tax.grand_total`/
  `net_receivable`, `customer_name`, `status`, `machines[]` — ครบพอทำ receipt + derive
  พื้นที่วัสดุได้ **โดยไม่ต้องเก็บข้อมูลใหม่**
- ทุก mutation ผ่าน Cloud Function (firestore.rules `write:false`); read role-scoped
  (`canReadAll()` = admin/finance; seller = งานตัวเอง)
- **ยังไม่มี endpoint สาธารณะ (public/unauth) เลย** — F14 `getReceipt` จะเป็นตัวแรก →
  ต้องออกแบบ projection ให้ปลอดภัยเป็นพิเศษ (ดู §6)
- มี `lib/pricing.ts:toMeters()` แปลงหน่วย→เมตร + `lib/machines.ts` map type→เครื่อง/
  วัสดุ อยู่แล้ว → reuse สำหรับ derive พื้นที่ต่อวัสดุ (§9)

---

# ชั้น A — ใบเสร็จ QR (พยานภายนอก) ★ หลัก

## 4. แนวคิด
ทุกใบงานมี `receipt_code` (สุ่มเดายาก) → QR/ลิงก์สั้น `/r/<code>` ที่ลูกค้าสแกนแล้วเห็น
หน้า **read-only**: ชื่อร้าน + เลขใบงาน + รายการ + ยอด + สถานะ
→ **งานนอกระบบออก QR ที่ resolve ในระบบไม่ได้** → เจ้าของ spot-check เจอทันที +
ลูกค้าอยากได้ใบเสร็จไว้เคลม/สั่งซ้ำ = บังคับให้งานเข้าระบบโดยธรรมชาติ

**[D1] ออก code ทุกงาน** — `createJob` ทุกใบ generate `receipt_code` (ไม่มีเงื่อนไข)

## 5. Schema

### `jobs/{id}` เพิ่ม field เดียว
| field | type | notes |
|---|---|---|
| `receipt_code` | string | สุ่ม unguessable (≥ 20 char, base58/nanoid). set ตอน `createJob`; immutable ปกติ (regenerate เฉพาะกรณีหลุด — §13) |

> ไม่มี collection ใหม่สำหรับชั้น A — receipt เสิร์ฟจาก job doc ผ่าน callable (admin SDK)

### Receipt projection (สิ่งที่ public เห็น — whitelist เท่านั้น)
```
{
  shop_name: "Naikit Sticker",          // คงที่
  serial_number,                         // เลขใบงาน
  date: date_of_acceptance,              // วันรับงาน
  customer_name,                         // ของลูกค้าเอง (ผู้ถือลิงก์)
  items: work_items.map(→ {              // ไม่รวม unit_price ภายในถ้าไม่ต้องการ
    label: "<type> <option> <WxH unit>",
    quantity, amount: total
  }),
  subtotal: payment.total,
  discount: payment.discount,
  shipping_fee, other_fee,
  vat_amount, grand_total,               // จาก tax (ยอดออกบิล)
  amount_due: grand_total + shipping_fee + transfer_fee,  // ยอดที่ต้องจ่าย
  paid_amount,
  outstanding: amount_due − paid_amount,
  payment_status: 'ชำระครบ' | 'ค้างชำระ' | 'รอชำระ',
  job_status: status,                    // กำลังทำ/เสร็จ/ส่งมอบแล้ว
  issued_by_system: true
}
```

### ❌ ห้ามหลุดเด็ดขาด (ไม่อยู่ใน projection)
- ต้นทุน / `price_audits` / variance ราคากลาง (F7) — ความลับร้าน
- `seller_uid` / ชื่อพนักงาน / uid ใดๆ
- งานอื่น / ลูกค้าอื่น — code ผูก job เดียว
- เบอร์โทร/ไลน์ลูกค้า (ลด PII; ชื่ออย่างเดียวพอ) — *[D5] confirm*
- internal note / `remark`

## 6. `getReceipt` — public callable + ความปลอดภัย
**Naikit endpoint สาธารณะตัวแรก** → ออกแบบแบบ paranoid:
- `getReceipt(code)` = onCall **ไม่ requireCaller** (อนุญาต unauth) คืนเฉพาะ projection §5
- lookup ด้วย `where('receipt_code','==',code).limit(1)` ผ่าน **admin SDK** (ข้าม rules) →
  ไม่ต้องเปิด firestore.rules ให้ public อ่าน job (job read ยัง role-scoped เหมือนเดิม)
- **code สุ่มยาว** (≥ 20 char ≈ 100+ bit) → brute-force/enumerate แทบเป็นไปไม่ได้
- งาน `is_deleted=true` → คืน 404 (ไม่โชว์งานที่ลบ)
- **soft rate-limit**: cache/นับ hit ต่อ IP (best-effort) กัน scraping; เกิน → 429
- ไม่ echo code กลับใน error; log การเข้าถึงเชิงรวม (ไม่เก็บ PII)

> ทางเลือก onRequest (ให้ QR ลิงก์ตรง GET `/r/<code>` ได้โดยไม่ผ่าน SDK callable
> protocol) — เลือกตอน build; แนะนำ onRequest + render หน้า หรือ onCall + FE route
> public ที่เรียก callable. *[D4]*

## 7. FE — หน้า public + QR
- route public `/r/:code` (no-auth, นอก authGuard) → เรียก `getReceipt` → render การ์ดใบเสร็จ
  (mobile-first, ปริ้นได้, ปุ่ม "บันทึกรูป")
- ในใบงาน (worksheet-info): ปุ่ม **"🧾 ใบเสร็จ/QR"** → modal โชว์ QR (gen ฝั่ง client จาก URL)
  + ปุ่มแชร์ลิงก์ผ่าน LINE + ปุ่มปริ้น A6
- QR generate ฝั่ง client (lib เล็ก เช่น `qrcode`) — ไม่เก็บรูป QR ใน storage

## 8. ขั้นตอนใช้งานจริง (ชั้น A)
1. seller สร้างใบงาน → ระบบออกเลข + `receipt_code` + QR อัตโนมัติ (ทุกงาน)
2. ยื่น/ส่ง QR ให้ลูกค้า — ตอนมัดจำ หรือ ตอนส่งมอบ (นโยบายร้าน)
3. ลูกค้าสแกน → เห็นยอด + สถานะ (= ทวนความถูกต้อง กันกรอกเลขมั่วไปในตัว)
4. **เจ้าของ spot-check (กระบวนการ):** สุ่มถามลูกค้า "ได้ใบเสร็จไหม / สแกนแล้วตรงไหม" +
   ถ้าตั้งนโยบาย "ทุกงานต้องยื่น QR" → งานที่ไม่เคยมีคนเปิด receipt = น่าตรวจ
   (อาจเพิ่ม metric `receipt_first_viewed_at` ในอนาคตเพื่อดู "ออกแล้วลูกค้าเปิดไหม")

---

# ชั้น B — Reconcile วัสดุ (advisory, optional) ☆ รอง

## 9. แนวคิด + Schema (หลวมโดยตั้งใจ)
**ไม่ทำ inventory** — derive จากข้อมูลที่มีแล้ว + กรอกคร่าวรายเดือน:
- ระบบรวม **พื้นที่/หน่วยที่ผลิตจริง** จาก `work_items` (width×height ผ่าน `toMeters`)
  ของงานที่ `status='ส่งมอบแล้ว'` (หรือเลย sendToProduction) ใน period → group ตามวัสดุ
  (map `work_item.type` → วัสดุ ผ่าน `lib/machines.ts`): ไวนิล / สติกเกอร์ / สติกเกอร์ตัด /
  ตรายาง(ต่อดวง) / อื่นๆ
- finance กรอกคร่าวๆ ครั้งเดียว/เดือน: "ใช้ไวนิลไป ~N ม้วน, หมึก ~N…" → ระบบแปลง
  ม้วน→พื้นที่โดยประมาณ (หน้ากว้าง×ความยาวมาตรฐานม้วน) เทียบ
- **ส่วนต่างเกิน threshold = ธงเตือน advisory** ("งานในระบบใช้ ~50 ตร.ม. แต่เบิกวัสดุ ~150
  ตร.ม. → อาจมีงานนอกระบบ") ไม่ใช่คำตัดสิน

### `material_reconciles/{YYYYMM}` (1 doc/เดือน)
| field | type | notes |
|---|---|---|
| `period` | string | 'YYYYMM' (ICT) |
| `lines` | array | ต่อวัสดุ (ดูล่าง) |
| `note` | string | |
| `status` | `'open' \| 'reviewed'` | |
| `created_by_uid`/`reviewed_by_uid`/timestamps | | finance/admin |

`lines[]`:
| field | notes |
|---|---|
| `material` | 'vinyl' \| 'sticker' \| 'cut_sticker' \| 'stamp' \| 'other' |
| `unit` | 'sqm' \| 'unit' |
| `system_qty` | derived — พื้นที่/จำนวนจากใบงาน (อ่านได้ ไม่เก็บก็ได้ แต่ snapshot ไว้ตรวจย้อน) |
| `counted_input` | กรอกมือ: จำนวนม้วน/หน่วยที่ใช้จริง (คร่าว) |
| `assumed_per_unit` | สมมติฐานแปลง (เช่น 1 ม้วน ≈ 1.2ม.×50ม. = 60 ตร.ม.) — config |
| `implied_qty` | counted_input × assumed_per_unit |
| `variance` / `variance_pct` | implied − system (advisory) |

> ทุกค่าแปลง = **สมมติฐาน** ตั้งใน `config/finance` (mirror F7) — variance สูง ≠ ผิดเสมอ;
> ดู **แนวโน้มหลายเดือน** ไม่ใช่เดือนเดียว (noise สูง)

## 10. ขั้นตอน (ชั้น B — รายเดือน, ข้ามได้)
1. สิ้นเดือน finance เปิดหน้า "Reconcile วัสดุ" → ระบบ derive system_qty ให้
2. กรอกจำนวนวัสดุที่ใช้จริงคร่าวๆ
3. ระบบคำนวณ variance% → ธงถ้าเกิน threshold
4. ดูแนวโน้ม → variance พุ่งผิดปกติติดต่อกัน = สัญญาณให้เจ้าของไปดูใกล้ๆ
   (ไม่ชี้ใบไหน — แค่ "เดือนนี้น่าสงสัย")

> **ยืดหยุ่น:** ถ้าภาระเกินประโยชน์ ตัดชั้น B ทิ้งได้ — ชั้น A คุ้มกว่ามาก ทำ A ก่อน
> แล้วค่อยประเมินว่าจะทำ B ไหม

---

## 11. RBAC
| action | seller | finance | admin | public |
|---|---|---|---|---|
| getReceipt (อ่าน projection) | — | — | — | ✓ (มี code) |
| ปุ่มสร้าง QR ในใบงาน | ✓ งานตัวเอง | ✓ | ✓ | — |
| regenerateReceiptCode | ✓ งานตัวเอง | — | ✓ | — |
| material reconcile (อ่าน/กรอก) | — | ✓ | ✓ | — |

## 12. firestore.rules + indexes
- **ชั้น A:** ไม่แก้ rules — receipt เสิร์ฟผ่าน callable (admin SDK), `receipt_code` อยู่บน
  job doc ที่ readable ตาม role เดิม (seller เห็น code งานตัวเองเพื่อโชว์ QR). public
  **ไม่** อ่าน job ตรง
  - index: `jobs (receipt_code)` single-field (lookup ใน getReceipt) — Firestore auto
- **ชั้น B:** `match /material_reconciles/{period}`: `read: canReadAll()`; `write:false`
  (ผ่าน CF). ไม่ต้อง composite index (query equality/period ล้วน)

## 13. Cloud Functions (ใหม่)
- `getReceipt(code)` — **public** (no requireCaller) → projection §5 + rate-limit + 404 ลบ/ไม่เจอ
- `regenerateReceiptCode({ job_id })` — seller(เจ้าของ)/admin → สุ่ม code ใหม่ (กรณีลิงก์หลุด/
  ส่งผิดคน) + event `receipt_regenerate` (ลิงก์เก่าใช้ไม่ได้ทันที)
- `createJob` (แก้): generate `receipt_code` ตอนสร้าง
- **ชั้น B:** `computeMaterialSummary({ period })` (finance/admin, read-only derive — ไม่เขียน)
  + `saveMaterialReconcile({ period, lines, note })` (finance/admin → เขียน doc + variance)
- ⚠️ `createJob` เปลี่ยน = ต้อง redeploy (เป็น money-path function) — deploy ทีละตัว กัน
  gen2 quota (ดู deploy gotcha ใน memory)

## 14. Decisions
1. **[D1] ออก `receipt_code` ทุกงาน** — ✅ เคาะแล้ว (นิว 2026-06-25)
2. **[D2] เฟส 1 = read-only receipt** (ดูใบเสร็จ/สถานะ) — payment-via-QR แยกเฟส
3. **[D3] payment portal (ลูกค้ากดจ่าย/ยืนยันผ่าน QR)** = future F14b (optional) — แรงกว่ามาก
   เพราะลูกค้ายืนยันยอดเอง แต่ใหญ่กว่า + ต้องคิด anti-abuse → ไว้เฟสหลัง
4. **[D4] รูปแบบ endpoint** — onRequest (`/r/<code>` GET) vs onCall + FE public route. *รอเคาะ*
5. **[D5] เบอร์โทรใน receipt** — ไม่โชว์ (ลด PII) เป็น default. *confirm*
6. **[D6] ชั้น B วัสดุ** — ทำหลังชั้น A live + ประเมินภาระจริงก่อน (อาจข้าม). *รอเคาะ*
7. **[D7] backfill** — งานเก่าที่อยากออก QR ย้อนหลังต้องมี `receipt_code` → script backfill
   (สุ่ม code ให้ทุก job ที่ยังไม่มี, idempotent)

## 15. Phased rollout
| งวด | scope |
|---|---|
| F14.1 | BE: `receipt_code` ใน createJob + `getReceipt` public callable + projection + rate-limit |
| F14.2 | FE: route public `/r/:code` + การ์ดใบเสร็จ + ปุ่ม QR/แชร์/ปริ้นในใบงาน |
| F14.3 | backfill `receipt_code` งานเก่า (script, idempotent) + regenerateReceiptCode |
| F14.4 | (optional) ชั้น B: computeMaterialSummary + saveMaterialReconcile + หน้า reconcile ใน Finance Dashboard |
| F14b | (future) payment-via-QR portal [D3] |

## 16. ข้อจำกัด (ซอฟต์แวร์ยังจบไม่หมด)
- ชั้น A กัน off-book **ก็ต่อเมื่อร้านยื่น QR ให้ลูกค้าจริง** — เป็นวินัยกระบวนการ ไม่ใช่โค้ด
  enforce ได้ (ถ้า seller ไม่ยื่น ลูกค้าไม่รู้ว่าควรได้) → เสริมด้วยนโยบาย + spot-check
- ชั้น B noise สูงจากสต๊อกไม่แม่น → ใช้เป็นแนวโน้ม ไม่ใช่หลักฐานรายใบ
- ยังไม่ปิด **สมรู้ร่วมคิด** (seller+เจ้าของ) — นอกขอบเขตซอฟต์แวร์ (F8 §16)
- โอนปลอม/ref แต่งใหม่ = ปิดด้วย bank reconcile (F8.7) ไม่ใช่ F14

## 17. สรุป
F14 ปิด gap off-book ที่ F1–F13 แตะไม่ได้ ด้วย **2 ชั้นกระบวนการ** ที่ยืดหยุ่น/ไม่ hard-gate:
**ชั้น A (หลัก)** ใบเสร็จ QR ทุกงาน = ดึงลูกค้าเป็นพยานผูกกับระบบ (งานนอกระบบออก QR ที่
resolve ไม่ได้) — reuse data เดิม ภาระต่ำ; **ชั้น B (รอง, optional)** reconcile วัสดุเชิงแนวโน้ม
แบบหลวม (สต๊อกไม่แม่น = advisory ไม่ block). แนะนำทำ A ก่อนให้ครบ แล้วค่อยประเมิน B.
เฟสนี้ read-only; payment-via-QR (ลูกค้ายืนยันยอดเอง) = future F14b
