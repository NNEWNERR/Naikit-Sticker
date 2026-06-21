/**
 * CashService — cash reconciliation (F5). callable wrappers + live query.
 * ใช้โดย Finance Dashboard (F6, role finance/admin). ดู docs/FINANCE-CONTROLS.md
 *
 * Mutations ผ่าน Cloud Functions (reconcileCashSession / closeCashSession);
 * reads ตรงจาก Firestore (rules: cash_sessions อ่านได้เฉพาะ finance/admin).
 */
import { Injectable } from '@angular/core';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { FunctionsError, httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase-config';
import {
  CashSession,
  ReconcileCashPayload,
  ReconcileCashResponse,
} from '../core/models/cash';

export class CashError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class CashService {

  /** finance/admin บันทึก/อัปเดตรอบกระทบยอดเงินสด (คำนวณ system_total ใหม่). */
  async reconcile(payload: ReconcileCashPayload): Promise<ReconcileCashResponse> {
    return this._call<ReconcileCashPayload, ReconcileCashResponse>('reconcileCashSession', payload);
  }

  /** ปิดรอบ (lock) — หลังจากนี้แก้ไม่ได้. */
  async close(sellerUid: string, date: string): Promise<{ id: string }> {
    return this._call('closeCashSession', { seller_uid: sellerUid, date });
  }

  /** live query รอบกระทบยอด เรียงตามวันใหม่สุดก่อน. คืน cleanup fn. */
  watchSessions(onUpdate: (sessions: CashSession[]) => void): () => void {
    return onSnapshot(
      query(collection(db, 'cash_sessions'), orderBy('date', 'desc')),
      (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CashSession))),
    );
  }

  /** live query เฉพาะ seller คนเดียว. คืน cleanup fn. */
  watchSessionsForSeller(sellerUid: string, onUpdate: (sessions: CashSession[]) => void): () => void {
    return onSnapshot(
      query(
        collection(db, 'cash_sessions'),
        where('seller_uid', '==', sellerUid),
        orderBy('date', 'desc'),
      ),
      (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CashSession))),
    );
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
      throw new CashError(code, msg || 'ทำรายการเงินสดไม่สำเร็จ');
    }
  }
}
