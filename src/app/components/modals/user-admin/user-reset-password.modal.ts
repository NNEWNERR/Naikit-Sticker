import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalController } from 'src/app/services/modal.service';
import { AdminUser, UserAdminError, UsersService } from 'src/app/services/users.service';
import { ButtonComponent } from 'src/app/shared/components/button.component';
import { FieldComponent } from 'src/app/shared/components/field.component';

const MIN_PASSWORD = 8;

@Component({
  standalone: true,
  selector: 'app-user-reset-password-modal',
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, FieldComponent],
  template: `
    <div class="bg-white border-2 border-ink rounded-lg p-5 md:p-6 w-full">
      <header class="flex items-center justify-between mb-4">
        <h3 class="text-h2 m-0">ตั้งรหัสผ่านใหม่</h3>
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
        <app-field label="รหัสผ่านใหม่ · NEW PASSWORD" [required]="true" hint="อย่างน้อย 8 ตัว">
          <div class="input-brutal focus-ring flex items-center gap-2.5">
            <input
              [type]="showPw ? 'text' : 'password'"
              formControlName="password"
              placeholder="ระบุรหัสผ่านใหม่"
              autocomplete="new-password"
              class="flex-1 bg-transparent border-0 outline-none text-[15px] font-semibold tracking-wider"
            />
            <button
              type="button"
              (click)="showPw = !showPw"
              class="text-[11px] font-extrabold text-ink-3 tracking-[0.1em] cursor-pointer bg-transparent border-0"
            >{{ showPw ? 'HIDE' : 'SHOW' }}</button>
          </div>
        </app-field>

        <p class="text-body-sm text-ink-3 mt-2">
          ผู้ใช้คนนี้จะถูกบังคับให้ออกจากระบบทุกอุปกรณ์ และต้องเข้าสู่ระบบใหม่ด้วยรหัสนี้
        </p>

        <p
          *ngIf="errorMessage"
          class="mt-3 text-[13px] font-semibold text-red-700 bg-red-50 border-2 border-red-700 rounded-md px-3 py-2"
          role="alert"
        >{{ errorMessage }}</p>

        <div class="flex justify-end gap-2 mt-5">
          <app-button variant="ghost" size="md" type="button" (clicked)="cancel()">ยกเลิก</app-button>
          <app-button variant="primary" size="md" type="submit" [disabled]="form.invalid || submitting">
            {{ submitting ? 'กำลังบันทึก…' : 'ตั้งรหัสผ่าน' }}
          </app-button>
        </div>
      </form>
    </div>
  `,
})
export class UserResetPasswordModalComponent implements OnInit {
  @Input() user!: AdminUser;

  form!: FormGroup;
  showPw = false;
  submitting = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private modal: ModalController,
    private users: UsersService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD)]],
    });
  }

  cancel() { this.modal.dismiss(null, 'cancel'); }

  async submit() {
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;
    this.errorMessage = '';
    try {
      await this.users.resetPassword(this.user.uid, this.form.value.password);
      this.modal.dismiss({ reset: true }, 'confirm');
    } catch (e: unknown) {
      this.errorMessage =
        e instanceof UserAdminError ? e.message : 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง';
    } finally {
      this.submitting = false;
    }
  }
}
