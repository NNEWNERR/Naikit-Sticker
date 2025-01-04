import {  CUSTOM_ELEMENTS_SCHEMA, Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  @Input() title: string;
  @Input() modal: boolean = false;
  constructor(
    private modalController: ModalController
  ) { }

  ngOnInit() { }

  dismissModal(){
    this.modalController.dismiss();
  }
}
