/**
 * F14 — ใบเสร็จ QR (public). mirror BE `lib/receipt.ts` ReceiptProjection.
 * ดู docs/F14-RECEIPT-QR-MATERIAL-DESIGN.md §5
 */
export interface ReceiptItem {
  label: string;
  quantity: number;
  amount: number;
}

export interface ReceiptProjection {
  shop_name: string;
  serial_number: string;
  /** epoch ms ของวันรับงาน (null ถ้าไม่มี) */
  date: number | null;
  customer_name: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  other_fee: number;
  shipping_fee: number;
  transfer_fee: number;
  vat_amount: number;
  grand_total: number;
  wht_amount: number;
  amount_due: number;
  paid_amount: number;
  outstanding: number;
  payment_status: 'ชำระครบ' | 'ค้างชำระ' | 'รอชำระ';
  job_status: string;
  issued_by_system: true;
}
