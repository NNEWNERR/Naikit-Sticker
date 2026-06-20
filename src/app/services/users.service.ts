import { Injectable, OnDestroy, signal } from '@angular/core';
import {
  collection,
  onSnapshot,
  query,
  Timestamp,
  Unsubscribe,
  where,
} from 'firebase/firestore';
import { FunctionsError, httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase-config';
import { Role } from '../core/models/session';

export interface AdminUser {
  uid: string;
  username: string;
  display_name: string;
  role: Role;
  is_active: boolean;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}

/**
 * Surfaced to the UI. Tracks the user-facing message + which field (if any)
 * should be focused. Maps Cloud Function `HttpsError` codes 1:1.
 */
export class UserAdminError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly field?: 'username' | 'password' | 'display_name' | 'role',
  ) {
    super(message);
  }
}

interface CreateUserPayload {
  username: string;
  password: string;
  display_name: string;
  role: Role;
}

interface CreateUserResponse {
  uid: string;
  username: string;
  role: Role;
  display_name: string;
}

/**
 * Admin-facing wrapper around the BE admin Cloud Functions
 * (Naikit-Sticker-BE/functions/src/admin.ts).
 *
 * Reads `users/{uid}` via a single shared listener (`users()` signal) so
 * multiple components share one subscription. Listener starts on first
 * `ensureListener()` call and stops on service destroy or `stopListener()`.
 */
@Injectable({ providedIn: 'root' })
export class UsersService implements OnDestroy {
  private readonly _users = signal<AdminUser[]>([]);
  private readonly _loading = signal<boolean>(false);
  readonly users = this._users.asReadonly();
  readonly loading = this._loading.asReadonly();

  private unsub: Unsubscribe | null = null;
  private refCount = 0;

  // ── Live list ──────────────────────────────────────────────────────────

  /**
   * Increment a refcount and start the Firestore listener on first attach.
   * Returns a release fn that detaches the caller; the listener stops when
   * the last consumer releases.
   */
  attachListener(): () => void {
    this.refCount += 1;
    if (!this.unsub) {
      this.startListener();
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.refCount = Math.max(0, this.refCount - 1);
      if (this.refCount === 0) {
        this.stopListener();
      }
    };
  }

  ngOnDestroy(): void {
    this.stopListener();
  }

  private startListener(): void {
    this._loading.set(true);
    const q = query(
      collection(db, 'users'),
      where('is_deleted', '==', false),
    );
    this.unsub = onSnapshot(
      q,
      (snap) => {
        const list: AdminUser[] = [];
        snap.forEach((d) => {
          const v = d.data() as Record<string, unknown>;
          list.push({
            uid: d.id,
            username: typeof v['username'] === 'string' ? (v['username'] as string) : '',
            display_name:
              typeof v['display_name'] === 'string' ? (v['display_name'] as string) : '',
            role: (v['role'] as Role) ?? 'seller',
            is_active: v['is_active'] !== false,
            created_at: (v['created_at'] as Timestamp | undefined) ?? null,
            updated_at: (v['updated_at'] as Timestamp | undefined) ?? null,
          });
        });
        list.sort((a, b) => a.username.localeCompare(b.username));
        this._users.set(list);
        this._loading.set(false);
      },
      (err) => {
        console.error('[UsersService] users snapshot error', err);
        this._loading.set(false);
      },
    );
  }

  private stopListener(): void {
    if (this.unsub) {
      this.unsub();
      this.unsub = null;
    }
  }

  // ── Mutations (Cloud Functions) ────────────────────────────────────────

  async createUser(payload: CreateUserPayload): Promise<CreateUserResponse> {
    const fn = httpsCallable<CreateUserPayload, CreateUserResponse>(
      functions,
      'createUser',
    );
    try {
      const res = await fn(payload);
      return res.data;
    } catch (e: unknown) {
      throw this.mapError(e);
    }
  }

  async setUserRole(uid: string, role: Role): Promise<void> {
    const fn = httpsCallable<{ uid: string; role: Role }, { uid: string; role: Role }>(
      functions,
      'setUserRole',
    );
    try {
      await fn({ uid, role });
    } catch (e: unknown) {
      throw this.mapError(e);
    }
  }

  async setUserActive(uid: string, active: boolean): Promise<void> {
    const fn = httpsCallable<
      { uid: string; active: boolean },
      { uid: string; is_active: boolean }
    >(functions, 'setUserActive');
    try {
      await fn({ uid, active });
    } catch (e: unknown) {
      throw this.mapError(e);
    }
  }

  async resetPassword(uid: string, password: string): Promise<void> {
    const fn = httpsCallable<{ uid: string; password: string }, { uid: string }>(
      functions,
      'resetPassword',
    );
    try {
      await fn({ uid, password });
    } catch (e: unknown) {
      throw this.mapError(e);
    }
  }

  // ── Error mapping ──────────────────────────────────────────────────────

  private mapError(e: unknown): UserAdminError {
    const fe = e as FunctionsError;
    const code = fe?.code ?? 'unknown';
    const beMessage = typeof fe?.message === 'string' ? fe.message : '';
    // BE already returns Thai messages via invalidArgument/alreadyExists etc.
    // For codes the BE doesn't customise, fall back to a generic Thai string.
    switch (code) {
      case 'functions/invalid-argument':
        return new UserAdminError(code, beMessage || 'ข้อมูลไม่ถูกต้อง');
      case 'functions/already-exists':
        return new UserAdminError(code, beMessage || 'username นี้มีอยู่แล้ว', 'username');
      case 'functions/not-found':
        return new UserAdminError(code, beMessage || 'ไม่พบผู้ใช้');
      case 'functions/failed-precondition':
        return new UserAdminError(code, beMessage || 'ไม่สามารถดำเนินการได้');
      case 'functions/permission-denied':
        return new UserAdminError(code, 'ต้องมีสิทธิ์แอดมินเท่านั้น');
      case 'functions/unauthenticated':
        return new UserAdminError(code, 'กรุณาเข้าสู่ระบบใหม่');
      case 'functions/unavailable':
        return new UserAdminError(code, 'เครือข่ายขัดข้อง กรุณาลองอีกครั้ง');
      default:
        return new UserAdminError(code, beMessage || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
    }
  }
}
