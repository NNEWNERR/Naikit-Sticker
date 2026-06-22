import { Component } from '@angular/core';
import { AppStateService } from 'src/app/services/app-state.service';

/**
 * Settings shell. The v1 group / job-type / site sub-tabs were removed in the
 * v2 rebuild (those collections no longer exist). settings = user management
 * (<app-user>) + ราคากลาง/rate card (<app-rate-card>, admin เท่านั้น — F7).
 */
@Component({
  selector: 'app-setting',
  templateUrl: './setting.component.html',
  styleUrls: ['./setting.component.scss'],
})
export class SettingComponent {
  constructor(private appState: AppStateService) {}

  get isAdmin(): boolean {
    return this.appState.role() === 'admin';
  }
}
