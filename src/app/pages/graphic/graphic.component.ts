import { ModalController } from '@ionic/angular';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-graphic',
  templateUrl: './graphic.component.html',
  styleUrls: ['./graphic.component.scss'],
})
export class GraphicComponent implements OnInit {

  designers = [
    {
      title: 'admin',
      value: 'admin',
      disabled: false
    },
    {
      title: 'ฟุ๊ก',
      value: 'ฟุ๊ก',
      disabled: false
    },
    {
      title: 'ไนซ์',
      value: 'ไนซ์',
      disabled: false
    },
    {
      title: 'เลย์',
      value: 'เลย์',
      disabled: false
    },
    {
      title: 'เอก',
      value: 'เอก',
      disabled: false
    },
    {
      title: 'เยาว์',
      value: 'เยาว์',
      disabled: false
    }
  ]
  constructor(
    private modalController: ModalController
  ) { }

  ngOnInit() { }

  onClickDesigner(designer) {
    this.modalController.dismiss(designer.value, 'confirm');
  }
}
