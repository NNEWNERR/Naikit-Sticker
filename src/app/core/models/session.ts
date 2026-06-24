/**
 * Session models — Phase 1.3 rebuild.
 *
 * Identity is Firebase Auth (uid + custom claim `role`); we DO NOT persist a
 * session blob in localStorage anymore. AppStateService owns the live session
 * and is the only source of truth for FE auth state.
 *
 * Keep in sync with:
 *   - SCHEMA.md (users/{uid} fields)
 *   - Naikit-Sticker-BE/functions/src/lib/types.ts (Role enum)
 */

export type Role = 'seller' | 'graphic' | 'production' | 'admin' | 'finance';

export const ROLES: readonly Role[] = ['seller', 'graphic', 'production', 'admin', 'finance'];

export function isRole(v: unknown): v is Role {
  return typeof v === 'string' && (ROLES as readonly string[]).includes(v);
}

/**
 * The active user as far as the FE is concerned. Mirrors the parts of
 * `users/{uid}` + the `role` custom claim that the UI needs at runtime.
 *
 * `is_active === false` means the admin disabled this account — guards
 * MUST force a signOut and reject navigation.
 */
export interface SessionUser {
  uid: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: Role;
  is_active: boolean;
}
