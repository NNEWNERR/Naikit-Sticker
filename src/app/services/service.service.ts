import { Injectable } from '@angular/core';
import { AlertController, LoadingController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class ServiceService {
  loading: any;
  loading2: any;
  constructor(private loadingController: LoadingController,
    private alert: AlertController) { }
  async presentLoadingWithOutTime(massage: string) {
    this.loading = await this.loadingController.create({
      message: massage,
    });
    await this.loading.present();
  }

  //loading Cancel
  async dismissLoading() {
    if (this.loading) {
      await this.loading.dismiss();
    }
  } 
  async presentLoadingWithOutTime2(massage: string) {
    this.loading2 = await this.loadingController.create({
      message: massage,
    });
    await this.loading2.present();
  }

  //loading Cancel
  async dismissLoading2() {
    if (this.loading2) {
      await this.loading2.dismiss();
    }
  }

  //alertPresent
  AlertPresent(header: string, message: string) {
    this.alert.create({
      header: header,
      message: message,
      buttons: [
        // {
        //   text: 'ยกเลิก',
        //   role: 'cancel',
        // },
        {
          text: 'ตกลง',
          handler: () => {
          }
        }
      ]
    }).then(alert => {
      alert.present();
    });
  }
  async showAlert(header: string, message: string, confirmHandler: Function, options: {
    confirmText?: string;
    confirmOnly?: boolean;
    cssClass?: string;
  } = {}, cancelHandler?: Function): Promise<boolean> {
    const buttons: any[] = [];
    if (options.confirmOnly) {
      buttons.push({
        text: options.confirmText || 'ตกลง',
        role: 'confirm',
        cssClass: 'confirm-button',
        handler: () => confirmHandler(),
      });
    } else {
      buttons.push(
        {
          text: 'ยกเลิก',
          role: 'cancel',
          handler: () => cancelHandler ? cancelHandler() : false,
        },
        {
          text: options.confirmText || 'ยืนยัน',
          role: 'confirm',
          cssClass: 'confirm-button',
          handler: () => confirmHandler(),
        }
      );
    }
    const alert = await this.alert.create({
      mode: 'ios',
      header,
      message,
      buttons,
      cssClass: options.cssClass,
    });
    await alert.present();
    return (await alert.onDidDismiss()).role === 'confirm';
  }
}
