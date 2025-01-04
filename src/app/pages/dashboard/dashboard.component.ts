import { Unsubscribe } from 'firebase/auth';
import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import * as dayjs from 'dayjs';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts';
import { JobInfoComponent } from 'src/app/components/modals/job-info/job-info.component';
import { FirestoreService } from 'src/app/services/firestore.service';
import { ServiceService } from 'src/app/services/service.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  jobs = [];
  usageCount: number = 1030;
  statusCounts = [
    {
      name: 'Pending',
      value: 0
    },
    {
      name: 'Booked',
      value: 0
    },
    {
      name: 'Completed',
      value: 0
    },
    {
      name: 'Canceled',
      value: 0
    },
    {
      name: 'Rejected',
      value: 0
    },
  ]
  report: [
    {
      value: 10,
      itemStyle: {
        color: '#FF2424',
        borderRadius: [0, 24, 24, 0]
      }
    },
    {
      value: 50,
      itemStyle: {
        color: '#FFA215',
        borderRadius: [0, 24, 24, 0]
      }
    },
    {
      value: 200,
      itemStyle: {
        color: '#5383FF',
        borderRadius: [0, 24, 24, 0]
      }
    },
    {
      value: 200,
      itemStyle: {
        color: '#47CF5D',
        borderRadius: [0, 24, 24, 0]
      }
    },
    {
      value: 250,
      itemStyle: {
        color: '#66C0F2',
        borderRadius: [0, 24, 24, 0]
      }
    },
    {
      value: 280,
      itemStyle: {
        color: '#9F65FF',
        borderRadius: [0, 24, 24, 0]
      }
    }
  ]
  PieChart!: EChartsOption;
  SeparateChart!: EChartsOption;
  distributeByTimeChart!: EChartsOption;
  date = new Date()
  unsubscribe

  constructor(
    private firestoreService: FirestoreService,
    private service: ServiceService,
    private modalController: ModalController
  ) { }

  ngOnInit() {
    this.unsubscribe = this.firestoreService.jobDashboardChange.subscribe(async (data) => {
      this.jobs = data;
      await this.filterStatus().then(() => {
        this.PieChartComponent()
      });
    })
    this.searchJobsToday()
  }

  ngOnDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe.unsubscribe();
    }
  }

  async searchJobs() {
    this.firestoreService.fetchDataDashboard(this.date);
  }

  async searchJobsToday() {
    const date = new Date().setHours(0, 0, 0, 0);
    const formatQueryDate = new Date(date);
    formatQueryDate.setDate(formatQueryDate.getDate());
    this.firestoreService.fetchDataDashboard(formatQueryDate);
  }

  filterStatus() {
    const statusCounts = this.jobs.reduce((counts, job) => {
      counts[job.status] = (counts[job.status] || 0) + 1;
      return counts;
    }, {});
    const { PENDING, BOOKED, COMPLETED, CANCELED, REJECTED } = statusCounts;
    this.usageCount = (PENDING || 0) + (BOOKED || 0) + (COMPLETED || 0) +
      (CANCELED || 0) + (REJECTED || 0);
    this.statusCounts = [
      {
        name: 'Pending',
        value: PENDING || 0
      },
      {
        name: 'Booked',
        value: BOOKED || 0
      },
      {
        name: 'Completed',
        value: COMPLETED || 0
      },
      {
        name: 'Canceled',
        value: CANCELED || 0
      },
      {
        name: 'Rejected',
        value: REJECTED || 0
      }
    ]
    return Promise.resolve();
  }

  formatDate(date) {
    return dayjs(date).startOf('day').format('ddd MMM DD YYYY 00:00:00 [GMT+0700]');
  }

  PieChartComponent() {
    //  '#9F65FF','#5383FF', '#66C0F2','#47CF5D','#FFA215',  '#FF2424',
    this.PieChart = {
      color: [ '#5383FF', '#66C0F2', '#47CF5D', '#FFA215','#FF2424', ],
      // title: {
      //   text: 'Usage count',
      //   subtext: `${this.usageCount}`,
      //   left: 'center',
      //   top: '43%',
      //   textStyle: {
      //     fontWeight: 'normal',
      //     fontSize: 18
      //   },
      //   subtextStyle: {
      //     fontWeight: 'bold',
      //     fontSize: 36,
      //     color: '#000000'
      //   }
      // },
      title: {
        text: 'Krungthon Air',
        subtext: `งานทั้งหมด ${this.usageCount}`,
        left: 'center'
      },
      legend: {
        top: 'bottom',
        left: 'center',
        // orient: 'vertical',
        // left: 'left',
      },
      tooltip: {
        trigger: 'item'
      },
      series: [
        {
          name: 'Daily Usage',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: false,
              fontSize: 40,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: [...this.statusCounts]
        }
      ]
    };
  }

  SeparateChartComponent() {
    this.SeparateChart = {
      // color: ['#9F65FF', '#66C0F2', '#47CF5D', '#5383FF', '#FFA215', '#FF2424'],
      title: {
        text: 'Separate by service:'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        // boundaryGap: [0, 0.01]
      },
      yAxis: {
        type: 'category',
        data: ['Error', 'Rate limit', 'Face recognition', 'Liveness', 'Id card OCR', 'Face quality'],
      },
      series: [
        {
          type: 'bar',
          showBackground: true,
          barWidth: 18,
          backgroundStyle: {
            color: 'rgba(220, 220, 220, 0.8)',
            borderRadius: [0, 24, 24, 0]
          },
          data: [
            {
              value: 10,
              itemStyle: {
                color: '#FF2424',
                borderRadius: [0, 24, 24, 0]
              }
            },
            {
              value: 50,
              itemStyle: {
                color: '#FFA215',
                borderRadius: [0, 24, 24, 0]
              }
            },
            {
              value: 200,
              itemStyle: {
                color: '#5383FF',
                borderRadius: [0, 24, 24, 0]
              }
            },
            {
              value: 200,
              itemStyle: {
                color: '#47CF5D',
                borderRadius: [0, 24, 24, 0]
              }
            },
            {
              value: 250,
              itemStyle: {
                color: '#66C0F2',
                borderRadius: [0, 24, 24, 0]
              }
            },
            {
              value: 280,
              itemStyle: {
                color: '#9F65FF',
                borderRadius: [0, 24, 24, 0]
              }
            }
          ],
        },
      ]
    };
  }

  distributeByTimeChartComponent() {
    this.distributeByTimeChart = {
      color: ['#9F65FF', '#66C0F2', '#47CF5D', '#5383FF', '#FFA215', '#FF2424'],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      yAxis: {
        type: 'value'
      },
      xAxis: {
        type: 'category',
        data: ['1:00', '2:00', '3:00', '4:00', '5:00', '6:00', '7:00', '8:00', '9:00', '10:00', '11:00', '12:00 ', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '24:00'],
      },
      series: [
        //'Error', 'Rate limit', 'Face recognition', 'Liveness', 'Id card OCR', 'Face quality'
        {
          name: 'Error',
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 5, 4, 3, 5, 50, 0, 0, 0, 0, 0],
          type: 'bar',
          stack: 'x'
        },
        {
          name: 'Rate limit',
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 4, 3, 50, 10, 0, 0, 0, 0, 0],
          type: 'bar',
          stack: 'x'
        },
        {
          name: 'Face recognition',
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 5, 40, 3, 5, 10, 0, 0, 0, 0, 0],
          type: 'bar',
          stack: 'x'
        },
        {
          name: 'Liveness',
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 50, 4, 3, 5, 10, 0, 0, 0, 0, 0],
          type: 'bar',
          stack: 'x'
        },
        {
          name: 'Id card OCR',
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 5, 4, 3, 5, 10, 0, 0, 0, 0, 0],
          type: 'bar',
          stack: 'x'
        },
        {
          name: 'Face quality',
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 5, 4, 3, 5, 10, 0, 0, 0, 0, 0],
          type: 'bar',
          stack: 'x'
        },
      ]
    };
  }
}
