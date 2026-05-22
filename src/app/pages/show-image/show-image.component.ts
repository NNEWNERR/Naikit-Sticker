import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

/**
 * Show Image — full-screen image viewer modal.
 * No prototype mapping; chrome restyled to match the system (ink toolbar,
 * brutal close button).
 */
@Component({
  selector: 'app-show-image',
  templateUrl: './show-image.component.html',
  styleUrls: ['./show-image.component.scss'],
})
export class ShowImageComponent implements OnInit {
  @Input() image: any;

  constructor(private modalController: ModalController) {}

  ngOnInit() {}

  close() {
    this.modalController.dismiss();
  }
}
