import { Component, Input, OnInit } from '@angular/core';
import { STATUS_OPTION } from 'src/app/data/data';

@Component({
  selector: 'app-horizontal-step-progress-bar',
  templateUrl: './horizontal-step-progress-bar.component.html',
  styleUrls: ['./horizontal-step-progress-bar.component.scss'],
})
export class HorizontalStepProgressBarComponent implements OnInit {
  @Input() currentStatus: string = 'รอออกแบบ';
  statusOptions = STATUS_OPTION.slice(1);

  constructor() { }

  ngOnInit() { }

  getStatusIndex(status: string): number {
    return this.statusOptions.findIndex(s => s.value === status);
  }
}
