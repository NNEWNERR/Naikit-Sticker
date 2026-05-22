import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { LoginComponent } from './login.component';
import { ButtonComponent, FieldComponent, IconComponent } from '../../shared/components';
import { FirestoreService } from '../../services/firestore.service';
import { ServiceService } from '../../services/service.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  // Stubs — login form rendering does not need real Firestore / Ionic services
  const firestoreStub = {
    signInWithUsernameAndPassword: () => Promise.resolve([]),
    CheckUserOnSite: () => Promise.resolve([]),
  };
  const serviceStub = {
    presentLoadingWithOutTime: () => Promise.resolve(),
    dismissLoading: () => Promise.resolve(),
    showAlert: () => {},
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [
        IonicModule.forRoot(),
        ReactiveFormsModule,
        FormsModule,
        ButtonComponent,
        FieldComponent,
        IconComponent,
      ],
      providers: [
        { provide: FirestoreService, useValue: firestoreStub },
        { provide: ServiceService, useValue: serviceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('defaults to password mode', () => {
    expect(component.mode).toBe('password');
  });

  it('switchMode(phone) flips mode and preserves OTP state cleared', () => {
    component.switchMode('phone');
    expect(component.mode).toBe('phone');
    expect(component.has_user).toBe(false);
  });
});
