import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Role, ROLES } from 'src/app/core/models/session';
import { ModalController } from 'src/app/services/modal.service';
import { AdminUser, UserAdminError, UsersService } from 'src/app/services/users.service';
import { ButtonComponent } from 'src/app/shared/components/button.component';
import { FieldComponent } from 'src/app/shared/components/field.component';

@Component({
  standalone: true,
  selector: 'app-user-change-role-modal',
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, FieldComponent],
  template: `
    <div class="bg-white border-2 border-ink rounded-lg p-5 md:p-6 w-full">
      <header class="flex items-center justify-between mb-4">
        <h3 class="text-h2 m-0">เปลี่ยนสิทธิ์</h3>
        <button
          type="button"
          (click)="cancel()"
          class="w-8 h-8 border-2 border-ink rounded-md bg-white hover:bg-surface-2 cursor-pointer text-base font-extrabold"
          aria-label="ปิด"
        >×</button>
      </header>

      <p class="text-body text-ink-2 mb-4">
        <strong>{{ user?.display_name }}</strong>
        <span class="text-ink-3">({{ user?.username }})</span>
      </p>

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <app-field label="สิทธิ์ใหม่ · NEW ROLE" [required]="true">
          <select
            formControlName="role"
            class="input-brutal focus-ring w-full text-[15px] font-semibold bg-white"
          >
            <option *ngFor="let r of roles" [value]="r">{{ roleLabel(r) }}</option>
          </select>
        </app-field>

        <p class="text-body-sm text-ink-3 mt-2">
          การเปลี่ยน role จะบังคับผู้ใช้คนนี้ออกจากระบบ และต้องเข้าสู่ระบบใหม่
        </p>

        <p
          *ngIf="errorMessage"
          class="mt-3 text-[13px] font-semibold text-red-700 bg-red-50 border-2 border-red-700 rounded-md px-3 py-2"
          role="alert"
        >{{ errorMessage }}</p>

        <div class="flex justify-end gap-2 mt-5">
          <app-button variant="ghost" size="md" type="button" (clicked)="cancel()">ยกเลิก</app-button>
          <app-button variant="primary" size="md" type="submit" [disabled]="form.invalid || submitting || sameAsCurrent">
            {{ submitting ? 'กำลังบันทึก…' : 'เปลี่ยนสิทธิ์' }}
          </app-button>
        </div>
      </form>
    </div>
  `,
})
export class UserChangeRoleModalComponent implements OnInit {
  @Input() user!: AdminUser;

  form!: FormGroup;
  submitting = false;
  errorMessage = '';
  readonly roles: readonly Role[] = ROLES;

  constructor(
    private fb: FormBuilder,
    private modal: ModalController,
    private users: UsersService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      role: [this.user?.role ?? 'seller', Validators.required],
    });
  }

  get sameAsCurrent(): boolean {
    return this.form?.value.role === this.user?.role;
  }

  roleLabel(r: Role): string {
    return {
      seller: 'พนักงานขาย (seller)',
      graphic: 'กราฟิก (graphic)',
      production: 'ผลิต (production)',
      admin: 'แอดมิน (admin)',
      finance: 'การเงิน (finance)',
    }[r];
  }

  cancel() { this.modal.dismiss(null, 'cancel'); }

  async submit() {
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;
    this.errorMessage = '';
    try {
      await this.users.setUserRole(this.user.uid, this.form.value.role);
      this.modal.dismiss({ role: this.form.value.role }, 'confirm');
    } catch (e: unknown) {
      this.errorMessage =
        e instanceof UserAdminError ? e.message : 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง';
    } finally {
      this.submitting = false;
    }
  }
}
