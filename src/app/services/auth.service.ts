import { Injectable } from '@angular/core';
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
// import {  auth } from 'src/config';
import { Router } from '@angular/router';
import { parseSession, Session, SESSION_STORAGE_KEY } from '../interfaces/session.interface';
import { auth } from './firebase-config';
import { ServiceService } from './service.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  userFormFirestore: any;
  userFormAuth: any;
  isLogedIn: boolean;
  constructor(private router: Router,
    private service: ServiceService,
  ) { }

  /**
   * Read + shape-check the stored session. If the stored value is missing or
   * fails shape validation (e.g. legacy raw access-token string left behind
   * from older auth code), the bad value is removed from localStorage and
   * null is returned. Callers should treat a null return as "not authed" and
   * redirect to /login.
   *
   * Centralizing this here so the guard and the layout component don't
   * diverge on what "valid session" means.
   */
  getValidSession(): Session | null {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    const session = parseSession(raw);
    if (!session) {
      if (raw !== null) {
        // Had something stored but it doesn't parse — purge it.
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
      return null;
    }
    return session;
  }

  SessionIsLogedIn(): Promise<boolean> {
    return new Promise((resolve) => {
      const isLogedIn = localStorage.getItem('token');
      if (isLogedIn) {
        // this.service.dismissLoading();
        resolve(true);
      } else {
        setTimeout(() => {
          this.service.dismissLoading();
        }, 1000);
        resolve(false);
      }
    });
  }
  async checkAuth(): Promise<boolean> {
    return new Promise(async (resolve) => {
      await onAuthStateChanged(auth, (user: any) => {
        if (user) {
          if (user.isAnonymous == false) {
            localStorage.setItem('token', user.accessToken);
            this.userFormAuth = user;
            resolve(true);
          } else {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      });
    });
  }
  confirmOTP(confirmationResult: any, otp: string): Promise<any> {
    return new Promise((resolve) => {
      confirmationResult.confirm(otp).then(async (result: any) => {
        this.userFormFirestore = result.user;
        resolve(this.userFormFirestore);
      }).catch((error: any) => {
        resolve(false);
      });
    }
    );
  }
  async signout() {
    await signOut(auth).then(() => {
      localStorage.removeItem('token');
      this.router.navigate(['/login']);
    }).catch((error) => {
      // // console.log(error);
    });
  }
  signInAnonymously() {
    signInAnonymously(auth).then(() => {
    }).catch((error) => {
    });
  }
  getUserFormFirestore() {
    return this.userFormFirestore;
  }
  getUserFormAuth() {
    return this.userFormAuth;
  }

}
