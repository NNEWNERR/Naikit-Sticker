import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AppRoutingModule, routes } from 'src/app/app-routing.module';
import { MainLayoutComponent } from './main-layout/main-layout.component';
import { HeaderComponent } from './header/header.component';
import { ShellComponent, SidebarComponent, BottomNavComponent } from 'src/app/shared/chrome';

@NgModule({
  declarations: [
    MainLayoutComponent,
    HeaderComponent,
  ],
  imports: [
    CommonModule,
    IonicModule,
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
    HeaderComponent,
  ]
})
export class LayoutsModule { }
