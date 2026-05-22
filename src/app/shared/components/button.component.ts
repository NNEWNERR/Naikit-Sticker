import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type NkButtonVariant = 'primary' | 'dark' | 'ghost' | 'danger';
export type NkButtonSize = 'sm' | 'md' | 'lg';

/**
 * <app-button variant="primary" size="md" [disabled]="busy" (clicked)="onSave()">
 *   บันทึก
 * </app-button>
 *
 * Variants map to global classes (.btn-primary / .btn-dark / .btn-ghost /
 * .btn-danger) defined in src/global.scss. Every variant carries the
 * brutal 2-3px ink border + offset shadow; `dark` inverts (ink fill + brand
 * shadow) for the prominent secondary action seen on the prototype's
 * Home/Create/Report screens.
 */
@Component({
  standalone: true,
  selector: 'app-button',
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled"
      [ngClass]="classes"
      (click)="clicked.emit($event)"
    >
      <ng-content></ng-content>
    </button>
  `,
})
export class ButtonComponent {
  @Input() variant: NkButtonVariant = 'primary';
  @Input() size: NkButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() block = false;
  @Input() cls = '';

  @Output() clicked = new EventEmitter<MouseEvent>();

  get classes(): string {
    const base =
      'inline-flex items-center justify-center gap-2 cursor-pointer ' +
      'font-bold transition-all ease-smooth ' +
      'disabled:opacity-45 disabled:cursor-not-allowed focus:outline-none';

    const variantCls =
      this.variant === 'primary' ? 'btn-primary'
      : this.variant === 'dark'  ? 'btn-dark'
      : this.variant === 'danger' ? 'btn-danger'
      : 'btn-ghost';

    // Prototype button sizes:
    //   sm: padding 6×12  / font 13
    //   md: padding 10×18 / font 14
    //   lg: padding 14×24 / font 16
    const sizeCls =
      this.size === 'sm' ? 'py-1.5 px-3 text-body'
      : this.size === 'lg' ? 'py-3.5 px-6 text-base'
      : 'py-2.5 px-[18px] text-body-lg';

    const widthCls = this.block ? 'w-full' : '';

    return [base, variantCls, sizeCls, widthCls, this.cls].filter(Boolean).join(' ');
  }
}
