// import { AuthService } from './../services/auth.service';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(
    private readonly router: Router,
    private authService: AuthService,

  ) { }
  async canActivate() {
    const isLogedIn = await this.authService.SessionIsLogedIn();
    if (!isLogedIn) {
      this.router.navigate(['/login']);
      return false;
    }
    // Shape-check the stored session. A bare existence check on `token` is not
    // enough — historically it could be a Firebase access-token string or the
    // full user document. Anything that doesn't parse to a valid Session is
    // treated as logged-out (helper clears localStorage on parse failure).
    const session = this.authService.getValidSession();
    if (!session) {
      this.router.navigate(['/login']);
      return false;
    }
    return true;
  }
}
