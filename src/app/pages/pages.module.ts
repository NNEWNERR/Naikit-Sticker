import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { IonicModule } from '@ionic/angular';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { QRCodeModule } from 'angularx-qrcode';
import { NgxEchartsModule } from 'ngx-echarts';
import { LayoutsModule } from '../components/layouts/layouts.module';
import { UiModule } from '../components/ui.module';
import { CreateWorkSheetComponent } from './create-work-sheet/create-work-sheet.component';
import { DragAndDropFileComponent } from './drag-and-drop-file/drag-and-drop-file.component';
import { ProgressComponent } from './drag-and-drop-file/progress/progress.component';
import { EditWorkSheetComponent } from './edit-work-sheet/edit-work-sheet.component';
import { SelectGraphicComponent } from './graphic/graphic.component';
import { HomeComponent } from './home/home.component';
import { SellerComponent } from './home/seller/seller.component';
import { LoginComponent } from './login/login.component';
import { GroupComponent } from './setting/group/group.component';
import { JobComponent } from './setting/job/job.component';
import { SettingComponent } from './setting/setting.component';
import { SiteComponent } from './setting/site/site.component';
import { UserComponent } from './setting/user/user.component';
import { ShowQrCodeComponent } from './show-qr-code/show-qr-code.component';
import { GraphicComponent } from './home/graphic/graphic.component';
import { ProductionComponent } from './home/production/production.component';
import { ReportComponent } from './report/report.component';
import { DiarySummaryComponent } from './diary-summary/diary-summary.component';
import { WorksheetInfoComponent } from './worksheet-info/worksheet-info.component';
import { ShowImageComponent } from './show-image/show-image.component';
import { HorizontalStepProgressBarComponent } from './worksheet-info/horizontal-step-progress-bar/horizontal-step-progress-bar.component';



@NgModule({
  declarations: [
    HomeComponent,
    SettingComponent,
    UserComponent,
    SiteComponent,
    GroupComponent,
    JobComponent,
    ShowQrCodeComponent,
    LoginComponent,
    CreateWorkSheetComponent,
    EditWorkSheetComponent,
    DragAndDropFileComponent,
    ProgressComponent,
    SellerComponent,
    SelectGraphicComponent,
    GraphicComponent,
    ProductionComponent,
    ReportComponent,
    DiarySummaryComponent,
    WorksheetInfoComponent,
    ShowImageComponent,
    HorizontalStepProgressBarComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    NgxEchartsModule,
    NgxDatatableModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    QRCodeModule,
    LayoutsModule,
    UiModule,
  ],
  exports: [
    LoginComponent
  ],
  providers: [provideNativeDateAdapter()],
})
export class PagesModule { }
