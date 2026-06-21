import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Role, ROLES } from 'src/app/core/models/session';
import { ModalController } from 'src/app/services/modal.service';
import { UserAdminError, UsersService } from 'src/app/services/users.service';
import { ButtonComponent } from 'src/app/shared/components/button.component';
import { FieldComponent } from 'src/app/shared/components/field.component';

// Mirrors BE validation (Naikit-Sticker-BE/functions/src/admin.ts).
const USERNAME_RE = /^[a-z0-9_]{3,32}$/;
const MIN_PASSWORD = 8;

@Component({
  standalone: true,
  selector: 'app-user-create-modal',
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, FieldComponent],
  template: `
    <div class="bg-white border-2 border-ink rounded-lg p-5 md:p-6 w-full">
      <header class="flex items-center justify-between mb-5">
        <h3 class="text-h2 m-0">เพิ่มผู้ใช้งานใหม่</h3>
        <button
          type="button"
          (click)="cancel()"
          class="w-8 h-8 border-2 border-ink rounded-md bg-white hover:bg-surface-2 cursor-pointer text-base font-extrabold"
          aria-label="ปิด"
        >×</button>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <app-field label="USERNAME" [required]="true" hint="a-z, 0-9, _ ความยาว 3-32 ตัว">
          <input
            type="text"
            formControlName="username"
            placeholder="เช่น fluk_seller"
            autocomplete="off"
            autocapitalize="none"
            autocorrect="off"
            class="input-brutal focus-ring w-full text-[15px] font-semibold"
          />
        </app-field>

        <div class="h-3"></div>

        <app-field label="ชื่อที่แสดง · DISPLAY NAME" [required]="true">
          <input
            type="text"
            formControlName="display_name"
            placeholder="เช่น ฟลุ๊ค"
            class="input-brutal focus-ring w-full text-[15px] font-semibold"
          />
        </app-field>

        <div class="h-3"></div>

        <app-field label="PASSWORD" [required]="true" hint="อย่างน้อย 8 ตัว">
          <div class="input-brutal focus-ring flex items-center gap-2.5">
            <input
              [type]="showPw ? 'text' : 'password'"
              formControlName="password"
              placeholder="ระบุรหัสผ่าน"
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

        <div class="h-3"></div>

        <app-field label="สิทธิ์ · ROLE" [required]="true">
          <select
            formControlName="role"
            class="input-brutal focus-ring w-full text-[15px] font-semibold bg-white"
          >
            <option *ngFor="let r of roles" [value]="r">{{ roleLabel(r) }}</option>
          </select>
        </app-field>

        <p
          *ngIf="errorMessage"
          class="mt-3 text-[13px] font-semibold text-red-700 bg-red-50 border-2 border-red-700 rounded-md px-3 py-2"
          role="alert"
        >{{ errorMessage }}</p>

        <div class="flex justify-end gap-2 mt-5">
          <app-button variant="ghost" size="md" type="button" (clicked)="cancel()">ยกเลิก</app-button>
          <app-button variant="primary" size="md" type="submit" [disabled]="form.invalid || submitting">
            {{ submitting ? 'กำลังบันทึก…' : 'เพิ่มผู้ใช้' }}
          </app-button>
        </div>
      </form>
    </div>
  `,
})
export class UserCreateModalComponent implements OnInit {
  form!: FormGroup;
  showPw = false;
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
      username: ['', [Validators.required, Validators.pattern(USERNAME_RE)]],
      display_name: ['', [Validators.required, Validators.maxLength(64)]],
      password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD)]],
      role: ['seller', Validators.required],
    });
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
      const v = this.form.value;
      await this.users.createUser({
        username: String(v.username).trim().toLowerCase(),
        display_name: String(v.display_name).trim(),
        password: v.password,
        role: v.role,
      });
      this.modal.dismiss({ created: true }, 'confirm');
    } catch (e: unknown) {
      this.errorMessage =
        e instanceof UserAdminError ? e.message : 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง';
    } finally {
      this.submitting = false;
    }
  }
}
