import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from '../app-routing.module';
import { InputComponent } from './forms/input/input.component';
import { SelectComponent } from './forms/select/select.component';
import { LayoutsModule } from './layouts/layouts.module';
import { SettingAddComponent } from './modals/setting-add/setting-add.component';
import { SettingEditComponent } from './modals/setting-edit/setting-edit.component';


@NgModule({
  declarations: [
    InputComponent,
    SelectComponent,
    SettingAddComponent,
    SettingEditComponent,
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
