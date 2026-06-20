import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppStateService } from 'src/app/services/app-state.service';

/**
 * Guard for routes that require a logged-in user. Waits for the initial
 * Firebase Auth restore (AppStateService.ready) so we don't flash /login
 * before the SDK rehydrates the session.
 */
export const authGuard: CanActivateFn = async () => {
  const appState = inject(AppStateService);
  const router = inject(Router);
  await appState.ready();
  if (!appState.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};
