import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-setting',
  templateUrl: './setting.component.html',
  styleUrls: ['./setting.component.scss'],
})
export class SettingComponent implements OnInit {
  segment = 'site';
  segment_option = [
    {
      title: 'user',
      value: 'user'
    }, 
    {
      title: 'site',
      value: 'site'
    },
    {
      title: 'group',
      value: 'group'
    },
    {
      title: 'job',
      value: 'job'
    },
  ]
  constructor() { }

  ngOnInit() { }
  segmentChanged(event) {
    this.segment = event.target.value;
  }
}
