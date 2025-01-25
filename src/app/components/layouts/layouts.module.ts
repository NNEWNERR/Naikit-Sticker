import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AppRoutingModule, routes } from 'src/app/app-routing.module';
import { MainLayoutComponent } from './main-layout/main-layout.component';
import { HeaderComponent } from './header/header.component';

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
  ],
  exports: [
    MainLayoutComponent,
    HeaderComponent,
  ]
})
export class LayoutsModule { }
