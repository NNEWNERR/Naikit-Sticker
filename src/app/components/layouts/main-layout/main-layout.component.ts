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
   * Sidebar nav — sectioned by `section` (WORKFLOW / SYSTEM). `roles` mirror the
   * route guards (app-routing.module.ts) so a role never sees a nav item it
   * can't actually open (e.g. a seller seeing the admin-only ตั้งค่า).
   */
  private readonly allNavItems: NavItem[] = [
    { key: 'home', label: 'หน้าหลัก', icon: '📋', routerLink: '/naikit-sticker/home', section: 'WORKFLOW' },
    { key: 'create', label: 'สร้างใบงาน', icon: '➕', routerLink: '/naikit-sticker/create-work-sheet', section: 'WORKFLOW', roles: ['seller', 'admin'] },
    { key: 'all', label: 'งานทั้งหมด', icon: '📊', routerLink: '/naikit-sticker/all', section: 'WORKFLOW', roles: ['admin', 'seller', 'finance'] },
    { key: 'diary', label: 'สรุปงานรายวัน', icon: '✅', routerLink: '/naikit-sticker/diary-summary', section: 'WORKFLOW', roles: ['admin', 'seller', 'finance'] },
    { key: 'finance', label: 'ตรวจเงิน', icon: '💰', routerLink: '/naikit-sticker/finance', section: 'SYSTEM', roles: ['admin', 'finance'] },
    { key: 'setting', label: 'ตั้งค่า', icon: '⚙️', routerLink: '/naikit-sticker/setting', section: 'SYSTEM', roles: ['admin'] },
  ];

  private readonly allPrimaryTabs: NavItem[] = [
    { key: 'home', label: 'งาน', icon: '📋', routerLink: '/naikit-sticker/home' },
    { key: 'create-fab', label: 'สร้าง', icon: '➕', routerLink: '/naikit-sticker/create-work-sheet', fab: true, roles: ['seller', 'admin'] },
    { key: 'all', label: 'รายงาน', icon: '📊', routerLink: '/naikit-sticker/all', roles: ['admin', 'seller', 'finance'] },
    { key: 'finance', label: 'ตรวจเงิน', icon: '💰', routerLink: '/naikit-sticker/finance', roles: ['admin', 'finance'] },
    { key: 'setting', label: 'ตั้งค่า', icon: '⚙️', routerLink: '/naikit-sticker/setting', roles: ['admin'] },
  ];

  /** Nav filtered to the current user's role (item with no `roles` = all). */
  navItems = computed(() => this.filterByRole(this.allNavItems));
  primaryTabs = computed(() => this.filterByRole(this.allPrimaryTabs));

  private filterByRole(items: NavItem[]): NavItem[] {
    const role = this.appState.role();
    return items.filter((i) => !i.roles || (!!role && i.roles.includes(role)));
  }

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
