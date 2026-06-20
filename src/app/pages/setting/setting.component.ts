import { Component } from '@angular/core';

/**
 * Settings shell. The v1 group / job-type / site sub-tabs were removed in the
 * v2 rebuild (those collections no longer exist), so settings is now just user
 * management — <app-user> renders directly inside the brutal card.
 */
@Component({
  selector: 'app-setting',
  templateUrl: './setting.component.html',
  styleUrls: ['./setting.component.scss'],
})
export class SettingComponent {}
