import { Injectable, signal } from '@angular/core';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  Query,
  where,
} from 'firebase/firestore';
import { Role } from '../core/models/session';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FunctionsError, httpsCallable } from 'firebase/functions';
import { db, functions, storage } from './firebase-config';
import {
  CreateJobPayload,
  CreateJobResponse,
  Job,
  JobEvent,
} from '../core/models/job';

export class JobAdminError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class JobsService {

  // ── Mutations (all go through Cloud Functions) ──────────────────────────

  async createJob(payload: CreateJobPayload): Promise<CreateJobResponse> {
    return this._call<CreateJobPayload, CreateJobResponse>('createJob', payload);
  }

  async claimDesign(jobId: string): Promise<void> {
    await this._call('claimDesign', { job_id: jobId });
  }

  async submitDesign(jobId: string, designImageUrls: string[]): Promise<void> {
    await this._call('submitDesign', { job_id: jobId, design_images: designImageUrls });
  }

  async confirmDesign(jobId: string): Promise<void> {
    await this._call('confirmDesign', { job_id: jobId });
  }

  async requestRevision(jobId: string, note?: string): Promise<void> {
    await this._call('requestRevision', { job_id: jobId, note: note ?? null });
  }

  async sendToProduction(jobId: string): Promise<void> {
    await this._call('sendToProduction', { job_id: jobId });
  }

  async claimPrint(jobId: string): Promise<void> {
    await this._call('claimPrint', { job_id: jobId });
  }

  async uploadPrint(jobId: string, printImageUrls: string[]): Promise<void> {
    await this._call('uploadPrint', { job_id: jobId, print_images: printImageUrls });
  }

  async markDelivered(jobId: string, slipUrls: string[] = []): Promise<void> {
    await this._call('markDelivered', { job_id: jobId, delivery_slips: slipUrls });
  }

  async editJob(jobId: string, patch: Record<string, unknown>): Promise<void> {
    await this._call('editJob', { job_id: jobId, ...patch });
  }

  /**
   * F2 — ปรับยอดเงินหลังสร้าง (role finance/admin เท่านั้น, บังคับ reason).
   * total ยังคิดจาก work_items ฝั่ง BE; ปรับได้แค่ discount/deposit/method/date.
   * เขียน audit event `payment_adjust` (before/after/reason). ดู docs/FINANCE-CONTROLS.md
   */
  async adjustPayment(
    jobId: string,
    patch: {
      reason: string;
      deposit?: number;
      discount?: number;
      shipping_fee?: number;
      transfer_fee?: number;
      payment_method?: string;
      date_of_payment?: string | null;
    },
  ): Promise<void> {
    await this._call('adjustPayment', { job_id: jobId, ...patch });
  }

  async adminReassign(jobId: string, patch: { design_uid?: string | null; print_uid?: string | null; seller_uid?: string }): Promise<void> {
    await this._call('adminReassign', { job_id: jobId, ...patch });
  }

  async deleteJob(jobId: string): Promise<void> {
    await this._call('deleteJob', { job_id: jobId });
  }

  async restoreJob(jobId: string): Promise<void> {
    await this._call('restoreJob', { job_id: jobId });
  }

  // ── Image upload helper (Storage → URL) ─────────────────────────────────

  async uploadImages(jobId: string, type: 'design' | 'print' | 'slip', files: File[]): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
      const path = `jobs/${jobId}/${type}/${crypto.randomUUID()}.${ext}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file);
      urls.push(await getDownloadURL(ref));
    }
    return urls;
  }

  // ── Firestore live listeners ─────────────────────────────────────────────

  /** อ่าน job ครั้งเดียว (สำหรับ prefill edit form). */
  async getJob(jobId: string): Promise<Job | null> {
    const snap = await getDoc(doc(db, 'jobs', jobId));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Job) : null;
  }

  /** Subscribe to a single job document. Returns a cleanup fn. */
  watchJob(jobId: string, onUpdate: (job: Job | null) => void, onError?: () => void): () => void {
    return onSnapshot(
      doc(db, 'jobs', jobId),
      (snap) => onUpdate(snap.exists() ? ({ id: snap.id, ...snap.data() } as Job) : null),
      () => { onError?.(); onUpdate(null); },
    );
  }

  /**
   * Role-aware live query for the home kanban.
   *
   * - admin/seller: single query filtered by is_deleted + (seller_uid for seller)
   * - graphic: two queries merged — unclaimed design queue + my design jobs
   * - production: two queries merged — unclaimed production queue + my print jobs
   *
   * Returns a cleanup fn that unsubscribes all underlying listeners.
   */
  watchMyJobs(role: Role, uid: string, onUpdate: (jobs: Job[]) => void): () => void {
    // Each query owns a slot in `buckets`; all slots are merged on every change.
    const buckets: Map<string, Job>[] = [];
    const cleanups: Array<() => void> = [];

    const addQuery = (q: Query): void => {
      const idx = buckets.length;
      buckets.push(new Map<string, Job>());
      cleanups.push(
        onSnapshot(q, (snap) => {
          buckets[idx].clear();
          for (const d of snap.docs) {
            buckets[idx].set(d.id, { id: d.id, ...d.data() } as Job);
          }
          const merged = new Map<string, Job>();
          for (const b of buckets) b.forEach((v, k) => merged.set(k, v));
          onUpdate([...merged.values()]);
        }),
      );
    };

    const base = collection(db, 'jobs');
    const notDeleted = where('is_deleted', '==', false);

    switch (role) {
      case 'admin':
      case 'finance': // ผู้ตรวจเงิน — อ่านทุกงาน (read-only) เหมือน admin
        addQuery(query(base, notDeleted));
        break;
      case 'seller':
        addQuery(query(base, notDeleted, where('seller_uid', '==', uid)));
        break;
      case 'graphic':
        // unclaimed design queue
        addQuery(query(base, notDeleted, where('status', '==', 'รอออกแบบ'), where('design_uid', '==', null)));
        // jobs currently or previously assigned to me
        addQuery(query(base, notDeleted, where('design_uid', '==', uid)));
        break;
      case 'production':
        // unclaimed production queue (confirmed + waiting)
        addQuery(query(base, notDeleted, where('status', 'in', ['คอนเฟิร์มแล้ว', 'รอผลิต']), where('print_uid', '==', null)));
        // jobs assigned to me
        addQuery(query(base, notDeleted, where('print_uid', '==', uid)));
        break;
    }

    return () => cleanups.forEach((fn) => fn());
  }

  /**
   * Live query of every job the current user is allowed to see, for the
   * report + diary pages (gated to admin + seller + finance).
   *
   * - admin/finance: all non-deleted jobs
   * - seller:        own non-deleted jobs (seller_uid == uid)
   * - other:         empty (those roles can't reach these pages; fail closed)
   *
   * Predicates mirror firestore.rules so the list query is never rejected.
   * Returns a cleanup fn.
   */
  watchVisibleJobs(role: Role, uid: string, onUpdate: (jobs: Job[]) => void): () => void {
    const base = collection(db, 'jobs');
    const notDeleted = where('is_deleted', '==', false);

    let q: Query;
    if (role === 'admin' || role === 'finance') {
      q = query(base, notDeleted);
    } else if (role === 'seller') {
      q = query(base, notDeleted, where('seller_uid', '==', uid));
    } else {
      onUpdate([]);
      return () => undefined;
    }

    return onSnapshot(q, (snap) =>
      onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Job))),
    );
  }

  /** Subscribe to the audit log for a job, newest first. Returns a cleanup fn. */
  watchJobEvents(jobId: string, onUpdate: (events: JobEvent[]) => void): () => void {
    return onSnapshot(
      query(
        collection(db, 'job_events'),
        where('job_id', '==', jobId),
        orderBy('at', 'desc'),
      ),
      (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobEvent))),
    );
  }

  /**
   * Finance Dashboard (F6) — all `payment_adjust` audit events, newest first.
   * Read scoped to staff by rules; only finance/admin reach the dashboard.
   * Returns a cleanup fn.
   */
  watchPaymentAdjustEvents(onUpdate: (events: JobEvent[]) => void): () => void {
    return onSnapshot(
      query(
        collection(db, 'job_events'),
        where('action', '==', 'payment_adjust'),
        orderBy('at', 'desc'),
      ),
      (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobEvent))),
    );
  }

  /**
   * Finance Dashboard (F6) — soft-deleted jobs (audit/outlier panel).
   * finance/admin only (firestore.rules canReadAll). Returns a cleanup fn.
   */
  watchDeletedJobs(onUpdate: (jobs: Job[]) => void): () => void {
    return onSnapshot(
      query(collection(db, 'jobs'), where('is_deleted', '==', true)),
      (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Job))),
    );
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private async _call<Req, Res = { jobId: string }>(name: string, data: Req): Promise<Res> {
    const fn = httpsCallable<Req, Res>(functions, name);
    try {
      const res = await fn(data);
      return res.data;
    } catch (e: unknown) {
      throw this._mapError(e);
    }
  }

  private _mapError(e: unknown): JobAdminError {
    const fe = e as FunctionsError;
    const code = fe?.code ?? 'unknown';
    const beMessage = typeof fe?.message === 'string' ? fe.message : '';
    switch (code) {
      case 'functions/invalid-argument':
        return new JobAdminError(code, beMessage || 'ข้อมูลไม่ถูกต้อง');
      case 'functions/failed-precondition':
        return new JobAdminError(code, beMessage || 'ไม่สามารถดำเนินการได้');
      case 'functions/not-found':
        return new JobAdminError(code, beMessage || 'ไม่พบข้อมูล');
      case 'functions/permission-denied':
        return new JobAdminError(code, beMessage || 'ไม่มีสิทธิ์ทำรายการนี้');
      case 'functions/unauthenticated':
        return new JobAdminError(code, 'กรุณาเข้าสู่ระบบใหม่');
      case 'functions/unavailable':
        return new JobAdminError(code, 'เครือข่ายขัดข้อง กรุณาลองอีกครั้ง');
      default:
        return new JobAdminError(code, beMessage || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
    }
  }
}
