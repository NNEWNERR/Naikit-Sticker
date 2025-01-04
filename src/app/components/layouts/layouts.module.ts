import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AppRoutingModule, routes } from 'src/app/app-routing.module';
import { MainLayoutComponent } from './main-layout/main-layout.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './header/header.component';
import { PreloadAllModules, RouterModule } from '@angular/router';



@NgModule({
  declarations: [
    MainLayoutComponent,  
    HeaderComponent,
    SidebarComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    AppRoutingModule,
  ],
  exports: [
    MainLayoutComponent,
    HeaderComponent,
    SidebarComponent
  ]
})
export class LayoutsModule { }
