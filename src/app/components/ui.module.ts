import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from '../app-routing.module';
import { InputComponent } from './forms/input/input.component';
import { SelectComponent } from './forms/select/select.component';
import { LayoutsModule } from './layouts/layouts.module';


@NgModule({
  declarations: [
    InputComponent,
    SelectComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LayoutsModule,
    AppRoutingModule
  ],
  exports: [
    InputComponent,
    SelectComponent
  ]
})
export class UiModule { }
