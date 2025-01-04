import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-booking-guide',
  templateUrl: './booking-guide.component.html',
  styleUrls: ['./booking-guide.component.scss'],
})
export class BookingGuideComponent implements OnInit {
  guides = [
    {
      name: 'ขั้นตอนที่ 1',
      image:'https://placehold.co/400x600?text=Guide 1',
      description: 'เลือกวันที่ต้องการจอง'
    },
    {
      name: 'ขั้นตอนที่ 2',
      image:'https://placehold.co/400x600?text=Guide 2',
      description: 'เลือกเวลา'
    },
    {
      name: 'ขั้นตอนที่ 3',
      image:'https://placehold.co/400x600?text=Guide 3',
      description: 'กรอกรายละเอียด'
    },
  ]
  constructor(
    private modalController: ModalController
  ) { }

  ngOnInit() { }

  closeModal(){
    this.modalController.dismiss();
  }
}
