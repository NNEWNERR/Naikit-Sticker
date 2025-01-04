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
    const isLogedIn = await this.authService.SessionIsLogedIn();
    if (!isLogedIn == true) {
      this.authService.signInAnonymously();
      return true;
    }
    else {
      this.router.navigate(['/krungthon/home']);
      return false;
    }
  }
}

