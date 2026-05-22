import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DialogModule } from '@angular/cdk/dialog';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LayoutsModule } from './components/layouts/layouts.module';
import { PagesModule } from './pages/pages.module';
import { HttpClientModule } from '@angular/common/http';
import { QRCodeModule } from 'angularx-qrcode';
import { DragDropModule } from '@angular/cdk/drag-drop';

/**
 * App bootstrap — vanilla Angular (no Ionic).
 *
 * CDK Dialog is provided here so the in-house ModalController service
 * (src/app/services/modal.service.ts) can open dialogs anywhere.
 */
@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    HttpClientModule,
    LayoutsModule,
    PagesModule,
    DragDropModule,
    DialogModule,
    QRCodeModule,
  ],
  providers: [
    provideAnimationsAsync(),
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
