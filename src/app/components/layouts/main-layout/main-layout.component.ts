import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { signOut } from 'src/app/common/constant/alert-messages';
import { AuthService } from 'src/app/services/auth.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { ServiceService } from 'src/app/services/service.service';
import { NavItem } from 'src/app/shared/chrome';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
})
export class MainLayoutComponent implements OnInit {
  /**
   * Sidebar nav — sectioned by `section` (WORKFLOW / SYSTEM), matching the
   * prototype's ProtoSidebar grouping. Routes preserved verbatim from the
   * previous Ionic menu (see app-routing.module.ts).
   *
   * Emoji icons match the prototype 1:1; SVG icon names are also accepted by
   * <app-sidebar> if we choose to migrate later (see icon.component.ts).
   */
  navItems: NavItem[] = [
    { key: 'home', label: 'หน้าหลัก', icon: '📋', routerLink: '/naikit-sticker/home', section: 'WORKFLOW' },
    { key: 'create', label: 'สร้างใบงาน', icon: '➕', routerLink: '/naikit-sticker/create-work-sheet', section: 'WORKFLOW' },
    { key: 'all', label: 'งานทั้งหมด', icon: '📊', routerLink: '/naikit-sticker/all', section: 'WORKFLOW' },
    { key: 'diary', label: 'สรุปงานรายวัน', icon: '✅', routerLink: '/naikit-sticker/diary-summary', section: 'WORKFLOW' },
    { key: 'setting', label: 'ตั้งค่า', icon: '⚙️', routerLink: '/naikit-sticker/setting', section: 'SYSTEM' },
  ];

  /**
   * Bottom-nav (mobile) — 3 primary tabs + a centre FAB. Matches the
   * prototype's MobileBottomNav. The FAB navigates to create-work-sheet,
   * sitting visually above the strip with a 2px ink shadow.
   */
  primaryTabs: NavItem[] = [
    { key: 'home', label: 'งาน', icon: '📋', routerLink: '/naikit-sticker/home' },
    { key: 'create-fab', label: 'สร้าง', icon: '➕', routerLink: '/naikit-sticker/create-work-sheet', fab: true },
    { key: 'all', label: 'รายงาน', icon: '📊', routerLink: '/naikit-sticker/all' },
    { key: 'setting', label: 'ตั้งค่า', icon: '⚙️', routerLink: '/naikit-sticker/setting' },
  ];

  /** Displayed in the sidebar footer. Populated from the active session. */
  userName = '';
  userRole = '';
  phone = '';

  constructor(
    private authService: AuthService,
    private service: ServiceService,
    private firestoreService: FirestoreService,
    private router: Router,
  ) { }

  async ngOnInit() {
    const isLogedIn = await this.authService.SessionIsLogedIn();
    if (isLogedIn == true) {
      const session = this.authService.getValidSession();
      if (!session) {
        // Stale/corrupt token (e.g. legacy Firebase access-token string) —
        // helper already cleared it; force re-login.
        console.warn('[main-layout] invalid session payload; redirecting to /login');
        this.router.navigate(['/login']);
        return;
      }
      // Populate sidebar footer from session.
      this.userName = session.username || session.phone || '';
      this.userRole = session.role || '';
      this.phone = session.phone || '';

      if (session.phone) {
        this.firestoreService.fetchDataUser(session.phone);
      }
    } else {
      this.service.dismissLoading2();
    }
  }

  formatPhoneNumber(phoneNumber: any) {
    if (phoneNumber.length === 12 && phoneNumber.startsWith("+66")) {
      return "0" + phoneNumber.substring(3);
    } else if (phoneNumber.length === 10 && phoneNumber.startsWith("0")) {
      return phoneNumber;
    }
  }

  logout() {
    const { header, message } = signOut();
    this.service.showAlert(header, message, () => {
      this.authService.signout();
    }, { confirmOnly: false });
  }
}
