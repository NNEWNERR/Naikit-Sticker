import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { ModalController } from 'src/app/services/modal.service';
import { AppStateService } from 'src/app/services/app-state.service';
import { AdminUser, UserAdminError, UsersService } from 'src/app/services/users.service';
import { Role } from 'src/app/core/models/session';
import { ServiceService } from 'src/app/services/service.service';
import { UserCreateModalComponent } from 'src/app/components/modals/user-admin/user-create.modal';
import { UserChangeRoleModalComponent } from 'src/app/components/modals/user-admin/user-change-role.modal';
import { UserResetPasswordModalComponent } from 'src/app/components/modals/user-admin/user-reset-password.modal';

const ROLE_LABEL: Record<Role, string> = {
  seller: 'พนักงานขาย',
  graphic: 'กราฟิก',
  production: 'ผลิต',
  admin: 'แอดมิน',
  finance: 'การเงิน',
  stock: 'สต๊อก',
};

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss'],
})
export class UserComponent implements OnInit, OnDestroy {
  private searchTerm = signal<string>('');

  readonly users = this.usersService.users;
  readonly isLoading = this.usersService.loading;

  /** Filtered list = users() ∩ matches(searchTerm). */
  readonly results = computed<AdminUser[]>(() => {
    const q = this.searchTerm().trim().toLowerCase();
    const all = this.users();
    if (!q) return all;
    return all.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.display_name.toLowerCase().includes(q),
    );
  });

  private detachListener: (() => void) | null = null;

  constructor(
    private usersService: UsersService,
    private modalController: ModalController,
    private appState: AppStateService,
    private service: ServiceService,
  ) {}

  ngOnInit() {
    this.detachListener = this.usersService.attachListener();
  }

  ngOnDestroy() {
    this.detachListener?.();
  }

  // ── UI helpers ──────────────────────────────────────────────────────────

  roleLabel(r: Role): string {
    return ROLE_LABEL[r] ?? r;
  }

  /** Tailwind tones per role for the badge pill. */
  roleBadgeClass(r: Role): string {
    switch (r) {
      case 'admin':      return 'bg-ink text-brand border-ink';
      case 'seller':     return 'bg-brand text-ink border-ink';
      case 'graphic':    return 'bg-blue-100 text-blue-900 border-blue-900';
      case 'production': return 'bg-green-100 text-green-900 border-green-900';
      case 'finance':    return 'bg-amber-100 text-amber-900 border-amber-900';
      case 'stock':      return 'bg-purple-100 text-purple-900 border-purple-900';
      default:           return 'bg-surface-2 text-ink border-ink';
    }
  }

  isSelf(u: AdminUser): boolean {
    return this.appState.uid() === u.uid;
  }

  handleInput(query: string) {
    this.searchTerm.set(query ?? '');
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  add() {
    this.modalController.create({
      component: UserCreateModalComponent,
    }).then((modal) => modal.present());
  }

  changeRole(u: AdminUser) {
    if (this.isSelf(u)) {
      this.warnSelfBlocked('แอดมินไม่สามารถเปลี่ยนสิทธิ์ของบัญชีตัวเองได้');
      return;
    }
    this.modalController.create({
      component: UserChangeRoleModalComponent,
      componentProps: { user: u },
    }).then((modal) => modal.present());
  }

  resetPassword(u: AdminUser) {
    this.modalController.create({
      component: UserResetPasswordModalComponent,
      componentProps: { user: u },
    }).then((modal) => modal.present());
  }

  async toggleActive(u: AdminUser) {
    if (this.isSelf(u) && u.is_active) {
      this.warnSelfBlocked('ปิดบัญชีของตัวเองไม่ได้');
      return;
    }
    const next = !u.is_active;
    const verb = next ? 'เปิดใช้งาน' : 'ปิดใช้งาน';
    this.service.showAlert(
      `${verb}บัญชี`,
      `ยืนยัน${verb}บัญชี "${u.display_name}" (${u.username}) หรือไม่?`,
      async () => {
        try {
          await this.usersService.setUserActive(u.uid, next);
        } catch (e: unknown) {
          const msg =
            e instanceof UserAdminError ? e.message : 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง';
          this.service.showAlert('ผิดพลาด', msg, () => {}, { confirmOnly: true });
        }
      },
      { confirmOnly: false },
    );
  }

  private warnSelfBlocked(msg: string) {
    this.service.showAlert('ไม่อนุญาต', msg, () => {}, { confirmOnly: true });
  }
}
