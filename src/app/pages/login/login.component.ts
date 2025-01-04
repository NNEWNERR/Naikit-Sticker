import { Component, OnInit } from "@angular/core";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
// import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { sendOTPverify, sendOTPverifyFail, InvalidOTP } from "src/app/common/constant/alert-messages";
import { auth } from "src/app/services/firebase-config";
// import { auth } from "src/app/services/firebase-config";
import { FirestoreService } from "src/app/services/firestore.service";
import { ServiceService } from "src/app/services/service.service";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  formPhone: FormGroup;
  formOTP: FormGroup;
  has_user: boolean = false;
  confirmationResult: any;
  // phone: string = '';
  // is_request: boolean = false;
  // otp: string = '';
  // site_id: string;
  constructor(
    private firestoreService: FirestoreService,
    private service: ServiceService,
    private formBuilder: FormBuilder
  ) { }

  async ngOnInit() {
    this.initForm()
  }
  initForm() {
    this.formPhone = this.formBuilder.group({
      phone: ['', Validators.required]
    })
    this.formOTP = this.formBuilder.group({
      otp: ['', Validators.required]
    })
  }

  submitPhone() {
    this.LoginWithPhone(this.formPhone.value.phone);
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
        this.service.showAlert(header, message, () => { }, { confirmOnly: true })
        this.service.dismissLoading();
      });
  }

  onSignInSubmit() {
    // Code to submit the verification code entered by the user
  }

  confirmOTP(otp: string) {
    this.service.presentLoadingWithOutTime("waiting...");
    this.confirmationResult.confirm(otp).then(async (result: any) => {
      const user = result.user;
      localStorage.setItem('token', user.accessToken);
      window.location.reload();
      this.service.dismissLoading();
    }).catch((error: any) => {
      this.service.dismissLoading();
      const { header, message } = InvalidOTP();
      this.service.showAlert(header, message, () => { }, { confirmOnly: true })
    });
  }
}
