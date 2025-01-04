import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { LoggedInGuard } from './common/guards/logged-in.guard';
import { MainLayoutComponent } from './components/layouts/main-layout/main-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { HomeComponent } from './pages/home/home.component';
import { JobScheduleComponent } from './pages/job-schedule/job-schedule.component';
import { SettingComponent } from './pages/setting/setting.component';
import { UserComponent } from './pages/setting/user/user.component';
import { WorkGroupComponent } from './pages/work-group/work-group.component';
import { AuthGuard } from './common/guards/auth.guard';
import { BookingComponent } from './pages/booking/booking.component';
import { CheckJobComponent } from './pages/check-job/check-job.component';
import { BookingSuccessComponent } from './pages/booking-success/booking-success.component';
import { LoginComponent } from './pages/login/login.component';
import { BookingGuideComponent } from './pages/booking-guide/booking-guide.component';
import { ServiceComponent } from './pages/service/service.component';
import { HistoryComponent } from './pages/history/history.component';
import { TestComponent } from './test/test.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'krungthon/home',
    pathMatch: 'full'
  },
  {
    path: 'krungthon',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'work-group',
        component: WorkGroupComponent
      },
      {
        path: 'job-schedule',
        component: JobScheduleComponent
      },
      {
        path: 'home',
        component: HomeComponent
      },
      {
        path: 'setting',
        component: SettingComponent
      },
      {
        path: 'service',
        component: ServiceComponent
      },
      {
        path: 'history',
        component: HistoryComponent
      }
    ],
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [LoggedInGuard]
  },
  {
    path: 'booking/:id',
    component: BookingComponent
  },
  {
    path: 'check-job',
    component: CheckJobComponent
  },
  {
    path: 'booking-success',
    component: BookingSuccessComponent
  },
  {
    path: 'booking-guide',
    component: BookingGuideComponent
  },
  {
    path: 'test',
    component: TestComponent
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
