import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

/**
 * <app-page-header
 *   title="ใบงานวันนี้"
 *   subtitle="อาทิตย์ 11 พ.ค. 2026"
 *   breadcrumb="DASHBOARD · ใบงานวันนี้"
 *   [yellow]="true"
 *   [onBack]="goBack">
 *   <app-button>+ สร้างใหม่</app-button>
 * </app-page-header>
 *
 * Reproduces the prototype's `ProtoTopBar`: a single banner at the top of
 * a screen with three optional decorations:
 *   - `breadcrumb` — uppercase eyebrow (desktop only)
 *   - `subtitle`   — secondary line under the title
 *   - right slot (ng-content) — action buttons
 *
 * When `yellow=true` (default) the banner is the brand-yellow chrome from
 * the prototype with a 3px ink bottom border. Set `yellow=false` for
 * neutral white pages (e.g. settings details).
 */
@Component({
  standalone: true,
  selector: 'app-page-header',
  imports: [CommonModule],
  template: `
    <div
      class="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-3.5 flex-shrink-0"
      [class.bg-brand]="yellow"
      [class.bg-white]="!yellow"
      [class.border-b-[3px]]="yellow"
      [class.border-b-2]="!yellow"
      [class.border-ink]="true"
    >
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <button
          *ngIf="onBack"
          type="button"
          (click)="onBack()"
          class="flex items-center text-xl leading-none flex-shrink-0"
          aria-label="ย้อนกลับ"
        >←</button>
        <div class="min-w-0">
          <div
            *ngIf="breadcrumb"
            class="hidden sm:block label-eyebrow mb-0.5"
            style="opacity:.7"
          >{{ breadcrumb }}</div>
          <h1
            class="text-h1 sm:text-h1 tracking-tight truncate"
            [class.text-ink]="true"
            style="margin:0;"
          >{{ title }}</h1>
          <div
            *ngIf="subtitle"
            class="text-body-sm font-medium truncate"
            style="opacity:.65"
          >{{ subtitle }}</div>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() breadcrumb = '';
  /** Brand-yellow banner (default). Set false for neutral pages. */
  @Input() yellow = true;
  /** Optional back handler — renders a leading ← button when provided. */
  @Input() onBack?: () => void;
}
