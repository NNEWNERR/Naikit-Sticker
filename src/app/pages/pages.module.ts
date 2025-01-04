import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { IonicModule } from '@ionic/angular';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { LayoutsModule } from '../components/layouts/layouts.module';
import { UiModule } from '../components/ui.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HomeComponent } from './home/home.component';
import { JobScheduleComponent } from './job-schedule/job-schedule.component';
import { JobsListComponent } from './jobs-list/jobs-list.component';
import { GroupComponent } from './setting/group/group.component';
import { JobComponent } from './setting/job/job.component';
import { SettingComponent } from './setting/setting.component';
import { SiteComponent } from './setting/site/site.component';
import { UserComponent } from './setting/user/user.component';
import { AddJobComponent } from './work-group/add-job/add-job.component';
import { WorkGroupComponent } from './work-group/work-group.component';
import { BookingComponent } from './booking/booking.component';
import { ShowQrCodeComponent } from './show-qr-code/show-qr-code.component';
import { CheckJobComponent } from './check-job/check-job.component';
import { NgxEchartsModule } from 'ngx-echarts';
import { ContactComponent } from './contact/contact.component';
import { BookingSuccessComponent } from './booking-success/booking-success.component';
import { QRCodeModule } from 'angularx-qrcode';
import { LoginComponent } from './login/login.component';
import { BookingGuideComponent } from './booking-guide/booking-guide.component';
import { ServiceComponent } from './service/service.component';
import { HistoryComponent } from './history/history.component';
import { SiteHistoryComponent } from './history/site-history/site-history.component';
import { CreateWorkSheetComponent } from './create-work-sheet/create-work-sheet.component';



@NgModule({
  declarations: [
    DashboardComponent,
    HomeComponent,
    JobScheduleComponent,
    SettingComponent,
    WorkGroupComponent,
    AddJobComponent,
    JobsListComponent,
    UserComponent,
    SiteComponent,
    GroupComponent,
    JobComponent,
    BookingComponent,
    ShowQrCodeComponent,
    CheckJobComponent,
    ContactComponent,
    BookingSuccessComponent,
    LoginComponent,
    BookingGuideComponent,
    ServiceComponent,
    HistoryComponent,
    SiteHistoryComponent,
    CreateWorkSheetComponent
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
    DashboardComponent,LoginComponent
  ],
  providers: [provideNativeDateAdapter()],
})
export class PagesModule { }
