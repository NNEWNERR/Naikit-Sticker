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
    if (isLogedIn == true) {
      return true;
    }
    else {
      localStorage.removeItem('token');
      this.router.navigate(['/login']);
      return false;
    }
  }
}
