import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AppRoutingModule } from '../app-routing.module';
import { AddJobComponent } from '../pages/work-group/add-job/add-job.component';
import { LayoutsModule } from './layouts/layouts.module';
import { InputComponent } from './forms/input/input.component';
import { SelectComponent } from './forms/select/select.component';
import { SettingAddComponent } from './modals/setting-add/setting-add.component';
import { SettingEditComponent } from './modals/setting-edit/setting-edit.component';
import { JobInfoComponent } from './modals/job-info/job-info.component';
import { CheckJobComponent } from '../pages/check-job/check-job.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { CreateWorkSheetComponent } from '../pages/create-work-sheet/create-work-sheet.component';



@NgModule({
  declarations: [
    InputComponent,
    SelectComponent,
    SettingAddComponent,
    SettingEditComponent,
    JobInfoComponent,
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
