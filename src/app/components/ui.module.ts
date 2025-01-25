import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { IonicModule } from '@ionic/angular';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
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
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    NgxDatatableModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    LayoutsModule,
    AppRoutingModule
  ],
  exports: [
    InputComponent,
    SelectComponent
  ]
})
export class UiModule { }
