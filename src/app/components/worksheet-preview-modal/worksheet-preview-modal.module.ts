import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { WorksheetPreviewModalComponent } from './worksheet-preview-modal.component';

@NgModule({
  declarations: [WorksheetPreviewModalComponent],
  imports: [
    CommonModule,
    DragDropModule,
    // ... other imports
  ],
  exports: [WorksheetPreviewModalComponent]
})
export class WorksheetPreviewModalModule { } 