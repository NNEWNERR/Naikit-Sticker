import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * <app-empty-state
 *   icon="📋"
 *   title="ยังไม่มีใบงาน"
 *   helper="กดปุ่มด้านล่างเพื่อสร้างใบงานแรก"
 *   cta="สร้างใบงาน"
 *   (ctaClick)="create()">
 * </app-empty-state>
 *
 * Replaces the one-line "ไม่พบ…" / "ยังไม่มี…" texts scattered across pages.
 * The pattern is "tour guide, not dead-end": always tell the user what to do
 * next, even when the list is empty. Renders nothing else than a centered
 * stack so the parent owns spacing.
 *
 * `size="sm"` is for in-card empties (comments thread, image strip);
 * `size="md"` (default) is for full-pane list empties (Home, Settings).
 */
@Component({
  standalone: true,
  selector: 'app-empty-state',
  imports: [CommonModule],
  template: `
    <div [ngClass]="containerClasses" role="status" aria-live="polite">
      <div *ngIf="icon" [ngClass]="iconClasses" aria-hidden="true">{{ icon }}</div>
      <div class="font-extrabold text-ink" [ngClass]="titleClasses">{{ title }}</div>
      <div *ngIf="helper" class="text-ink-3 font-medium mt-1 max-w-sm" [ngClass]="helperClasses">
        {{ helper }}
      </div>
      <button
        *ngIf="cta"
        type="button"
        (click)="ctaClick.emit()"
        class="btn-primary mt-4 inline-flex items-center justify-center px-4 py-2 text-body-lg cursor-pointer"
      >{{ cta }}</button>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() icon = '';
  @Input() title = '';
  @Input() helper = '';
  @Input() cta = '';
  @Input() size: 'sm' | 'md' = 'md';

  @Output() ctaClick = new EventEmitter<void>();

  get containerClasses(): string {
    return this.size === 'sm'
      ? 'flex flex-col items-center text-center py-6 px-4'
      : 'flex flex-col items-center text-center py-10 px-4';
  }
  get iconClasses(): string {
    return this.size === 'sm'
      ? 'text-[32px] leading-none mb-2 opacity-80'
      : 'text-[44px] leading-none mb-3 opacity-80';
  }
  get titleClasses(): string {
    return this.size === 'sm' ? 'text-body-lg' : 'text-h3';
  }
  get helperClasses(): string {
    return this.size === 'sm' ? 'text-body-sm' : 'text-body';
  }
}
