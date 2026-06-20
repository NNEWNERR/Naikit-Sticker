import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

/**
 * <app-skeleton variant="list" [rows]="5"></app-skeleton>
 *
 * Replaces the global "Loading..." overlay (presentLoadingWithOutTime) for
 * list/grid surfaces so users perceive layout structure during the Firestore
 * round-trip rather than a frozen page.
 *
 * Variants
 *  - `card`  — single brutalist card with header + 3 lines (worksheet info / detail panes).
 *  - `list`  — stack of `rows` kanban-style cards (Home mobile, search results).
 *  - `row`   — stack of `rows` table rows that match the .border-2.border-ink table shell
 *              (Settings tables — slot inside the existing table frame).
 *
 * Animation: 1.6s shimmer over `bg-surface-3`. Kept in JS rather than global
 * SCSS so it ships with the component.
 */
@Component({
  standalone: true,
  selector: 'app-skeleton',
  imports: [CommonModule],
  template: `
    <ng-container [ngSwitch]="variant">

      <!-- ── list: stack of brutal cards ──────────────────────────────── -->
      <div *ngSwitchCase="'list'" class="flex flex-col gap-2.5" role="status" [attr.aria-label]="ariaLabel">
        <div
          *ngFor="let _ of items"
          class="bg-white border-2 border-ink rounded-md shadow-brutal-sm p-3 flex flex-col gap-2"
        >
          <div class="flex items-center gap-2">
            <div class="nk-sk-bar h-3 w-16 rounded-sm"></div>
            <div class="nk-sk-bar h-3 w-12 rounded-sm ml-auto"></div>
          </div>
          <div class="nk-sk-bar h-4 w-3/5 rounded-sm"></div>
          <div class="flex items-center gap-2">
            <div class="nk-sk-bar h-7 w-7 rounded-full"></div>
            <div class="nk-sk-bar h-3 w-24 rounded-sm"></div>
            <div class="nk-sk-bar h-3 w-12 rounded-sm ml-auto"></div>
          </div>
        </div>
      </div>

      <!-- ── row: table-row skeletons (slot inside the table shell) ─────── -->
      <div *ngSwitchCase="'row'" role="status" [attr.aria-label]="ariaLabel">
        <div
          *ngFor="let _ of items; let i = index"
          class="grid grid-cols-[44px_1fr_44px] md:grid-cols-[44px_1.5fr_1fr_1fr_44px] border-t border-line items-center min-w-[360px] md:min-w-0"
          [class.bg-surface-2]="i % 2 === 1"
          [class.bg-white]="i % 2 === 0"
        >
          <div class="px-2 py-2.5">
            <div class="nk-sk-bar w-7 h-7 rounded-full"></div>
          </div>
          <div class="px-3 py-2.5"><div class="nk-sk-bar h-4 w-3/5 rounded-sm"></div></div>
          <div class="hidden md:block px-3 py-2.5"><div class="nk-sk-bar h-3 w-24 rounded-sm"></div></div>
          <div class="px-3 py-2.5"><div class="nk-sk-bar h-3 w-20 rounded-sm"></div></div>
          <div class="px-2 py-2.5"></div>
        </div>
      </div>

      <!-- ── card: single panel skeleton ───────────────────────────────── -->
      <div *ngSwitchDefault class="bg-white border-2 border-ink rounded-md shadow-brutal p-4" role="status" [attr.aria-label]="ariaLabel">
        <div class="nk-sk-bar h-5 w-1/3 rounded-sm mb-3"></div>
        <div class="nk-sk-bar h-3 w-4/5 rounded-sm mb-2"></div>
        <div class="nk-sk-bar h-3 w-3/5 rounded-sm mb-2"></div>
        <div class="nk-sk-bar h-3 w-2/5 rounded-sm"></div>
      </div>
    </ng-container>
  `,
  styles: [`
    .nk-sk-bar {
      background: linear-gradient(90deg, #EFEFEF 0%, #F8F8F8 50%, #EFEFEF 100%);
      background-size: 200% 100%;
      animation: nkShimmer 1.6s ease-in-out infinite;
      display: block;
    }
    @keyframes nkShimmer {
      0%   { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .nk-sk-bar { animation: none; background: #EFEFEF; }
    }
  `],
})
export class SkeletonComponent {
  @Input() variant: 'list' | 'row' | 'card' = 'list';
  @Input() rows = 4;
  @Input() ariaLabel = 'กำลังโหลด';

  get items(): number[] {
    return Array.from({ length: Math.max(1, this.rows) });
  }
}
