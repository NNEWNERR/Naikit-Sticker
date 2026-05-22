import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NavItem } from './nav-item.interface';
import { SidebarComponent } from './sidebar.component';
import { BottomNavComponent } from './bottom-nav.component';

/**
 * <app-shell
 *   [navItems]="navItems"
 *   [bottomNavItems]="primaryTabs"
 *   [userName]="userName"
 *   [userRole]="userRole"
 *   (logoutRequested)="onLogout()">
 *
 *   <ng-container topbar>...optional topbar slot...</ng-container>
 *   <router-outlet></router-outlet>
 * </app-shell>
 *
 * App chrome wrapping every authenticated route. Reproduces the prototype's
 * `AppLayout` (assets/f9c5012a-…js, L97-113):
 *   - Desktop (md+): sidebar + content column (overflow-hidden)
 *   - Mobile  (<md): content column + bottom nav, plus a hamburger button
 *     overlay that toggles the sidebar as a slide-in drawer
 *
 * Children project into the default slot. The optional `topbar` slot
 * renders inside the content column above the scroll area (the hamburger
 * sits next to it on mobile).
 *
 * Active route detection is fully declarative — the sidebar and bottom-nav
 * use Angular's `routerLinkActive` directive on each item, so no Router
 * subscription is needed here.
 */
@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [CommonModule, SidebarComponent, BottomNavComponent],
  template: `
    <div
      class="flex md:flex-row flex-col bg-surface-2"
      style="height: 100dvh; min-height: 100dvh; overflow: hidden; font-family: 'IBM Plex Sans Thai', sans-serif;"
    >
      <!-- Sidebar — persistent on desktop, drawer on mobile -->
      <app-sidebar
        [items]="navItems"
        [userName]="userName"
        [userRole]="userRole"
        [open]="drawerOpen"
        (closeRequested)="drawerOpen = false"
        (logoutRequested)="logoutRequested.emit()"
      ></app-sidebar>

      <!-- Content column -->
      <div class="flex-1 flex flex-col overflow-hidden min-w-0">
        <!-- Optional topbar projection — sits at the top of the content column.
             On mobile, includes a leading hamburger button that opens the drawer. -->
        <div
          *ngIf="hasTopbar"
          class="flex items-stretch flex-shrink-0"
        >
          <button
            type="button"
            class="md:hidden flex items-center justify-center bg-brand border-b-[3px] border-r-2 border-ink focus-ring"
            style="width: 52px; flex-shrink: 0;"
            (click)="drawerOpen = true"
            aria-label="เปิดเมนู"
            aria-controls="app-sidebar"
          >
            <span style="font-size: 22px; font-weight: 800;">☰</span>
          </button>
          <div class="flex-1 min-w-0">
            <ng-content select="[topbar]"></ng-content>
          </div>
        </div>

        <!-- Floating hamburger when no topbar is projected (rare — kept as a
             fallback so the drawer is always reachable on mobile) -->
        <button
          *ngIf="!hasTopbar"
          type="button"
          class="md:hidden fixed bottom-20 left-3 z-30 flex items-center justify-center bg-brand border-2 border-ink shadow-brutal-sm rounded-full focus-ring"
          style="width: 44px; height: 44px;"
          (click)="drawerOpen = true"
          aria-label="เปิดเมนู"
        >
          <span style="font-size: 18px; font-weight: 800;">☰</span>
        </button>

        <!-- Scrollable page content. position:relative anchors <ion-router-outlet>
             (which positions itself absolutely) to this container, not the viewport. -->
        <main class="flex-1 overflow-auto min-h-0 relative">
          <ng-content></ng-content>
        </main>
      </div>

      <!-- Mobile bottom nav -->
      <app-bottom-nav
        *ngIf="bottomNavItems.length > 0"
        [items]="bottomNavItems"
      ></app-bottom-nav>
    </div>
  `,
})
export class ShellComponent {
  @Input() navItems: NavItem[] = [];
  @Input() bottomNavItems: NavItem[] = [];
  @Input() userName = '';
  @Input() userRole = '';
  /**
   * Set to true when the page is projecting content into the `[topbar]`
   * slot. Drives whether the hamburger renders inline with the topbar
   * (true) or as a floating affordance (false).
   */
  @Input() hasTopbar = true;

  @Output() logoutRequested = new EventEmitter<void>();

  drawerOpen = false;
}
