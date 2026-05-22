import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { QRCodeModule } from 'angularx-qrcode';
import { LayoutsModule } from '../components/layouts/layouts.module';
import { UiModule } from '../components/ui.module';
import { CreateWorkSheetComponent } from './create-work-sheet/create-work-sheet.component';
import { SelectGraphicComponent } from './graphic/graphic.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { GroupComponent } from './setting/group/group.component';
import { JobComponent } from './setting/job/job.component';
import { SettingComponent } from './setting/setting.component';
import { SiteComponent } from './setting/site/site.component';
import { UserComponent } from './setting/user/user.component';
import { ShowQrCodeComponent } from './show-qr-code/show-qr-code.component';
import { ReportComponent } from './report/report.component';
import { DiarySummaryComponent } from './diary-summary/diary-summary.component';
import { WorksheetInfoComponent } from './worksheet-info/worksheet-info.component';
import { ShowImageComponent } from './show-image/show-image.component';
import { WorkItemModalComponent } from './create-work-sheet/work-item-modal/work-item-modal.component';
import { WorksheetPreviewModalComponent } from '../components/worksheet-preview-modal/worksheet-preview-modal.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import {
  ButtonComponent,
  FieldComponent,
  IconComponent,
  PageHeaderComponent,
  KanbanCardComponent,
  KanbanColumnComponent,
  StatCardComponent,
  SegmentedComponent,
  StepProgressComponent,
  TimelineComponent,
  BadgeComponent,
} from '../shared/components';

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
    SelectGraphicComponent,
    ReportComponent,
    DiarySummaryComponent,
    WorksheetInfoComponent,
    ShowImageComponent,
    WorkItemModalComponent,
    WorksheetPreviewModalComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    QRCodeModule,
    LayoutsModule,
    UiModule,
    DragDropModule,
    // Shared standalone primitives (neo-brutalist redesign) — imported here
    // so module-declared pages can use them in templates.
    ButtonComponent,
    FieldComponent,
    IconComponent,
    PageHeaderComponent,
    KanbanCardComponent,
    KanbanColumnComponent,
    StatCardComponent,
    SegmentedComponent,
    StepProgressComponent,
    TimelineComponent,
    BadgeComponent,
  ],
  exports: [
    LoginComponent
  ],
})
export class PagesModule { }
