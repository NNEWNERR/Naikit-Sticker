import { TestBed } from '@angular/core/testing';

import { AuthError, AuthService } from './auth.service';
import { AppStateService } from './app-state.service';

describe('AuthService', () => {
  const appStateStub: Pick<AppStateService, 'ready' | 'isLoggedIn' | 'logout'> = {
    ready: () => Promise.resolve(),
    isLoggedIn: () => false,
    logout: () => Promise.resolve(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AppStateService, useValue: appStateStub },
      ],
    });
  });

  it('rejects empty credentials with invalid_credentials', async () => {
    const service = TestBed.inject(AuthService);
    await expectAsync(service.signIn('', '')).toBeRejectedWith(
      jasmine.any(AuthError) as unknown as AuthError,
    );
  });
});
