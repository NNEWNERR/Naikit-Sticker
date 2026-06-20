import { Component, computed, inject } from '@angular/core';
import { signOut } from 'src/app/common/constant/alert-messages';
import { AppStateService } from 'src/app/services/app-state.service';
import { ServiceService } from 'src/app/services/service.service';
import { NavItem } from 'src/app/shared/chrome';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
})
export class MainLayoutComponent {
  private appState = inject(AppStateService);
  private service = inject(ServiceService);

  /**
   * Sidebar nav — sectioned by `section` (WORKFLOW / SYSTEM), matching the
   * prototype's ProtoSidebar grouping. Routes preserved verbatim.
   */
  navItems: NavItem[] = [
    { key: 'home', label: 'หน้าหลัก', icon: '📋', routerLink: '/naikit-sticker/home', section: 'WORKFLOW' },
    { key: 'create', label: 'สร้างใบงาน', icon: '➕', routerLink: '/naikit-sticker/create-work-sheet', section: 'WORKFLOW' },
    { key: 'all', label: 'งานทั้งหมด', icon: '📊', routerLink: '/naikit-sticker/all', section: 'WORKFLOW' },
    { key: 'diary', label: 'สรุปงานรายวัน', icon: '✅', routerLink: '/naikit-sticker/diary-summary', section: 'WORKFLOW' },
    { key: 'setting', label: 'ตั้งค่า', icon: '⚙️', routerLink: '/naikit-sticker/setting', section: 'SYSTEM' },
  ];

  primaryTabs: NavItem[] = [
    { key: 'home', label: 'งาน', icon: '📋', routerLink: '/naikit-sticker/home' },
    { key: 'create-fab', label: 'สร้าง', icon: '➕', routerLink: '/naikit-sticker/create-work-sheet', fab: true },
    { key: 'all', label: 'รายงาน', icon: '📊', routerLink: '/naikit-sticker/all' },
    { key: 'setting', label: 'ตั้งค่า', icon: '⚙️', routerLink: '/naikit-sticker/setting' },
  ];

  // Sidebar footer reads live from AppStateService — kept as computed strings
  // because the existing <app-sidebar> takes [userName] / [userRole] inputs.
  userName = computed(
    () => this.appState.session()?.display_name || this.appState.session()?.username || '',
  );
  userRole = computed(() => this.appState.session()?.role ?? '');

  logout() {
    const { header, message } = signOut();
    this.service.showAlert(header, message, () => {
      this.appState.logout();
    }, { confirmOnly: false });
  }
}
