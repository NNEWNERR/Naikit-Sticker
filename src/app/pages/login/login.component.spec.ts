import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';

import { LoginComponent } from './login.component';
import { ButtonComponent, FieldComponent, IconComponent } from '../../shared/components';
import { AuthService } from '../../services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  const authStub: Pick<AuthService, 'signIn' | 'logout'> = {
    signIn: () => Promise.resolve(),
    logout: () => Promise.resolve(),
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [
        RouterTestingModule,
        ReactiveFormsModule,
        FormsModule,
        ButtonComponent,
        FieldComponent,
        IconComponent,
      ],
      providers: [
        { provide: AuthService, useValue: authStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts with an empty form and submitting=false', () => {
    expect(component.form.invalid).toBe(true);
    expect(component.submitting).toBe(false);
    expect(component.errorMessage).toBe('');
  });
});
