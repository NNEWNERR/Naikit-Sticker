import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './common/guards/auth.guard';
import { LoggedInGuard } from './common/guards/logged-in.guard';
import { MainLayoutComponent } from './components/layouts/main-layout/main-layout.component';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { SettingComponent } from './pages/setting/setting.component';
import { TestComponent } from './test/test.component';
import { ReportComponent } from './pages/report/report.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'naikit-sticker/home',
    pathMatch: 'full'
  },
  {
    path: 'naikit-sticker',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'home',
        component: HomeComponent
      },
      {
        path: 'all',
        component: ReportComponent
      },
      {
        path: 'setting',
        component: SettingComponent
      },
    ],
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [LoggedInGuard]
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
