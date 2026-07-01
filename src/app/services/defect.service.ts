import { Injectable, inject } from '@angular/core';
import { httpsCallable, FunctionsError } from 'firebase/functions';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, functions } from './firebase-config';
import { AppStateService } from './app-state.service';
import { Defect, DefectInput, WasteSummary } from '../core/models/job';

/**
 * F15 — งานเสีย (defects) + waste report.
 *  - recordDefect: seller เจ้าของงาน + production/graphic/admin บันทึกงานเสีย
 *  - voidDefect: admin ยกเลิก
 *  - computeWasteSummary: finance/admin สรุปเศษ/งานเสียรายเดือน
 * ดู docs/F15-PRODUCTION-MATERIAL.md §6
 */
export class DefectError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

@Injectable({ providedIn: 'root' })
export class DefectService {
  private appState = inject(AppStateService);

  private get canReadAll(): boolean {
    const r = this.appState.role();
    return r === 'finance' || r === 'admin';
  }

  async record(input: DefectInput): Promise<{ id: string; area_wasted_sqm: number }> {
    return this._call('recordDefect', input);
  }

  async void(defectId: string, reason: string): Promise<{ id: string }> {
    return this._call('voidDefect', { defect_id: defectId, reason });
  }

  /** งานเสียของใบงาน — finance/admin เห็นทั้งหมด; ผู้บันทึกเห็นเฉพาะของตัวเอง (ตาม rules) */
  watchForJob(jobId: string, cb: (d: Defect[]) => void): () => void {
    const uid = this.appState.uid();
    const all = this.canReadAll;
    if (!all && !uid) { cb([]); return () => undefined; }
    const q = all
      ? query(collection(db, 'defects'), where('job_id', '==', jobId))
      : query(collection(db, 'defects'), where('job_id', '==', jobId), where('recorded_by_uid', '==', uid!));
    return onSnapshot(
      q,
      (snap) => cb(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Defect))
          .filter((x) => (x as unknown as { is_deleted?: boolean }).is_deleted !== true)
          .sort((a, b) => (b.occurred_at?.toMillis?.() ?? 0) - (a.occurred_at?.toMillis?.() ?? 0)),
      ),
      () => cb([]),
    );
  }

  async wasteSummary(period: string): Promise<WasteSummary> {
    return this._call<{ period: string }, WasteSummary>('computeWasteSummary', { period });
  }

  private async _call<Req, Res>(name: string, data: Req): Promise<Res> {
    const fn = httpsCallable<Req, Res>(functions, name);
    try {
      return (await fn(data)).data;
    } catch (e: unknown) {
      const fe = e as FunctionsError;
      const code = fe?.code ?? 'unknown';
      const msg = code === 'functions/permission-denied' ? 'ไม่มีสิทธิ์'
        : code === 'functions/invalid-argument' ? (fe?.message || 'ข้อมูลไม่ถูกต้อง')
        : (fe?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
      throw new DefectError(code, msg);
    }
  }
}
