import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatCalendarCellClassFunction } from '@angular/material/datepicker';
import { ModalController } from '@ionic/angular';
import { SelectionType } from '@swimlane/ngx-datatable';
import * as dayjs from 'dayjs';
import { subscribeOn } from 'rxjs';
import { JobInfoComponent } from 'src/app/components/modals/job-info/job-info.component';
import { SettingEditComponent } from 'src/app/components/modals/setting-edit/setting-edit.component';
import { FirestoreService } from 'src/app/services/firestore.service';
import { ServiceService } from 'src/app/services/service.service';

@Component({
  selector: 'app-job-schedule',
  templateUrl: './job-schedule.component.html',
  styleUrls: ['./job-schedule.component.scss'],
  encapsulation: ViewEncapsulation.None,
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobScheduleComponent implements OnInit {
  uniqueDay;
  date = new Date()
  selectedColor = '';
  time = {
    // '8.00': '',
    '9.00': '',
    '10.00': '',
    '11.00': '',
    '12.00': '',
    '13.00': '',
    '14.00': '',
    '15.00': '',
    '16.00': '',
    '17.00': '',
    '18.00': ''
  }
  // colors = Color.filter((color: any) => color.includes('400'));
  column = [
    // '8.00',
    '9.00',
    '10.00',
    '11.00',
    '12.00',
    '13.00',
    '14.00',
    '15.00',
    '16.00']
  rows = []
  sites = []
  subscriptions = []

  constructor(
    private firestoreService: FirestoreService,
    private service: ServiceService,
    private modalController: ModalController
  ) { }

  ngOnInit() {
    const subscriptionJobsChange = this.firestoreService.jobsChange.subscribe((jobs) => {
      this.initRows(this.sites);
      if (jobs.length > 0) {
        this.jobs = jobs;
        this.updateRow();
      }
    })
    const subscriptionSchedules = this.firestoreService.schedulesChange.subscribe((schedules) => {
      let day = schedules.map((schedule) => {
        return this.formatDate(schedule.book.date.seconds * 1000)
      })
      this.uniqueDay = [...new Set(day)];
    })
    this.subscriptions.push(subscriptionJobsChange)
    this.subscriptions.push(subscriptionSchedules)
    const interval = setInterval(() => {
      this.getSites().then(() => {
        if (this.sites.length > 0) {
          this.initRows(this.sites);
          this.searchJobsToday();
          this.searchJobsSchedule()
          clearInterval(interval);
        }
      })
    }, 1000);
  }

  ngOnDestroy() {
    if (this.subscriptions) {
      this.subscriptions.forEach(subscription => {
        subscription.unsubscribe();
      });
    }
  }

  dateClass: MatCalendarCellClassFunction<Date> = (cellDate, view) => {
    if (view === 'month') {
      const date = cellDate.getDate();
      const today = new Date();

      // Calculate the difference in time
      const diffTime = cellDate.getTime() - today.getTime();

      // Calculate the difference in days
      const diffDays = (Math.ceil(diffTime / (1000 * 60 * 60 * 24)));;
      // const uniqueDay = this.uniqueDay.map((day) => this.removeZeros(day))

      // Highlight the date if it's within the next 30 days
      if (diffDays >= 0 && diffDays < 30 && this.uniqueDay) {
        return this.uniqueDay.includes(this.padZero(date)) ? 'example-custom-date-class' : '';
      }
    }
    return '';
  };

  removeZeros(numbers: string): string {
    return numbers.split(' ').map(num => num.replace(/^0/, '')).join(' ');
  }

  padZero = (num) => {
    return num.toString().padStart(2, '0');
  }

  async getSites() {
    const sites = await this.firestoreService.getSites()
    if (sites.length > 0) {
      return this.sites = sites.filter((site: any) => site.group_id !== '');
    } else {
      return this.sites = [];
    }
  }

  initRows(sites) {
    this.rows = sites.map((site: any) => {
      return {
        ...site,
        time: {
          // '8.00': '',
          '9.00': '',
          '10.00': '',
          '11.00': '',
          '12.00': '',
          '13.00': '',
          '14.00': '',
          '15.00': '',
          '16.00': '',
          '17.00': '',
          '18.00': ''
        }
      }
    })
  }

  onActivate(event: Event) {
    if (event.type === "click") {
      console.log(event)
    }
  }

  getRowClass(row) {
    return row.group !== null ? row.group.color : 'bg-white';
  }

  jobs: any = [];
  async searchJobs() {
    await this.firestoreService.fetchDataJob(this.date);
  }

  async searchJobsToday() {
    const date = new Date().setHours(0, 0, 0, 0);
    const formatQueryDate = new Date(date);
    formatQueryDate.setDate(formatQueryDate.getDate());
    await this.firestoreService.fetchDataJob(formatQueryDate);
  }

  async searchJobsSchedule() {
    const date = new Date().setHours(0, 0, 0, 0);
    const formatQueryDate = new Date(date);
    formatQueryDate.setDate(formatQueryDate.getDate());
    await this.firestoreService.fetchDataJobSchedules(formatQueryDate);
  }

  onSelect(job) {
    this.modalController.create({
      component: SettingEditComponent,
      componentProps: {
        type: 'job',
        job: job
      },
      cssClass: 'my-custom-class',
    }).then(modal => modal.present());
  }

  randomTime() {
    const hours = ["9.00", "10.00", "11.00", "12.00", "13.00", "14.00", "15.00", "16.00"];
    const randomHourIndex = Math.floor(Math.random() * hours.length);
    const randomHour = hours[randomHourIndex];
    const hourNumber = parseInt(randomHour.split(".")[0]);
    return { time: randomHour, hour: hourNumber };
  }

  updateRow() {
    this.jobs.filter((job: any) => {
      if (job.book.time) {
        job.book.time.forEach((time: any) => {
          this.rows.filter((row: any) => {
            if (row.site_id === job.site_id) {
              row.time[time] = {
                name: `${job.address} ${job.type}`,
                status: job.status || '',
                is_qrcode: job.is_qrcode || false,
                job: job
              };
            }
          })
        });
      }
    })
  }

  formatDate(date) {
    return dayjs(date).startOf('day').format('DD');
  }
}
