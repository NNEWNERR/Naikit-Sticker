// date-format.ts
import { Inject, Injectable } from '@angular/core';
import { NativeDateAdapter, MatDateFormats, MAT_DATE_LOCALE } from '@angular/material/core';

@Injectable()
export class MyDateAdapter extends NativeDateAdapter {
  constructor(@Inject(MAT_DATE_LOCALE) matDateLocale: string) {
    super(matDateLocale);
  }

  parse(value: string): Date | null {
    const [day, month, year] = value.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  format(date: Date, displayFormat: string): string {
    const day = this._to2digit(date.getDate());
    const month = this._to2digit(date.getMonth() + 1);
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private _to2digit(n: number): string {
    return n.toString().padStart(2, '0');
  }
}

export const MY_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};
