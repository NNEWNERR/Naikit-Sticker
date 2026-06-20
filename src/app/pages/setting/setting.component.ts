import { Component, OnInit } from '@angular/core';
import { FirestoreService } from 'src/app/services/firestore.service';
import { UsersService } from 'src/app/services/users.service';

type SettingTab = 'user' | 'site' | 'group' | 'job';

/**
 * Settings — neo-brutalist shell.
 *
 * Replaces the previous ion-segment switcher with the prototype's two-axis
 * layout: left side-nav (desktop) + horizontal tab strip (mobile). The four
 * sub-pages (<app-user>, <app-site>, <app-group>, <app-job>) keep their own
 * data subscriptions and modal flows — this shell only changes the chrome
 * and the active-tab routing.
 *
 * Reproduces redesign/extracted/assets/5e6a9d2a-…js ProtoSettingScreen.
 */
@Component({
  selector: 'app-setting',
  templateUrl: './setting.component.html',
  styleUrls: ['./setting.component.scss'],
})
export class SettingComponent implements OnInit {
  /** Default tab matches the prototype (users first). */
  tab: SettingTab = 'user';

  readonly tabs: { key: SettingTab; icon: string; label: string }[] = [
    { key: 'user',  icon: '👤', label: 'ผู้ใช้งาน' },
    { key: 'group', icon: '👥', label: 'กลุ่มสิทธิ์' },
    { key: 'job',   icon: '🏷️', label: 'ประเภทงาน' },
    { key: 'site',  icon: '🏪', label: 'ข้อมูลร้าน' },
  ];

  constructor(
    private firestoreService: FirestoreService,
    private usersService: UsersService,
  ) {}

  ngOnInit() {}

  setTab(key: string) {
    if (key === 'user' || key === 'site' || key === 'group' || key === 'job') {
      this.tab = key;
    }
  }

  /**
   * Live count for the side-nav badge — reads from FirestoreService's
   * in-memory caches (populated when each sub-page is first opened). Returns
   * null when nothing's loaded yet so we can hide the badge.
   */
  countFor(key: SettingTab): number | null {
    const fs = this.firestoreService;
    switch (key) {
      case 'user':  return this.usersService.users()?.length || null;
      case 'group': return (fs as any).groups?.length || null;
      case 'job':   return fs.allJobs?.length || null;
      case 'site':  return null;
      default:      return null;
    }
  }
}
