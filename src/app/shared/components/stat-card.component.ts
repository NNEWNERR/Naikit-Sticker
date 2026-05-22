import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type StatCardSize = 'sm' | 'md';

/**
 * <app-stat-card label="งานด่วน ⚡" value="6" icon="🔥" delta="ต้องเร่ง" deltaTone="danger" />
 *
 * Stat tile shown in the home dashboard. The `value` renders in JetBrains
 * Mono (.font-num) at fontWeight 900. Mobile (`size="sm"`) compresses
 * padding and value font-size; desktop (`size="md"`) is the full prototype.
 *
 * `delta` is an optional caption to the right of the value — typically
 * green (success) for positive deltas, red (danger) for urgent counts.
 */
@Component({
  standalone: true,
  selector: 'app-stat-card',
  imports: [CommonModule],
  template: `
    <div
      class="border-2 border-ink rounded-md"
      [ngClass]="cardClasses"
      [style.background]="bg || '#FFFFFF'"
    >
      <ng-container *ngIf="size === 'sm'; else fullTpl">
        <!-- Mobile compact: centered value + label -->
        <div class="text-center">
          <div class="font-num font-black text-[22px] leading-none">{{ value }}</div>
          <div class="text-[10px] font-bold text-ink-2 mt-0.5">{{ label }}</div>
        </div>
      </ng-container>

      <ng-template #fullTpl>
        <div class="flex justify-between items-center mb-2.5">
          <span class="text-[11px] font-bold text-ink-3">{{ label }}</span>
          <span *ngIf="icon" class="text-base">{{ icon }}</span>
        </div>
        <div class="flex items-baseline gap-2">
          <div class="font-num font-black text-[32px] leading-none">{{ value }}</div>
          <div *ngIf="delta" class="text-[11px] font-bold" [ngClass]="deltaClass">{{ delta }}</div>
        </div>
      </ng-template>
    </div>
  `,
})
export class StatCardComponent {
  @Input() label = '';
  @Input() value: string | number = 0;
  @Input() icon = '';
  @Input() delta = '';
  @Input() deltaTone: 'success' | 'danger' | 'warning' | 'info' | 'neutral' = 'success';
  @Input() size: StatCardSize = 'md';
  /** Optional override of card background (used for the mobile "urgent" or "delivered" tiles). */
  @Input() bg = '';

  get cardClasses(): string {
    return this.size === 'sm'
      ? 'px-2 py-2.5 shadow-brutal-sm'
      : 'p-4 shadow-brutal flex-1 min-w-0';
  }

  get deltaClass(): string {
    switch (this.deltaTone) {
      case 'danger': return 'text-danger';
      case 'warning': return 'text-warn';
      case 'info': return 'text-info';
      case 'neutral': return 'text-ink-3';
      default: return 'text-accent';
    }
  }
}
