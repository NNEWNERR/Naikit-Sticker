// Session stored in localStorage under key "token".
// NOTE: This is the temporary custom-auth shape used while A1 (Firebase Auth
// migration) is deferred. Once real auth lands, this should be replaced by
// a Firebase ID token + decoded claims and the localStorage key renamed.
export interface Session {
  username: string;
  phone: string;
  role?: string;
  doc_id?: string;
}

export const SESSION_STORAGE_KEY = 'token';

/**
 * Parse and validate a session string from localStorage.
 * Returns null if the string is missing, unparseable, or fails shape checks.
 */
export function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return null;
    // Accept either a username or a phone (phone-only OTP login is still possible)
    const hasUsername = typeof obj.username === 'string' && obj.username.length > 0;
    const hasPhone = typeof obj.phone === 'string' && obj.phone.length > 0;
    if (!hasUsername && !hasPhone) return null;
    return {
      username: hasUsername ? obj.username : '',
      phone: hasPhone ? obj.phone : '',
      role: typeof obj.role === 'string' ? obj.role : undefined,
      doc_id: typeof obj.doc_id === 'string' ? obj.doc_id : undefined,
    };
  } catch {
    return null;
  }
}
