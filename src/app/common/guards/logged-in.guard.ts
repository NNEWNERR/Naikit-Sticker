import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppStateService } from 'src/app/services/app-state.service';

/**
 * Guard for /login — if a session is already active, bounce to home so the
 * user can't see the login form while signed in.
 */
export const loggedInGuard: CanActivateFn = async () => {
  const appState = inject(AppStateService);
  const router = inject(Router);
  await appState.ready();
  if (appState.isLoggedIn()) {
    router.navigate(['/naikit-sticker/home']);
    return false;
  }
  return true;
};
