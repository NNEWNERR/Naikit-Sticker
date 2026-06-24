import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppStateService } from 'src/app/services/app-state.service';
import { ProfileService } from 'src/app/services/profile.service';
import { AuthService } from 'src/app/services/auth.service';
import { PageHeaderComponent } from 'src/app/shared/components';

const ROLE_LABELS: Record<string, string> = {
  seller: 'ฝ่ายขาย', graphic: 'กราฟิก', production: 'ฝ่ายผลิต', admin: 'แอดมิน', finance: 'การเงิน',
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  private appState = inject(AppStateService);
  private profileSvc = inject(ProfileService);
  private authSvc = inject(AuthService);

  // ── identity (read-only) ──
  username = computed(() => this.appState.session()?.username ?? '');
  role = computed(() => this.appState.session()?.role ?? '');
  roleLabel = computed(() => ROLE_LABELS[this.role()] ?? this.role());
  sessionAvatar = computed(() => this.appState.avatarUrl());
  sessionName = computed(() => this.appState.displayName());

  // ── profile form ──
  displayName = '';
  private avatarFile: File | null = null;
  avatarPreview = signal<string | null>(null);   // object URL ของรูปใหม่ที่ stage
  removeAvatar = signal(false);
  savingProfile = signal(false);
  profileError = signal('');
  profileOk = signal('');

  // ── password form ──
  curPw = ''; newPw = ''; confirmPw = '';
  savingPw = signal(false);
  pwError = signal('');
  pwOk = signal('');

  /** รูปที่จะแสดงในวงกลม: รูปใหม่ที่ stage → session avatar (เว้นแต่กดลบ) → null(initials) */
  shownAvatar = computed(() => this.avatarPreview() ?? (this.removeAvatar() ? null : this.sessionAvatar()));
  initial = computed(() => (this.sessionName() || '?').charAt(0).toUpperCase());

  ngOnInit() { this.displayName = this.sessionName(); }

  onAvatarFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0] ?? null;
    if (!file) return;
    this.avatarFile = file;
    this.removeAvatar.set(false);
    this.avatarPreview.set(URL.createObjectURL(file));
    this.profileError.set(''); this.profileOk.set('');
  }
  onRemoveAvatar() {
    this.avatarFile = null;
    this.avatarPreview.set(null);
    this.removeAvatar.set(true);
  }

  async saveProfile() {
    this.profileError.set(''); this.profileOk.set('');
    const name = this.displayName.trim();
    if (!name) { this.profileError.set('กรุณากรอกชื่อ'); return; }
    this.savingProfile.set(true);
    try {
      const patch: { display_name?: string; avatar_url?: string | null } = {};
      if (name !== this.sessionName()) patch.display_name = name;
      if (this.avatarFile) patch.avatar_url = await this.profileSvc.uploadAvatar(this.avatarFile);
      else if (this.removeAvatar()) patch.avatar_url = null;
      if (Object.keys(patch).length === 0) { this.profileOk.set('ไม่มีการเปลี่ยนแปลง'); return; }
      await this.profileSvc.updateMyProfile(patch);
      this.avatarFile = null; this.avatarPreview.set(null); this.removeAvatar.set(false);
      this.profileOk.set('บันทึกโปรไฟล์แล้ว');
    } catch (e) {
      this.profileError.set((e as Error).message || 'บันทึกไม่สำเร็จ');
    } finally {
      this.savingProfile.set(false);
    }
  }

  async changePassword() {
    this.pwError.set(''); this.pwOk.set('');
    if (!this.curPw) { this.pwError.set('กรอกรหัสผ่านปัจจุบัน'); return; }
    if (this.newPw.length < 8) { this.pwError.set('รหัสใหม่ต้องยาวอย่างน้อย 8 ตัว'); return; }
    if (this.newPw !== this.confirmPw) { this.pwError.set('รหัสใหม่กับยืนยันไม่ตรงกัน'); return; }
    this.savingPw.set(true);
    try {
      await this.authSvc.changePassword(this.curPw, this.newPw);
      this.curPw = ''; this.newPw = ''; this.confirmPw = '';
      this.pwOk.set('เปลี่ยนรหัสผ่านแล้ว');
    } catch (e) {
      this.pwError.set((e as Error).message || 'เปลี่ยนรหัสไม่สำเร็จ');
    } finally {
      this.savingPw.set(false);
    }
  }
}
