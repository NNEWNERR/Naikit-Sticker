import { Injectable } from '@angular/core';
import {
  EmailAuthProvider, reauthenticateWithCredential, signInWithEmailAndPassword, updatePassword,
} from 'firebase/auth';
import { auth } from './firebase-config';
import { AppStateService } from './app-state.service';

const EMAIL_DOMAIN = 'naikit.local';

/**
 * Error code surfaced to the login UI. Caller maps to a Thai message.
 */
export type SignInError =
  | 'invalid_credentials'  // wrong username/password or user not found
  | 'disabled'             // Firebase Auth disabled the account
  | 'no_role'              // signed in but custom claim missing
  | 'network'
  | 'unknown';

export class AuthError extends Error {
  constructor(public readonly code: SignInError, message: string) {
    super(message);
  }
}

/**
 * Thin wrapper around Firebase Auth. Real session state lives in
 * AppStateService — this service only handles the sign-in action.
 *
 * Username is mapped to a synthetic email `${username}@naikit.local` to
 * reuse Firebase email/password auth (no separate username store needed —
 * username uniqueness is enforced by `createUser` on the BE).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private appState: AppStateService) {}

  async signIn(username: string, password: string): Promise<void> {
    const u = (username ?? '').trim().toLowerCase();
    if (!u || !password) {
      throw new AuthError('invalid_credentials', 'กรุณากรอก username และ password');
    }
    const email = `${u}@${EMAIL_DOMAIN}`;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: unknown) {
      throw this.mapFirebaseError(e);
    }
    // Deterministically resolve the session for the user we just signed in —
    // don't rely on the boot-time `ready()` promise (already resolved with a
    // null user), which would race the async onIdTokenChanged resolution and
    // intermittently report "no role" / hang before the session settles.
    const session = await this.appState.refreshSession();
    if (!session) {
      // No role claim, doc missing, or is_active=false — already signed out.
      throw new AuthError(
        'no_role',
        'บัญชีนี้ยังไม่ได้ตั้งสิทธิ์การใช้งาน กรุณาติดต่อแอดมิน'
      );
    }
  }

  logout(): Promise<void> {
    return this.appState.logout();
  }

  /**
   * เปลี่ยนรหัสผ่านตัวเอง — reauthenticate ด้วยรหัสเดิม (ต้องรู้รหัสปัจจุบัน)
   * แล้ว updatePassword. ทำฝั่ง client ทั้งหมด (ไม่มี BE callable).
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = auth.currentUser;
    if (!user?.email) throw new AuthError('unknown', 'ยังไม่ได้เข้าสู่ระบบ');
    if (!newPassword || newPassword.length < 8) {
      throw new AuthError('invalid_credentials', 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัว');
    }
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
    } catch (e: unknown) {
      const code = (e as { code?: string } | null)?.code ?? '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        throw new AuthError('invalid_credentials', 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
      }
      if (code === 'auth/weak-password') {
        throw new AuthError('invalid_credentials', 'รหัสผ่านใหม่อ่อนเกินไป');
      }
      throw this.mapFirebaseError(e);
    }
  }

  private mapFirebaseError(e: unknown): AuthError {
    const code = (e as { code?: string } | null)?.code ?? '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-email':
        return new AuthError('invalid_credentials', 'username หรือ password ไม่ถูกต้อง');
      case 'auth/user-disabled':
        return new AuthError('disabled', 'บัญชีนี้ถูกระงับการใช้งาน');
      case 'auth/network-request-failed':
        return new AuthError('network', 'เครือข่ายขัดข้อง กรุณาลองอีกครั้ง');
      case 'auth/too-many-requests':
        return new AuthError('invalid_credentials', 'ลองผิดหลายครั้งเกินไป กรุณารอสักครู่');
      default:
        return new AuthError('unknown', 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
    }
  }
}
