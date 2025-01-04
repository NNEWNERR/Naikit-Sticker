import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-booking-success',
  templateUrl: './booking-success.component.html',
  styleUrls: ['./booking-success.component.scss'],
})
export class BookingSuccessComponent implements OnInit {
  image: string
  constructor() { }

  ngOnInit() { 
    this.image = 'assets/success.svg'
  }

}
