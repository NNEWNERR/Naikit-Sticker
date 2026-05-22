import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
// import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class LoggedInGuard {
  constructor(
    private readonly router: Router,
    private authService: AuthService,

  ) { }
  async canActivate() {
    // Guards the /login route: if a valid session already exists, bounce the
    // user to /home. If not, allow access to the login page.
    //
    // NOTE: the previous implementation called `signInAnonymously()` on every
    // visit to /login, which created orphan anonymous Firebase Auth users on
    // every page hit. The OTP flow constructs its own RecaptchaVerifier and
    // doesn't depend on an existing anonymous session, so the call was both
    // unused and harmful. Removed intentionally.
    const isLogedIn = await this.authService.SessionIsLogedIn();
    if (!isLogedIn) {
      return true;
    }
    const session = this.authService.getValidSession();
    if (!session) {
      // Stale token (helper already purged it) — let the user reach /login.
      return true;
    }
    this.router.navigate(['/naikit-sticker/home']);
    return false;
  }
}

