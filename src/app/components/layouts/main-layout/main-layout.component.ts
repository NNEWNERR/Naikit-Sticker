import { Component, OnInit } from '@angular/core';
import { signOut } from 'src/app/common/constant/alert-messages';
import { AuthService } from 'src/app/services/auth.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import { ServiceService } from 'src/app/services/service.service';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
})
export class MainLayoutComponent implements OnInit {
  public appPages = [
    { title: 'home', url: '/krungthon/home', icon: 'home' },
    { title: 'dashboard', url: '/krungthon/dashboard', icon: 'pie-chart' },
    { title: 'ประวัติการจอง', url: '/krungthon/history', icon: 'book' },
    { title: 'ตารางงาน', url: '/krungthon/job-schedule', icon: 'calendar' },
    { title: 'ทีมงาน', url: '/krungthon/work-group', icon: 'people-circle' },
    { title: 'ตั้งค่า', url: '/krungthon/setting', icon: 'settings' },
  ];
  phone
  constructor(
    private authService: AuthService,
    private service: ServiceService,
    private firestoreService: FirestoreService,
  ) { }
  async ngOnInit() {
    // await disableNetwork(db);
    this.service.presentLoadingWithOutTime2('Loading...');
    const isLogedIn = await this.authService.SessionIsLogedIn();
    if (isLogedIn == true) {
      await this.authService.checkAuth().then((res) => {
        if (res == true) {
          const UserFormAuth = this.authService.getUserFormAuth();
          this.phone = this.formatPhoneNumber(UserFormAuth.phoneNumber);
          this.firestoreService.fetchDataUser(this.phone).then(async (users) => {
            this.service.dismissLoading2();
            if (users.length > 0) {
              const site = await this.firestoreService.fetchDataSite(users[0].project_id);
              const group = await this.firestoreService.fetchDataGroup(users[0].project_id);
            }
          });
        } else {
          this.authService.signout().finally(() => {
            this.service.dismissLoading2();
          })
        }
      });
    }
  }
  formatPhoneNumber(phoneNumber: any) {
    if (phoneNumber.length === 12 && phoneNumber.startsWith("+66")) {
      return "0" + phoneNumber.substring(3);
    } else if (phoneNumber.length === 10 && phoneNumber.startsWith("0")) {
      return phoneNumber;
    }
  }

  logout() {
    const { header, message } = signOut();
    this.service.showAlert(header, message, () => {
      this.authService.signout();
    }, { confirmOnly: false });
  }
}