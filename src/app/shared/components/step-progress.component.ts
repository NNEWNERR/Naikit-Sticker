import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface StepProgressItem {
  label: string;
}

/**
 * <app-step-progress
 *   [steps]="['ลูกค้า', 'รายการงาน', 'ชำระเงิน', 'ไฟล์แนบ']"
 *   [current]="step"
 *   (stepClick)="onStepClick($event)"
 * ></app-step-progress>
 *
 * Numbered stepper bar with active/done/todo states + connectors + linear
 * progress bar on the right. Reproduces the prototype's create-screen
 * stepper (assets/534698ed-…js, lines 166-177).
 *
 * `current` is 1-indexed. Steps with index < current are "done" (filled black
 * with a ✓), `=current` is "active" (brand-yellow), and `>current` is "todo"
 * (white).
 *
 * On desktop, step labels render next to the dot. On mobile they hide and
 * the connector widths shrink to keep all 4 dots visible.
 */
@Component({
  standalone: true,
  selector: 'app-step-progress',
  imports: [CommonModule],
  template: `
    <div
      class="px-4 md:px-6 py-3 border-b-2 border-ink bg-white flex items-center
             gap-2.5 md:gap-5 flex-shrink-0 overflow-x-auto"
    >
      <ng-container *ngFor="let label of steps; let i = index; let isLast = last">
        <!-- Step dot + label -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            [attr.aria-label]="'ขั้นตอน ' + (i + 1) + ': ' + label"
            [attr.aria-current]="i + 1 === current ? 'step' : null"
            [disabled]="!clickable || i + 1 > current"
            (click)="onClick(i + 1)"
            class="w-7 h-7 rounded-full border-2 border-ink
                   flex items-center justify-center
                   text-[12px] font-extrabold flex-shrink-0
                   transition-shadow
                   disabled:cursor-default"
            [class.bg-brand]="i + 1 === current"
            [class.bg-ink]="i + 1 < current"
            [class.bg-white]="i + 1 > current"
            [class.text-brand]="i + 1 < current"
            [class.text-ink]="i + 1 === current"
            [class.text-ink-4]="i + 1 > current"
            [class.shadow-brutal-sm]="i + 1 === current"
            [class.cursor-pointer]="clickable && i + 1 <= current"
          >
            <span *ngIf="i + 1 < current" aria-hidden="true">✓</span>
            <span *ngIf="i + 1 >= current">{{ i + 1 }}</span>
          </button>
          <span
            class="hidden md:inline text-body whitespace-nowrap"
            [class.font-extrabold]="i + 1 === current"
            [class.font-semibold]="i + 1 !== current"
            [class.text-ink]="i + 1 === current"
            [class.text-ink-3]="i + 1 < current"
            [class.text-ink-4]="i + 1 > current"
          >{{ label }}</span>
        </div>

        <!-- Connector -->
        <div
          *ngIf="!isLast"
          class="h-[2px] flex-shrink-0"
          [class.bg-ink]="i + 1 < current"
          [class.bg-line-2]="i + 1 >= current"
          [style.width.px]="connectorWidthPx"
        ></div>
      </ng-container>

      <!-- Linear progress bar (right side) -->
      <div class="flex-1 min-w-2"></div>
      <div
        class="w-20 h-1.5 bg-surface-3 rounded-full border-[1.5px] border-ink overflow-hidden flex-shrink-0"
        [attr.aria-valuenow]="progress"
        aria-valuemin="0"
        aria-valuemax="100"
        role="progressbar"
      >
        <div class="h-full bg-brand transition-[width] duration-300 ease-smooth" [style.width.%]="progress"></div>
      </div>
    </div>
  `,
})
export class StepProgressComponent {
  @Input() steps: string[] = [];
  /** 1-indexed current step. */
  @Input() current = 1;
  /** Allow clicking on done/current steps to jump back. Forward steps stay disabled. */
  @Input() clickable = true;
  /** Connector visual width in px — narrower on mobile to keep all 4 dots visible. */
  @Input() connectorWidthPx = 16;

  @Output() stepClick = new EventEmitter<number>();

  get progress(): number {
    const total = Math.max(1, this.steps.length - 1);
    const done = Math.max(0, Math.min(this.current - 1, total));
    return (done / total) * 100;
  }

  onClick(stepNum: number) {
    if (!this.clickable || stepNum > this.current) return;
    this.stepClick.emit(stepNum);
  }
}
