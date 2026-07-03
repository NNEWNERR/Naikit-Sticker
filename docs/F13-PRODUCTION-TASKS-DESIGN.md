---
version: design v1 (locked 2026-06-23)
project: naikit-sticker
status: implementing
related: F-machine (machines denorm + canProduce), SCHEMA.md (jobs status machine)
---

# F13 — Production sub-task ต่อเครื่อง (mixed job)

## ปัญหา
ใบงานหลายประเภท → หลายเครื่อง (เช่น ไวนิล[vinyl] + ตรายาง[fuji]). โมเดลเดิมมี
`print_uid` เดียว + status ผลิตเดียว → คนวินิลกับคน FUJI ทำงานแยกเครื่องอิสระไม่ได้
(ใคร claim ก่อนล็อกทั้งใบ). ต้องแยกเป็น **sub-task ต่อเครื่อง**.

## โมเดล (LOCKED)

เพิ่ม `print_tasks: ProductionTask[]` ฝังในใบงาน — 1 task ต่อ 1 machine ใน `job.machines`.
```ts
interface ProductionTask {
  machine: string;                              // 'fuji'|'vinyl'|'large_sticker'|'cut_sticker'|'other'
  status: 'รอผลิต' | 'กำลังผลิต' | 'เสร็จ';      // ต่อเครื่อง
  print_uid: string | null;
  print_date: Timestamp | null;                 // ตอน claim
  done_at: Timestamp | null;                    // ตอน upload เสร็จ
  images: JobImage[];                           // รูปงานพิมพ์ของเครื่องนี้
}
```

**job.status = derived จาก tasks** (job-level ยังเป็น single source ของ kanban/rules):
- `send_to_production` (graphic, คอนเฟิร์มแล้ว→รอผลิต): สร้าง tasks (ทุก machine, status รอผลิต)
- task ใด claim → job `กำลังผลิต`
- **ทุก task = เสร็จ → job `รอส่งมอบ`**
- เครื่องเดียว = 1 task (flow เหมือนเดิม ไม่ต้อง special-case)

**D1** claim/upload ระบุ `machine`: `claimPrint(job_id, machine)` / `uploadPrint(job_id, machine, images)`.
guard `canProduce(role, [machine])` (FUJI=graphic, non-FUJI=production — F-machine).
**D2** `uploadPrint` ใครก็ได้ในทีมที่ทำเครื่องนั้น (ไม่ต้องเป็น print_uid เดิม).
**D3** legacy `print_uid` = คน claim ล่าสุด (เก็บไว้โชว์/markDelivered), `print_images` = union ของทุก task (โชว์/ส่งมอบ).
**D4** **rules ไม่ต้อง denorm เพิ่ม** — ใช้ `machines.hasAny([...])` ที่มีอยู่ + ขยาย status list
(graphic/production อ่านงานเครื่องตัวเองได้ทุก stage ผลิต). queue/owned กรอง client-side จาก print_tasks.
**D5** markDelivered: ~~permission seller_uid==me OR print_uid==me OR (production/graphic ที่ canProduce) OR admin~~
**(REVISED — implement จริงเป็น seller เจ้าของงาน + admin เท่านั้น)** ยึดว่าผู้ขายเป็นคนส่งมอบ/รับเงิน
graphic/production ส่งมอบไม่ได้ (พิมพ์เสร็จ → job 'รอส่งมอบ' → seller ส่งมอบ) — ตรงกับ SCHEMA.md + `jobs.ts markDelivered`.

## เปลี่ยนอะไรบ้าง
- **BE** types ProductionTask + JobDoc.print_tasks; sendToProduction สร้าง tasks; claimPrint/uploadPrint
  รับ `machine` + อัปเดต task + derive job.status; helper deriveJobStatus/aggregate images.
- **rules** graphic/production machine-read ขยาย status → [คอนเฟิร์มแล้ว,รอผลิต,กำลังผลิต,รอส่งมอบ,ส่งมอบแล้ว]
- **FE** model ProductionTask; jobs.service queries (status list ขยาย); worksheet-info **render task list
  ต่อเครื่อง + ปุ่ม claim/upload ต่อ task** (canProduceMachines([task.machine])); home ไม่เปลี่ยน (status-level)
- **backfill** `print_tasks` ให้งานที่อยู่ระหว่างผลิต (status รอผลิต/กำลังผลิต/รอส่งมอบ) ที่ยังไม่มี tasks
- index: jobs (is_deleted, status, machines) มีแล้ว — พอ

## คงเหลือ/ข้อจำกัด
- task ไม่มี audit แยกราย machine ใน job_events (เก็บ payload machine แทน) — พอสำหรับเฟสนี้
- ราคา/F7 ไม่เกี่ยว (ยังคิดทั้งใบ)
