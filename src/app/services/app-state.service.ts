import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  User as FirebaseUser,
  onIdTokenChanged,
  signOut as fbSignOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase-config';
import { isRole, Role, SessionUser } from '../core/models/session';

/**
 * Global FE session state — single source of truth for "who is the user
 * right now". Driven by `onIdTokenChanged` so changes from a Cloud Function
 * (setUserRole / setUserActive / resetPassword) take effect on token refresh
 * without a hard reload.
 *
 * Contract:
 *  - `session()` is null until `ready()` resolves the first time. Guards must
 *    await `ready()` before reading.
 *  - When `users/{uid}.is_active === false`, this service signs the user out
 *    immediately. Callers do NOT need to re-check is_active.
 *  - When the ID token lacks a `role` claim, login is rejected (fail-safe —
 *    every account must have a role set by an admin).
 */
@Injectable({ providedIn: 'root' })
export class AppStateService {
  private readonly _session = signal<SessionUser | null>(null);
  /** Live session, or null when logged out. */
  readonly session = this._session.asReadonly();

  readonly uid = computed(() => this._session()?.uid ?? null);
  readonly role = computed<Role | null>(() => this._session()?.role ?? null);
  readonly displayName = computed(() => this._session()?.display_name ?? '');
  readonly isLoggedIn = computed(() => this._session() !== null);
  readonly isAdmin = computed(() => this.role() === 'admin');

  private _readyResolved = false;
  private _readyPromise: Promise<void>;
  private _resolveReady!: () => void;

  constructor(private router: Router) {
    this._readyPromise = new Promise((resolve) => {
      this._resolveReady = resolve;
    });

    onIdTokenChanged(auth, async (user) => {
      try {
        await this.applyUser(user);
      } finally {
        if (!this._readyResolved) {
          this._readyResolved = true;
          this._resolveReady();
        }
      }
    });
  }

  /**
   * Resolve + apply the session for the currently signed-in user (or clear it
   * when signed out). Returns the resolved session, or null when rejected
   * (no role claim / missing doc / deactivated — caller already signed out).
   *
   * Used by the login flow so it can deterministically wait for the post-sign-in
   * session to settle, instead of racing the boot-time `ready()` promise.
   */
  async refreshSession(): Promise<SessionUser | null> {
    return this.applyUser(auth.currentUser);
  }

  private async applyUser(user: FirebaseUser | null): Promise<SessionUser | null> {
    if (!user) {
      this._session.set(null);
      return null;
    }
    const next = await this.resolveSession(user);
    if (!next) {
      // Either no role claim or account deactivated — sign out and stay logged out.
      await this.forceSignOut();
      return null;
    }
    this._session.set(next);
    return next;
  }

  /**
   * Resolves on the first `onIdTokenChanged` callback (initial auth state).
   * Guards await this so they don't redirect to /login during the brief
   * window between app boot and Firebase restoring the session.
   */
  ready(): Promise<void> {
    return this._readyPromise;
  }

  /**
   * Sign out and redirect. Safe to call when already logged out.
   */
  async logout(): Promise<void> {
    try {
      await fbSignOut(auth);
    } catch {
      // Even if signOut fails (e.g. offline), clear local state.
    }
    this._session.set(null);
    this.router.navigate(['/login']);
  }

  // ── private ────────────────────────────────────────────────────────────

  private async resolveSession(user: FirebaseUser): Promise<SessionUser | null> {
    // Force a fresh token read so a just-set custom claim is visible.
    const tokenResult = await user.getIdTokenResult(false);
    const claimRole = tokenResult.claims['role'];
    if (!isRole(claimRole)) {
      return null;
    }

    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) {
      // User doc missing — admin must finish provisioning. Reject login.
      return null;
    }
    const data = snap.data();
    if (data['is_active'] === false || data['is_deleted'] === true) {
      return null;
    }

    return {
      uid: user.uid,
      username: typeof data['username'] === 'string' ? data['username'] : '',
      display_name:
        typeof data['display_name'] === 'string' ? data['display_name'] : '',
      role: claimRole,
      is_active: true,
    };
  }

  private async forceSignOut(): Promise<void> {
    try {
      await fbSignOut(auth);
    } catch {
      // ignore
    }
    this._session.set(null);
  }
}
