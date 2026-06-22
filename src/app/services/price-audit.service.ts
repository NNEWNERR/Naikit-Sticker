/**
 * PriceAuditService (F7) — อ่าน price_audits (variance snapshot) + จัดการ rate card (ราคากลาง).
 * ใช้โดย Finance Dashboard (รายการติดธง) + Settings (admin จัดการ rate card).
 * ดู docs/F7-RATE-CARD-DESIGN.md
 *
 * reads ตรงจาก Firestore (rules: price_audits/rate_cards อ่านได้เฉพาะ finance/admin);
 * mutations rate card ผ่าน Cloud Function (upsertRateCard, admin).
 */
import { Injectable } from '@angular/core';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { FunctionsError, httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase-config';
import { PriceAudit, RateCard, UpsertRateCardPayload } from '../core/models/price-audit';

export class RateCardError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class PriceAuditService {

  /**
   * live query งานที่ติดธงราคา (severity soft/hard) เรียงใหม่สุดก่อน. finance/admin เท่านั้น.
   * (index: price_audits is_deleted,severity,job_created_at desc)
   */
  watchFlagged(onUpdate: (audits: PriceAudit[]) => void): () => void {
    return onSnapshot(
      query(
        collection(db, 'price_audits'),
        where('is_deleted', '==', false),
        where('severity', 'in', ['soft', 'hard']),
        orderBy('job_created_at', 'desc'),
      ),
      (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PriceAudit))),
    );
  }

  /** rate cards ทั้งหมด (admin/finance) — สำหรับหน้าจัดการ. */
  async listRateCards(): Promise<RateCard[]> {
    const res = await this._call<Record<string, never>, { rate_cards: RateCard[] }>('listRateCards', {} as Record<string, never>);
    return res.rate_cards ?? [];
  }

  /** สร้าง/แก้ rate card (admin). version++ + audit ฝั่ง BE. */
  async upsertRateCard(payload: UpsertRateCardPayload): Promise<{ id: string; version: number }> {
    return this._call<UpsertRateCardPayload, { id: string; version: number }>('upsertRateCard', payload);
  }

  private async _call<Req, Res>(name: string, data: Req): Promise<Res> {
    const fn = httpsCallable<Req, Res>(functions, name);
    try {
      const res = await fn(data);
      return res.data;
    } catch (e: unknown) {
      const fe = e as FunctionsError;
      const code = fe?.code ?? 'unknown';
      const msg = typeof fe?.message === 'string' ? fe.message : '';
      throw new RateCardError(code, msg || 'จัดการราคากลางไม่สำเร็จ');
    }
  }
}
