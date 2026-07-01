/**
 * Single source of truth ของ dropdown ประเภทงาน / ตัวเลือก / หน่วย สำหรับ work item.
 * ใช้โดย work-item-modal (input จริง) — เลิก hardcode ซ้ำหลายที่ (เดิม parent + modal
 * มี list คนละชุด ทำให้ option บางตัวไม่ตรง canonical → F7 จับคู่ rate ไม่ได้).
 *
 * ⚠️ field `code` = canonical key ที่ **ต้องตรงกับ** BE pricing.ts (TYPE_CANON / OPTION_CANON)
 *    Naikit-Sticker-BE/functions/src/lib/pricing.ts — เพื่อให้ F7 price audit จับคู่ rate card ได้.
 *    `value` = ค่าที่บันทึกลง job (label ไทย หรือ Q-code); BE map value→code ผ่านตาราง canonical.
 *    `code: null` = type นอกขอบเขต F7 (ไม่คิดราคากลาง — ดู docs/F7-RATE-CARD-DESIGN.md D1).
 *    การเพิ่ม option ใหม่ที่อยากให้คิดราคากลาง ต้องเพิ่มทั้งที่นี่ + pricing.ts + rate_cards.
 */

export interface CatalogType {
  value: string; // เก็บลง job
  label: string; // แสดงผล
  code: string | null; // canonical (null = นอกขอบเขต F7)
}
export interface CatalogOption {
  value: string;
  label: string;
  code: string;
}
export interface CatalogUnit {
  value: string;
  label: string;
}

export const WORK_ITEM_TYPES: CatalogType[] = [
  { value: 'ไวนิล', label: 'ไวนิล', code: 'vinyl' },
  { value: 'สติกเกอร์', label: 'สติกเกอร์ พิมพ์', code: 'sticker_print' },
  { value: 'สติกเกอร์ตัด', label: 'สติกเกอร์ ตัด', code: 'sticker_cut' },
  { value: 'ฉลาก', label: 'ฉลาก', code: null },
  { value: 'นามบัตร', label: 'นามบัตร', code: null },
  { value: 'ใบปลิว', label: 'ใบปลิว', code: null },
  { value: 'โปสเตอร์', label: 'โปสเตอร์', code: null },
  { value: 'พลาสวูด', label: 'พลาสวูด', code: null },
  { value: 'ตรายาง', label: 'ตรายาง', code: 'stamp' },
  { value: 'กล่องไฟ', label: 'กล่องไฟ', code: null },
  { value: 'โลอัพ', label: 'โลอัพ', code: null },
  { value: 'แบล็คลิส', label: 'แบล็คลิส', code: null },
];

/** keyed by type `value`. type ที่ไม่มี key = กรอก option เป็น free text (ไม่มี preset). */
export const WORK_ITEM_OPTIONS: Record<string, CatalogOption[]> = {
  ไวนิล: [
    { value: 'ตาไก่', label: 'ตาไก่', code: 'takai' },
    { value: 'ร้อยท่อ', label: 'ร้อยท่อ', code: 'roty' },
    { value: 'โครงไม้', label: 'โครงไม้', code: 'wood' },
    { value: 'พับขอบ', label: 'พับขอบ', code: 'seal' },
    { value: 'ธงญี่ปุ่นหน้า', label: 'ธงญี่ปุ่นหน้า', code: 'jp-flag-1' },
    { value: 'ธงญี่ปุ่นหน้า-หลัง', label: 'ธงญี่ปุ่นหน้า-หลัง', code: 'jp-flag-2' },
    { value: 'ปล่อยขอบ', label: 'ปล่อยขอบ', code: 'non-seal' },
    { value: 'โครงเหล็ก', label: 'โครงเหล็ก', code: 'metal' },
    { value: 'กรอบไม้', label: 'กรอบไม้', code: 'frame-wood' },
  ],
  สติกเกอร์: [
    { value: 'ติดฟิวเจอร์บอร์ด 3 มิล', label: 'ติดฟิวเจอร์บอร์ด 3 มิล', code: 'fb-3' },
    { value: 'ติดฟิวเจอร์บอร์ด 5 มิล', label: 'ติดฟิวเจอร์บอร์ด 5 มิล', code: 'fb-5' },
    { value: 'ติดพลาสวูด 3 มิล', label: 'ติดพลาสวูด 3 มิล', code: 'pw-3' },
    { value: 'ติดพลาสวูด 5 มิล', label: 'ติดพลาสวูด 5 มิล', code: 'pw-5' },
    { value: 'ติดพลาสวูด 10 มิล', label: 'ติดพลาสวูด 10 มิล', code: 'pw-10' },
    { value: 'ติดอะคริลิค', label: 'ติดอะคริลิค', code: 'acrylic' },
  ],
  สติกเกอร์ตัด: [
    { value: 'ติดฟิวเจอร์บอร์ด', label: 'ติดฟิวเจอร์บอร์ด', code: 'fb' },
    { value: 'ติดอะคริลิค', label: 'ติดอะคริลิค', code: 'acrylic' },
    { value: 'ติดพลาสวูด', label: 'ติดพลาสวูด', code: 'pw' },
  ],
  ตรายาง: [
    { value: 'Q-04', label: 'Q-04(4x60 MM.)', code: 'Q-04' },
    { value: 'Q-05', label: 'Q-05(11x25 MM.)', code: 'Q-05' },
    { value: 'Q-10', label: 'Q-10(11x40 MM.)', code: 'Q-10' },
    { value: 'Q-11', label: 'Q-11(16x48 MM.)', code: 'Q-11' },
    { value: 'Q-12', label: 'Q-12(24x49 MM.)', code: 'Q-12' },
    { value: 'Q-13', label: 'Q-13(13x49 MM.)', code: 'Q-13' },
    { value: 'Q-14', label: 'Q-14(14x60 MM.)', code: 'Q-14' },
    { value: 'Q-16', label: 'Q-16(36x61 MM.)', code: 'Q-16' },
    { value: 'Q-18', label: 'Q-18(22x69 MM.)', code: 'Q-18' },
    { value: 'Q-24', label: 'Q-24(28x78 MM.)', code: 'Q-24' },
    { value: 'Q-26', label: 'Q-26(16x83 MM.)', code: 'Q-26' },
    { value: 'Q-32', label: 'Q-32(16 MM.)', code: 'Q-32' },
    { value: 'Q-34', label: 'Q-34(20 MM.)', code: 'Q-34' },
    { value: 'Q-53', label: 'Q-53(38 MM.)', code: 'Q-53' },
  ],
};

/** หน่วยความยาว (value = ป้ายไทย; mapUnitOfLength แปลงเป็น SCHEMA enum ตอน build payload). */
export const UNIT_OPTIONS: CatalogUnit[] = [
  { value: 'มม.', label: 'มม.' },
  { value: 'ซม.', label: 'ซม.' },
  { value: 'นิ้ว', label: 'นิ้ว' },
  { value: 'เมตร', label: 'เมตร' },
];

// ─── Production machine / group (soft filter ใน home — ดูง่ายว่าเป็นงานของเครื่องไหน) ──────
// ประเภทงาน 1 ตัวอยู่ได้หลายเครื่อง (many-to-many) เช่น สติกเกอร์พิมพ์ ทำที่ FUJI หรือ
// สติ๊กเกอร์เครื่องใหญ่ก็ได้ (แล้วแต่ขนาด). FUJI = graphic พิมพ์, ที่เหลือ = ฝ่ายผลิต.
// ⚠️ soft filter เท่านั้น — ไม่บล็อกสิทธิ์ (firestore.rules/BE ไม่เกี่ยว). แก้ mapping ที่นี่ที่เดียว.

export interface MachineGroup { value: string; label: string; }

export const MACHINE_GROUPS: MachineGroup[] = [
  { value: 'fuji',          label: 'FUJI' },
  { value: 'vinyl',         label: 'ไวนิล' },
  { value: 'large_sticker', label: 'สติ๊กเกอร์ใหญ่' },
  { value: 'cut_sticker',   label: 'สติกเกอร์ตัด' },
  { value: 'other',         label: 'อื่นๆ' },
];

/** ประเภทงาน (work_item.type value) → เครื่อง/กลุ่มผลิต. [] = ยังไม่ระบุ → จัดเป็น 'other'. */
export const MACHINE_OF_TYPE: Record<string, string[]> = {
  'ไวนิล':        ['vinyl'],
  'สติกเกอร์':     ['fuji', 'large_sticker'], // value 'สติกเกอร์' = สติกเกอร์ พิมพ์
  'สติกเกอร์ตัด':  ['cut_sticker'],
  'ฉลาก':         ['fuji', 'large_sticker'],
  'นามบัตร':       ['fuji'],
  'ใบปลิว':        ['fuji'],
  'โปสเตอร์':      ['fuji', 'large_sticker'],
  'ตรายาง':        ['fuji'],
  'โลอัพ':         ['large_sticker'],
  'แบล็คลิส':      ['large_sticker'],
  'กล่องไฟ':       ['large_sticker'],
  'พลาสวูด':       [], // ยังไม่ระบุเครื่อง → 'other'
};

/** F13 — เครื่องที่ "เลือกได้" ของ work_item 1 ชิ้น ([] → ['other']). mirror BE lib/machines.ts eligibleOf. */
export function eligibleMachinesOf(type: string): string[] {
  const ms = MACHINE_OF_TYPE[type];
  return ms && ms.length ? ms : ['other'];
}

/** F15 — task key ของ work_item 1 ชิ้น = eligible เรียง+join (ตรง algorithm กับ BE productionTaskSpecs).
 *  ใช้ scope ฟอร์มบันทึกการพิมพ์ให้โชว์เฉพาะ item ของ task นั้น. */
export function taskKeyForType(type: string): string {
  return [...eligibleMachinesOf(type)].sort().join('|');
}

/** เครื่องทั้งหมดที่ใบงานเกี่ยวข้อง (union ของทุก work_item.type). type ที่ไม่ map = 'other'. */
export function machinesForTypes(types: string[]): string[] {
  const set = new Set<string>();
  for (const t of types) {
    const ms = MACHINE_OF_TYPE[t];
    if (ms && ms.length) ms.forEach((m) => set.add(m));
    else set.add('other');
  }
  return [...set];
}

/** role ผลิต/พิมพ์ใบงานที่มี machines ชุดนี้ได้ไหม (mirror BE lib/machines.ts canProduce).
 *  FUJI = graphic เท่านั้น · non-FUJI = production เท่านั้น · admin = ได้หมด. */
export function canProduceMachines(role: string | null | undefined, machines: string[] | undefined): boolean {
  if (role === 'admin') return true;
  const ms = machines ?? [];
  if (role === 'graphic') return ms.includes('fuji');
  if (role === 'production') return ms.some((m) => m !== 'fuji');
  return false;
}

export function optionsForType(typeValue: string): CatalogOption[] {
  return WORK_ITEM_OPTIONS[typeValue] ?? [];
}

export function typeHasPresetOptions(typeValue: string): boolean {
  return (WORK_ITEM_OPTIONS[typeValue]?.length ?? 0) > 0;
}
