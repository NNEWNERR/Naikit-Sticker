import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../components/icon.component';
import { NavItem, isEmojiIcon } from './nav-item.interface';

/**
 * <app-sidebar
 *   [items]="navItems"
 *   [brandTitle]="'Naikit'"
 *   [brandSub]="'STICKER OPS'"
 *   [userName]="'นาเดียร์'"
 *   [userRole]="'ฝ่ายขาย'"
 *   [open]="drawerOpen"
 *   (closeRequested)="drawerOpen = false"
 *   (logoutRequested)="onLogout()">
 * </app-sidebar>
 *
 * Reproduces the prototype's `ProtoSidebar` (assets/f9c5012a-…js, L38-72):
 *   - 240px wide, panel-2 background, 2px ink right border
 *   - 36px brand tile (yellow + ink border + "NK" mono)
 *   - Sectioned nav items grouped by `section` field (WORKFLOW / SYSTEM)
 *   - Footer with avatar + name + role + logout arrow
 *
 * Two presentation modes:
 *   - Desktop (md+): persistent left rail. `open` is ignored.
 *   - Mobile  (<md): slide-in drawer + backdrop. `open` drives visibility.
 *     `closeRequested` fires on backdrop click, ESC, or nav-item click.
 *
 * Active state uses `routerLinkActive` (declarative, no Router subscription).
 */
@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <!-- Mobile backdrop — only present when drawer is open on mobile -->
    <div
      *ngIf="open"
      class="md:hidden fixed inset-0 z-40 bg-black/40 animate-fade"
      (click)="requestClose()"
      aria-hidden="true"
    ></div>

    <aside
      class="flex flex-col flex-shrink-0 overflow-y-auto border-ink"
      [style.background]="'var(--bg)'"
      [class.border-r-2]="true"
      [class.fixed]="true"
      [class.md:static]="true"
      [class.top-0]="true"
      [class.left-0]="true"
      [class.h-screen]="true"
      [class.md:h-full]="true"
      [class.z-50]="true"
      [class.md:z-auto]="true"
      [class.transition-transform]="true"
      [class.duration-200]="true"
      [class.-translate-x-full]="!open"
      [class.translate-x-0]="open"
      [class.md:translate-x-0]="true"
      style="width: 240px; padding: 16px;"
      [attr.aria-hidden]="!open ? 'true' : null"
    >
      <!-- Brand tile -->
      <div
        class="flex items-center gap-2.5 border-b-2 border-ink"
        style="padding: 8px 6px 20px; margin-bottom: 16px;"
      >
        <div
          class="flex items-center justify-center flex-shrink-0 bg-brand border-2 border-ink rounded-md font-num"
          style="width: 36px; height: 36px; font-weight: 900; font-size: 16px;"
        >NK</div>
        <div>
          <div class="text-body-lg font-extrabold leading-tight">{{ brandTitle }}</div>
          <div
            class="text-micro font-semibold text-ink-3"
            style="letter-spacing: 0.5px;"
          >{{ brandSub }}</div>
        </div>
      </div>

      <!-- Sectioned nav -->
      <ng-container *ngFor="let group of groupedItems; trackBy: trackBySection">
        <div
          *ngIf="group.section"
          class="text-micro font-extrabold text-ink-3"
          style="letter-spacing: 1.2px; padding: 0 6px 8px;"
          [style.paddingTop.px]="group.first ? 0 : 20"
        >{{ group.section }}</div>

        <div class="flex flex-col gap-1">
          <a
            *ngFor="let item of group.items; trackBy: trackByKey"
            [routerLink]="item.routerLink"
            routerLinkActive="nk-nav-active"
            #rla="routerLinkActive"
            (click)="onItemClick()"
            class="flex items-center gap-3 cursor-pointer select-none transition-colors focus-ring"
            style="padding: 10px 14px; border-radius: 8px; border: 2px solid transparent; font-size: 14px; font-weight: 500;"
            [attr.aria-current]="rla.isActive ? 'page' : null"
          >
            <span
              *ngIf="isEmoji(item.icon)"
              style="font-size: 18px; width: 20px; text-align: center;"
            >{{ item.icon }}</span>
            <app-icon
              *ngIf="!isEmoji(item.icon)"
              [name]="item.icon"
              [size]="18"
              style="width: 20px;"
            ></app-icon>
            <span class="flex-1 truncate">{{ item.label }}</span>
            <span
              *ngIf="item.badge != null"
              class="text-body-sm font-extrabold rounded-full text-center"
              style="padding: 2px 8px; min-width: 22px;"
              [style.background]="rla.isActive ? 'var(--brand)' : 'var(--ink)'"
              [style.color]="rla.isActive ? 'var(--ink)' : 'var(--brand)'"
            >{{ item.badge }}</span>
          </a>
        </div>
      </ng-container>

      <div class="flex-1"></div>

      <!-- User footer -->
      <div
        *ngIf="userName || userRole"
        class="flex items-center gap-2.5 border-t-2 border-ink"
        style="padding: 12px 6px 4px;"
      >
        <div
          class="flex items-center justify-center flex-shrink-0 rounded-full font-extrabold"
          style="width: 32px; height: 32px; font-size: 12px; background: var(--ink); color: var(--brand);"
        >{{ userInitial }}</div>
        <div class="flex-1 min-w-0">
          <div class="text-body font-bold leading-tight truncate">{{ userName }}</div>
          <div class="text-body-sm text-ink-3 truncate">{{ userRole }}</div>
        </div>
        <button
          type="button"
          (click)="logoutRequested.emit()"
          class="text-ink-3 hover:text-ink focus-ring rounded"
          style="font-size: 14px; padding: 2px;"
          aria-label="ออกจากระบบ"
          title="ออกจากระบบ"
        >↗</button>
      </div>
    </aside>
  `,
  styles: [`
    /* Active nav item — black fill + brand-yellow text, per ProtoNavItem L23-26 */
    :host ::ng-deep a.nk-nav-active {
      background: var(--ink) !important;
      color: var(--brand) !important;
      font-weight: 700 !important;
      border-color: var(--ink) !important;
    }
    @keyframes nk-fade { from { opacity: 0; } to { opacity: 1; } }
    .animate-fade { animation: nk-fade 160ms ease-out; }
  `],
})
export class SidebarComponent {
  @Input() items: NavItem[] = [];
  @Input() brandTitle = 'Naikit';
  @Input() brandSub = 'STICKER OPS';
  @Input() userName = '';
  @Input() userRole = '';
  /** Mobile drawer state — ignored on desktop (md+). */
  @Input() open = false;

  @Output() closeRequested = new EventEmitter<void>();
  @Output() logoutRequested = new EventEmitter<void>();

  isEmoji = isEmojiIcon;

  get userInitial(): string {
    if (!this.userName) return '?';
    // Thai-safe: first grapheme of the name.
    return Array.from(this.userName)[0] ?? '?';
  }

  /**
   * Group items by `section`. Preserves input order. The first group's
   * header gets zero top-padding so it doesn't double-pad against the
   * brand-tile separator.
   */
  get groupedItems(): { section: string | null; items: NavItem[]; first: boolean }[] {
    const groups: { section: string | null; items: NavItem[]; first: boolean }[] = [];
    let current: { section: string | null; items: NavItem[]; first: boolean } | null = null;
    for (const item of this.items) {
      const section = item.section ?? null;
      if (!current || current.section !== section) {
        current = { section, items: [], first: groups.length === 0 };
        groups.push(current);
      }
      current.items.push(item);
    }
    return groups;
  }

  trackBySection = (_: number, g: { section: string | null }) => g.section ?? '__';
  trackByKey = (_: number, item: NavItem) => item.key;

  onItemClick() {
    // On mobile, tapping a nav item should also close the drawer.
    if (this.open) this.requestClose();
  }

  requestClose() {
    this.closeRequested.emit();
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.open) this.requestClose();
  }
}
