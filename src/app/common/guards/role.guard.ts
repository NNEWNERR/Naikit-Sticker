import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from 'src/app/core/models/session';
import { AppStateService } from 'src/app/services/app-state.service';

/**
 * Factory: returns a CanActivateFn that allows access only when the active
 * session has one of `allowed` roles. Unauthenticated → /login. Wrong role →
 * /naikit-sticker/home (the only route guaranteed to be reachable by every
 * authenticated role).
 */
export function roleGuard(allowed: Role[]): CanActivateFn {
  return async () => {
    const appState = inject(AppStateService);
    const router = inject(Router);
    await appState.ready();
    if (!appState.isLoggedIn()) {
      router.navigate(['/login']);
      return false;
    }
    const role = appState.role();
    if (!role || !allowed.includes(role)) {
      router.navigate(['/naikit-sticker/home']);
      return false;
    }
    return true;
  };
}
