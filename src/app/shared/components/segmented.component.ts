import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface SegmentedOption {
  key: string;
  label: string;
  /** Optional count rendered next to the label, e.g. " 8" on the team-filter. */
  count?: number | string;
}

/**
 * <app-segmented [options]="tabs" [value]="active" (change)="active = $event">
 * </app-segmented>
 *
 * Pill-style segmented control matching the prototype's home filter chips
 * and mobile tabs. Active chip is black-on-yellow text (ink fill + brand
 * text). Inactive chips are white with 2px ink border.
 *
 * Two sizes:
 *  - `sm` (default) — 6px×12px padding, 12px font (mobile tabs at home/diary)
 *  - `md`           — 6px×14px padding, 13px font (desktop team filter)
 */
@Component({
  standalone: true,
  selector: 'app-segmented',
  imports: [CommonModule],
  template: `
    <div class="flex gap-1.5 items-center flex-wrap">
      <button
        *ngFor="let opt of options"
        type="button"
        (click)="change.emit(opt.key)"
        [class.bg-ink]="opt.key === value"
        [class.text-brand]="opt.key === value"
        [class.bg-white]="opt.key !== value"
        [class.text-ink]="opt.key !== value"
        [ngClass]="sizeClasses"
        class="rounded-full border-2 border-ink font-bold cursor-pointer font-sans
               transition-colors focus:outline-none focus-visible:shadow-[0_0_0_3px_rgba(255,212,0,0.6)]"
      >
        {{ opt.label }}<span *ngIf="opt.count != null" class="opacity-60 ml-1">{{ opt.count }}</span>
      </button>
    </div>
  `,
})
export class SegmentedComponent {
  @Input() options: SegmentedOption[] = [];
  @Input() value: string | null = null;
  @Input() size: 'sm' | 'md' = 'sm';
  @Output() change = new EventEmitter<string>();

  get sizeClasses(): string {
    return this.size === 'md' ? 'px-3.5 py-1.5 text-body-lg' : 'px-3 py-1.5 text-body-sm';
  }
}
