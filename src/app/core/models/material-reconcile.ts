/** F14 ชั้น B — reconcile วัสดุ. mirror BE types.ts MaterialReconcileDoc */
export type MaterialCode = 'vinyl' | 'sticker_print' | 'sticker_cut' | 'stamp' | 'other';

export interface MaterialReconcileLine {
  material: MaterialCode;
  unit: 'sqm' | 'unit';
  system_qty: number;
  counted_input: number;
  assumed_per_unit: number;
  implied_qty: number;
  variance: number;
  variance_pct: number;
}

export interface MaterialSummary {
  period: string;
  lines: MaterialReconcileLine[];
  status: 'open' | 'reviewed';
  note: string;
}
