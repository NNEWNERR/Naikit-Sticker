import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from 'src/app/app-routing.module';
import { MainLayoutComponent } from './main-layout/main-layout.component';
import { ShellComponent, SidebarComponent, BottomNavComponent } from 'src/app/shared/chrome';

@NgModule({
  declarations: [
    MainLayoutComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    AppRoutingModule,
    // Redesign chrome (standalone components, imported here so the
    // NgModule-declared MainLayoutComponent template can use them).
    ShellComponent,
    SidebarComponent,
    BottomNavComponent,
  ],
  exports: [
    MainLayoutComponent,
  ]
})
export class LayoutsModule { }
