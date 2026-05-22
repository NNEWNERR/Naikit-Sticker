import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../components/icon.component';
import { NavItem, isEmojiIcon } from './nav-item.interface';

/**
 * <app-bottom-nav [items]="primaryTabs"></app-bottom-nav>
 *
 * Mobile-only bottom tab bar. Reproduces the prototype's `MobileBottomNav`
 * (assets/f9c5012a-…js, L74-94):
 *   - 2px ink top border, white background
 *   - 3-5 tabs, evenly distributed
 *   - One item may carry `fab: true` → renders as a 48px yellow circle
 *     with ink border + 2px brutal shadow, sitting -22px above the strip
 *
 * Hidden on desktop (md and up). Active state uses `routerLinkActive`.
 */
@Component({
  standalone: true,
  selector: 'app-bottom-nav',
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <nav
      class="md:hidden flex justify-around items-center bg-panel border-t-2 border-ink flex-shrink-0"
      style="padding: 6px 0 14px;"
      role="navigation"
      aria-label="แถบนำทางหลัก"
    >
      <ng-container *ngFor="let item of items; trackBy: trackByKey">
        <!-- FAB centre item -->
        <a
          *ngIf="item.fab; else regular"
          [routerLink]="item.routerLink"
          class="flex items-center justify-center bg-brand border-2 border-ink shadow-brutal-sm rounded-full focus-ring"
          style="width: 48px; height: 48px; margin-top: -22px; font-size: 20px; cursor: pointer;"
          [attr.aria-label]="item.label || 'สร้างใหม่'"
        >
          <span *ngIf="isEmoji(item.icon)">{{ item.icon }}</span>
          <app-icon *ngIf="!isEmoji(item.icon)" [name]="item.icon" [size]="22"></app-icon>
        </a>

        <ng-template #regular>
          <a
            [routerLink]="item.routerLink"
            routerLinkActive="nk-tab-active"
            #rla="routerLinkActive"
            class="flex flex-col items-center gap-0.5 text-ink-4 transition-colors focus-ring rounded"
            style="padding: 4px 20px; cursor: pointer;"
            [attr.aria-current]="rla.isActive ? 'page' : null"
            [attr.aria-label]="item.label"
          >
            <span *ngIf="isEmoji(item.icon)" style="font-size: 20px;">{{ item.icon }}</span>
            <app-icon *ngIf="!isEmoji(item.icon)" [name]="item.icon" [size]="20"></app-icon>
            <span class="font-bold" style="font-size: 10px;">{{ item.label }}</span>
          </a>
        </ng-template>
      </ng-container>
    </nav>
  `,
  styles: [`
    :host ::ng-deep a.nk-tab-active { color: var(--ink) !important; }
  `],
})
export class BottomNavComponent {
  @Input() items: NavItem[] = [];

  isEmoji = isEmojiIcon;
  trackByKey = (_: number, item: NavItem) => item.key;
}
