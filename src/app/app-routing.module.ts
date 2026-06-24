import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard } from './common/guards/auth.guard';
import { loggedInGuard } from './common/guards/logged-in.guard';
import { roleGuard } from './common/guards/role.guard';
import { MainLayoutComponent } from './components/layouts/main-layout/main-layout.component';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { SettingComponent } from './pages/setting/setting.component';
import { ReportComponent } from './pages/report/report.component';
import { DiarySummaryComponent } from './pages/diary-summary/diary-summary.component';
import { CreateWorkSheetComponent } from './pages/create-work-sheet/create-work-sheet.component';
import { FinanceComponent } from './pages/finance/finance.component';
import { CombinedPaymentComponent } from './pages/combined-payment/combined-payment.component';

// RBAC per SCHEMA.md — home is open to every authenticated role
// (component renders the queue relevant to that role).
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'naikit-sticker/home',
    pathMatch: 'full',
  },
  {
    path: 'naikit-sticker',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'home', component: HomeComponent },
      {
        path: 'all',
        component: ReportComponent,
        canActivate: [roleGuard(['admin', 'seller', 'finance'])],
      },
      {
        path: 'setting',
        component: SettingComponent,
        canActivate: [roleGuard(['admin'])],
      },
      {
        path: 'diary-summary',
        component: DiarySummaryComponent,
        canActivate: [roleGuard(['admin', 'seller', 'finance'])],
      },
      {
        path: 'create-work-sheet',
        component: CreateWorkSheetComponent,
        canActivate: [roleGuard(['seller', 'admin'])],
      },
      {
        path: 'create-work-sheet/:jobId',
        component: CreateWorkSheetComponent,
        canActivate: [roleGuard(['seller', 'admin'])],
      },
      {
        path: 'finance',
        component: FinanceComponent,
        canActivate: [roleGuard(['admin', 'finance'])],
      },
      {
        path: 'combined-payment',
        component: CombinedPaymentComponent,
        canActivate: [roleGuard(['seller', 'finance', 'admin'])],
      },
    ],
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [loggedInGuard],
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule { }
