import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, forwardRef } from '@angular/core';
import { FormControl, FormGroup, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-input',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    }
  ]
})
export class InputComponent implements OnInit {
  @ViewChild('childrenWrapper') content: ElementRef<HTMLElement>;
  @Output() inputChange = new EventEmitter<string>();
  @Input() typeInput: string;
  @Input() parentForm: FormGroup;
  @Input() formControlName: string;
  @Input() label: string;
  @Input() placeholder: string;
  @Input() type = 'text';
  @Input() disabled: boolean;
  @Input() upperCase: boolean;
  @Input() keyup: (event: Event) => void;

  value: string;
  changed: (value: string) => void;
  touched: () => void;

  constructor() {

  }

  ngOnInit() {

  }
  // get styledLabel(): any {
  //   if (!this.label) {
  //     return '';
  //   }
  //   return this.label.replace(/(\*$)/, `<span class="text-red-500">$1</span>`);
  // }

  get formField(): FormControl {
    return this.parentForm?.get(this.formControlName) as FormControl;
  }

  get isRequired() {
    // get validations from the formControl
    const control = this.parentForm.get(this.formControlName);
    if (control && control.validator) {
      const validator = control.validator({} as FormControl);
      if (validator && validator?.["required"]) {
        return true;
      }
    }
    return false
  }

  get errorMessage(): string {
    if (this.formField.errors && Object.keys(this.formField.errors).length) {
      return Object.keys(this.formField.errors)[0];
    }
    return '';
  }
  public onKeyUp(event: Event): void {
    this.keyup(event);
  }

  public writeValue(value: string): void {
    this.value = value;
  }

  public onChange(event: Event): void {
    const value: string =
      (event.target as HTMLInputElement).value;
    this.touched();
    this.changed(value);
    this.inputChange.emit(value);
  }

  public registerOnChange(fn: any): void {
    this.changed = fn;
  }

  public registerOnTouched(fn: any): void {
    this.touched = fn;
  }

  public setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
