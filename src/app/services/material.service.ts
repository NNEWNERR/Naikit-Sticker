import { Injectable } from '@angular/core';
import { httpsCallable, FunctionsError } from 'firebase/functions';
import { functions } from './firebase-config';
import { MaterialReconcileLine, MaterialSummary } from '../core/models/material-reconcile';

export class MaterialError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

/** F14 ชั้น B — reconcile วัสดุ (finance/admin). */
@Injectable({ providedIn: 'root' })
export class MaterialService {
  /** derive system_qty ต่อวัสดุ + ผสม counted/assumed ที่เคยบันทึก */
  async computeSummary(period: string): Promise<MaterialSummary> {
    return this._call<{ period: string }, MaterialSummary>('computeMaterialSummary', { period });
  }

  /** บันทึก (server re-derive system_qty + คำนวณ variance) */
  async save(
    period: string,
    lines: { material: string; counted_input: number; assumed_per_unit: number }[],
    note: string,
  ): Promise<{ period: string; lines: MaterialReconcileLine[] }> {
    return this._call('saveMaterialReconcile', { period, lines, note });
  }

  private async _call<Req, Res>(name: string, data: Req): Promise<Res> {
    const fn = httpsCallable<Req, Res>(functions, name);
    try {
      return (await fn(data)).data;
    } catch (e: unknown) {
      const fe = e as FunctionsError;
      const code = fe?.code ?? 'unknown';
      const msg = code === 'functions/permission-denied' ? 'ไม่มีสิทธิ์ (เฉพาะการเงิน/แอดมิน)'
        : code === 'functions/invalid-argument' ? (fe?.message || 'ข้อมูลไม่ถูกต้อง')
        : (fe?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
      throw new MaterialError(code, msg);
    }
  }
}
