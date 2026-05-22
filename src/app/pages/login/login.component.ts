import { Component, OnInit } from "@angular/core";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { sendOTPverify, sendOTPverifyFail, InvalidOTP } from "src/app/common/constant/alert-messages";
import { auth } from "src/app/services/firebase-config";
import { FirestoreService } from "src/app/services/firestore.service";
import { ServiceService } from "src/app/services/service.service";
import { Session, SESSION_STORAGE_KEY } from "src/app/interfaces/session.interface";

type LoginMode = 'password' | 'phone';

/**
 * Login screen (neo-brutalist redesign).
 *
 * Security posture (do NOT regress — covered by parseSession contract):
 *  - localStorage write shape is ONLY { username, phone, role, doc_id }
 *  - NEVER persist the password
 *  - NEVER persist a Firebase access token (fbUser.accessToken)
 *  - Stays NgModule-declared via PagesModule; shared standalone primitives
 *    (ButtonComponent, FieldComponent, IconComponent) are added to
 *    PagesModule.imports so the inline-imports pattern is unchanged.
 *
 * UI state (cosmetic only):
 *  - mode: which credential form to show ('password' default, 'phone' = OTP)
 *  - showPw: toggles password visibility
 *  - remember: checkbox UI only — current auth keeps the session as long as
 *    localStorage is intact; "remember me" simply mirrors the prototype.
 *    (Future hook point: switch to sessionStorage when !remember.)
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  form: FormGroup;
  formPhone: FormGroup;
  formOTP: FormGroup;
  has_user: boolean = false;
  confirmationResult: any;

  // ── UI-only state ─────────────────────────────────────────────
  mode: LoginMode = 'password';
  showPw: boolean = false;
  remember: boolean = true;

  constructor(
    private firestoreService: FirestoreService,
    private service: ServiceService,
    private formBuilder: FormBuilder
  ) { }

  async ngOnInit() {
    this.initForm();
  }

  initForm() {
    this.formPhone = this.formBuilder.group({
      phone: ['', Validators.required]
    });
    this.formOTP = this.formBuilder.group({
      otp: ['', Validators.required]
    });
    this.form = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  switchMode(next: LoginMode) {
    this.mode = next;
    // Reset transient OTP state when leaving phone mode so the user can't
    // accidentally land on the OTP-verify form with a stale confirmationResult.
    if (next === 'password') {
      this.has_user = false;
      this.confirmationResult = null;
      this.formOTP.reset();
    }
  }

  resetPhoneFlow() {
    // Step back from OTP-verify to phone-entry within the phone mode.
    this.has_user = false;
    this.confirmationResult = null;
    this.formOTP.reset();
  }

  submitPhone() {
    this.LoginWithPhone(this.formPhone.value.phone);
  }

  signIn() {
    this.firestoreService.signInWithUsernameAndPassword(this.form.value.username, this.form.value.password).then((data: any) => {
      if (data.length > 0) {
        const user = data[0];
        // Store ONLY a safe Session shape. Never persist the password or
        // a Firebase access token in localStorage.
        const session: Session = {
          username: user.username ?? '',
          phone: user.phone ?? '',
          role: user.role,
          doc_id: user.doc_id,
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        window.location.reload();
      }
    });
  }

  submitOTP() {
    this.confirmOTP(this.formOTP.value.otp);
  }

  LoginWithPhone(phone: string) {
    this.service.presentLoadingWithOutTime("waiting...");
    this.firestoreService.CheckUserOnSite(phone).then((data: any) => {
      this.service.dismissLoading();
      if (data.length > 0) {
        const { header, message } = sendOTPverify(phone);
        this.service.showAlert(header, message, () => {
          this.signInWithPhoneNumber(phone);
        }, { confirmOnly: false });
      }
    });
  }

  async signInWithPhoneNumber(phone: any) {
    this.service.presentLoadingWithOutTime("waiting...");
    const verifier = new RecaptchaVerifier(auth, 'sign-in-button', {
      size: 'invisible',
      callback: () => {
        this.onSignInSubmit();
      }
    });
    let tel = "+66" + phone.replace(/\D[^.]/g, '').slice(1);
    signInWithPhoneNumber(auth, tel, verifier)
      .then((confirmationResult) => {
        this.confirmationResult = confirmationResult;
        this.has_user = true;
        this.service.dismissLoading();
      }).catch((error) => {
        const { header, message } = sendOTPverifyFail();
        this.service.showAlert(header, message, () => { }, { confirmOnly: true });
        this.service.dismissLoading();
      });
  }

  onSignInSubmit() {
    // Code to submit the verification code entered by the user
  }

  confirmOTP(otp: string) {
    this.service.presentLoadingWithOutTime("waiting...");
    this.confirmationResult.confirm(otp).then(async (result: any) => {
      const fbUser = result.user;
      // Resolve the local user record so the session has username/role/doc_id
      // (Firebase phone-auth result only has phoneNumber + access token).
      const phone = this.formPhone.value.phone;
      const users: any[] = await this.firestoreService.CheckUserOnSite(phone);
      const u = users && users.length > 0 ? users[0] : {};
      const session: Session = {
        username: u.username ?? '',
        phone: phone ?? fbUser.phoneNumber ?? '',
        role: u.role,
        doc_id: u.key ?? u.doc_id,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      window.location.reload();
      this.service.dismissLoading();
    }).catch((error: any) => {
      this.service.dismissLoading();
      const { header, message } = InvalidOTP();
      this.service.showAlert(header, message, () => { }, { confirmOnly: true });
    });
  }
}
