import { Component, OnInit } from "@angular/core";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthError, AuthService } from "src/app/services/auth.service";

/**
 * Login screen — Firebase Auth (Phase 1.3).
 *
 * UI: username + password only. Phone/OTP path was removed alongside the
 * Firestore plain-text auth — the new model is Firebase Auth with custom
 * claims; admin provisions accounts via Cloud Functions.
 *
 * No localStorage writes here. AppStateService owns session state and
 * populates from `onIdTokenChanged` once `signInWithEmailAndPassword`
 * resolves.
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  form!: FormGroup;
  showPw = false;
  submitting = false;
  errorMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.form = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  async signIn() {
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;
    this.errorMessage = '';
    try {
      await this.authService.signIn(
        this.form.value.username,
        this.form.value.password,
      );
      this.router.navigate(['/naikit-sticker/home']);
    } catch (e: unknown) {
      this.errorMessage =
        e instanceof AuthError ? e.message : 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง';
    } finally {
      this.submitting = false;
    }
  }
}
