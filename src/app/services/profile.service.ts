/**
 * ProfileService — self-service โปรไฟล์ (display_name + avatar).
 * รหัสผ่านเปลี่ยนผ่าน AuthService.changePassword (client reauth) แยกต่างหาก.
 */
import { Injectable, inject } from '@angular/core';
import { FunctionsError, httpsCallable } from 'firebase/functions';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { functions, storage } from './firebase-config';
import { AppStateService } from './app-state.service';

const AVATAR_SIZE = 256;
const MAX_BYTES = 2 * 1024 * 1024;

export class ProfileError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private appState = inject(AppStateService);

  /** แก้ display_name และ/หรือ avatar_url (null = ลบรูป). คืน session ที่ refresh แล้ว. */
  async updateMyProfile(patch: { display_name?: string; avatar_url?: string | null }): Promise<void> {
    try {
      const fn = httpsCallable(functions, 'updateMyProfile');
      await fn(patch);
    } catch (e) {
      const fe = e as FunctionsError;
      throw new ProfileError(fe?.code ?? 'unknown', fe?.message || 'บันทึกโปรไฟล์ไม่สำเร็จ');
    }
    await this.appState.refreshSession(); // อัปเดต topbar/avatar ทันที
  }

  /** resize เป็นสี่เหลี่ยม 256px (cover) → อัป storage users/{uid}/avatar → URL */
  async uploadAvatar(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) throw new ProfileError('invalid', 'ต้องเป็นไฟล์รูปภาพ');
    if (file.size > MAX_BYTES) throw new ProfileError('invalid', 'รูปต้องไม่เกิน 2MB');
    const uid = this.appState.uid();
    if (!uid) throw new ProfileError('unauth', 'ยังไม่ได้เข้าสู่ระบบ');

    const blob = await this.resizeSquare(file, AVATAR_SIZE);
    const path = `users/${uid}/avatar/${crypto.randomUUID()}.jpg`;
    const r = storageRef(storage, path);
    await uploadBytes(r, blob, { contentType: 'image/jpeg' });
    return getDownloadURL(r);
  }

  private resizeSquare(file: File, size: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new ProfileError('canvas', 'ประมวลผลรูปไม่สำเร็จ')); return; }
        // cover crop — ตัดให้เต็มจัตุรัสกลางภาพ
        const s = Math.min(img.width, img.height);
        const sx = (img.width - s) / 2;
        const sy = (img.height - s) / 2;
        ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
        canvas.toBlob((b) => b ? resolve(b) : reject(new ProfileError('canvas', 'แปลงรูปไม่สำเร็จ')), 'image/jpeg', 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new ProfileError('img', 'เปิดรูปไม่สำเร็จ')); };
      img.src = url;
    });
  }
}
