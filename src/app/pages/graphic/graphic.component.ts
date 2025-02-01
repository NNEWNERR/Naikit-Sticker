import { ModalController } from '@ionic/angular';
import { Component, Input, OnInit } from '@angular/core';
import { DESIGNER_OPTION } from 'src/app/data/data';

@Component({
  selector: 'app-select-graphic',
  templateUrl: './graphic.component.html',
  styleUrls: ['./graphic.component.scss'],
})
export class SelectGraphicComponent implements OnInit {
  @Input() option: any;
  designers = DESIGNER_OPTION.slice(1);
  constructor(
    private modalController: ModalController
  ) { }

  ngOnInit() { }

  onClickDesigner(employee) {
    this.modalController.dismiss(employee.value, 'confirm');
  }
}
