import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * <app-search
 *   label="ค้นหา serial / ลูกค้า"
 *   placeholder="ค้นหา serial / ลูกค้า..."
 *   [(value)]="search"
 *   (valueChange)="onSearch($event)">
 * </app-search>
 *
 * Brutalist search affordance. Replaces the duplicated `div + 🔍 + input`
 * pattern repeated across Home + every Settings sub-page. Carries a visually
 * hidden <label> so screen-reader / voice-control users always have a name
 * to address (placeholder alone is not an accessible name).
 *
 * Two ways to bind:
 *   - banana-syntax  [(value)]="search"
 *   - explicit       [value]="search" (valueChange)="search = $event"
 */
@Component({
  standalone: true,
  selector: 'app-search',
  imports: [CommonModule, FormsModule],
  template: `
    <label class="flex items-center gap-2 bg-white border-2 border-ink rounded-md px-3 py-2 shadow-brutal-sm text-body font-semibold text-ink-2"
           [class.max-w-md]="maxWidth"
           [attr.for]="inputId">
      <span class="sr-only">{{ label || placeholder }}</span>
      <span aria-hidden="true">🔍</span>
      <input
        [id]="inputId"
        [name]="name || inputId"
        type="search"
        role="searchbox"
        autocomplete="off"
        [attr.aria-label]="label || placeholder"
        [placeholder]="placeholder"
        [ngModel]="value"
        (ngModelChange)="onChange($event)"
        class="bg-transparent border-0 outline-none flex-1 min-w-0 placeholder:text-ink-4"
      />
    </label>
  `,
  styles: [`
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `],
})
export class SearchComponent {
  private static seq = 0;

  /** Accessible label. Required for SR users; falls back to placeholder if omitted. */
  @Input() label = '';
  @Input() placeholder = 'ค้นหา...';
  @Input() value = '';
  /** Form control name (used by autofill / voice control). Defaults to the generated id. */
  @Input() name = '';
  /** Cap the search box at max-w-md (default true). Set false to fill the parent. */
  @Input() maxWidth = true;

  @Output() valueChange = new EventEmitter<string>();

  readonly inputId = `nk-search-${++SearchComponent.seq}`;

  onChange(v: string) {
    this.value = v;
    this.valueChange.emit(v);
  }
}
