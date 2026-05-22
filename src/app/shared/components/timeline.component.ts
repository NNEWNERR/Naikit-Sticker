import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface TimelineStep {
  /** Full status string used to compute active/done states. */
  key: string;
  /** Short label rendered under the dot. */
  short: string;
}

/**
 * <app-timeline [steps]="STATUSES" [currentStatus]="ws.status"></app-timeline>
 *
 * Horizontal status timeline for the worksheet-info screen. Renders 8 dots
 * connected by a line; dots before the current status are filled black with
 * a ✓, the current dot is brand-yellow with a brutal-sm shadow, and
 * downstream dots are white outlines.
 *
 * Reproduces the prototype Timeline (assets/541b5f48-…js, lines 18-37).
 */
@Component({
  standalone: true,
  selector: 'app-timeline',
  imports: [CommonModule],
  template: `
    <div class="flex items-start px-4 md:px-6 py-3 bg-white border-b-2 border-ink overflow-x-auto flex-shrink-0">
      <ng-container *ngFor="let s of steps; let i = index; let isLast = last">
        <div class="flex flex-col items-center gap-1 min-w-[58px]">
          <div
            class="w-[26px] h-[26px] rounded-full border-2 border-ink flex items-center justify-center
                   text-[11px] font-extrabold"
            [class.bg-ink]="i < currentIndex"
            [class.text-brand]="i < currentIndex"
            [class.bg-brand]="i === currentIndex"
            [class.text-ink]="i === currentIndex"
            [class.bg-white]="i > currentIndex"
            [class.text-ink-4]="i > currentIndex"
            [class.shadow-brutal-sm]="i === currentIndex"
          >
            <span *ngIf="i < currentIndex" aria-hidden="true">✓</span>
            <span *ngIf="i >= currentIndex">{{ i + 1 }}</span>
          </div>
          <span
            class="text-[9px] text-center whitespace-nowrap"
            [class.font-extrabold]="i === currentIndex"
            [class.font-semibold]="i !== currentIndex"
            [class.text-ink]="i === currentIndex"
            [class.text-ink-4]="i > currentIndex"
            [class.text-ink-3]="i < currentIndex"
          >{{ s.short }}</span>
        </div>
        <div
          *ngIf="!isLast"
          class="h-[2px] flex-1 min-w-2"
          style="margin-top: 12px;"
          [class.bg-ink]="i < currentIndex"
          [class.bg-line]="i >= currentIndex"
        ></div>
      </ng-container>
    </div>
  `,
})
export class TimelineComponent {
  @Input() steps: TimelineStep[] = [];
  @Input() currentStatus = '';

  get currentIndex(): number {
    const i = this.steps.findIndex((s) => s.key === this.currentStatus);
    return i < 0 ? 0 : i;
  }
}
