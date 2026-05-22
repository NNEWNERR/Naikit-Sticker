import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type NkCardVariant = 'brutal' | 'brutal-sm' | 'flat' | 'inverse';

/**
 * <app-card variant="brutal" padding="p-5">…</app-card>
 *
 * Surface container. The prototype's default card is "brutal":
 *   bg-white + 2px ink border + 3px hard offset shadow + 10px radius.
 *
 * Variants:
 *  - `brutal`     — primary cards (panels, dashboard widgets, modals).
 *  - `brutal-sm`  — denser cards inside lists/kanban (2px offset shadow).
 *  - `flat`       — nested surface, no border, no shadow (e.g. panel-2 inset).
 *  - `inverse`    — black surface with white text + brand-yellow offset shadow
 *                   (used for the "summary hero" tile on the diary screen).
 */
@Component({
  standalone: true,
  selector: 'app-card',
  imports: [CommonModule],
  template: `
    <div [ngClass]="classes">
      <ng-content></ng-content>
    </div>
  `,
})
export class CardComponent {
  @Input() variant: NkCardVariant = 'brutal';
  @Input() padding = 'p-5';
  @Input() cls = '';

  get classes(): string {
    const base =
      this.variant === 'brutal' ?
        'bg-white border-2 border-ink rounded-md shadow-brutal'
      : this.variant === 'brutal-sm' ?
        'bg-white border-2 border-ink rounded-md shadow-brutal-sm'
      : this.variant === 'inverse' ?
        'bg-ink text-white border-2 border-ink rounded-md shadow-brutal-brand'
      : /* flat */
        'bg-surface-3 rounded-md';
    return [base, this.padding, this.cls].filter(Boolean).join(' ');
  }
}
