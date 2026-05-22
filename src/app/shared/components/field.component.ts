import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

/**
 * <app-field label="ชื่อลูกค้า" [required]="true" hint="01 · INFO">
 *   <input class="input-base focus-ring w-full" />
 * </app-field>
 *
 * Form-field wrapper. Pairs a bold (font-weight 800) label with optional
 * uppercase-mono hint and an error line below. Caller must apply
 * `.input-base` (or `.input-brutal` for hero forms) + `.focus-ring` to the
 * projected control so input/select/textarea are handled uniformly.
 *
 * Label weight is 800 to match the prototype's form labels — heavier than
 * krungthon-air's 500-weight labels.
 */
@Component({
  standalone: true,
  selector: 'app-field',
  imports: [CommonModule],
  template: `
    <label class="block">
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-body-sm font-extrabold text-ink tracking-wide">
          {{ label }}
          <span *ngIf="required" class="text-danger" aria-hidden="true">*</span>
        </span>
        <span *ngIf="hint" class="label-mono">{{ hint }}</span>
      </div>
      <ng-content></ng-content>
      <p *ngIf="error" class="mt-1 text-body-sm font-semibold text-danger">{{ error }}</p>
    </label>
  `,
})
export class FieldComponent {
  @Input() label = '';
  @Input() hint = '';
  @Input() required = false;
  @Input() error = '';
}
