import { group } from '@angular/animations';
import { Component, Input, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { SafeUrl } from '@angular/platform-browser';
import { ModalController } from '@ionic/angular';
import { FixMeLater, QRCodeElementType, QRCodeErrorCorrectionLevel } from 'angularx-qrcode';
import * as dayjs from 'dayjs';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

import * as QRCode from 'qrcode';
import { db } from 'src/app/services/firebase-config';
@Component({
  selector: 'app-show-qr-code',
  templateUrl: './show-qr-code.component.html',
  styleUrls: ['./show-qr-code.component.scss'],
})
export class ShowQrCodeComponent implements OnInit {
  @Input() site: any;
  group: any;
  qrCodeText: string = '';
  public initial_state = {
    allowEmptyString: false,
    alt: "A custom alt attribute",
    ariaLabel: `QR Code image with the following content...`,
    colorDark: "#000000ff",
    colorLight: "#ffffffff",
    cssClass: "center",
    elementType: "canvas" as QRCodeElementType,
    errorCorrectionLevel: "M" as QRCodeErrorCorrectionLevel,
    imageSrc: "../../assets/icon/angular-logo.png",
    imageHeight: 75,
    imageWidth: 75,
    margin: 4,
    qrdata: "https://github.com/Cordobo/angularx-qrcode",
    scale: 1,
    version: undefined,
    title: "A custom title attribute",
    width: 300,
  }

  public data_model = {
    ...this.initial_state,
  }

  public allowEmptyString: boolean
  public alt: string
  public ariaLabel: string
  public colorDark: string
  public colorLight: string
  public cssClass: string
  public elementType: QRCodeElementType
  public errorCorrectionLevel: QRCodeErrorCorrectionLevel
  public imageSrc?: string
  public imageHeight?: number
  public imageWidth?: number
  public margin: number
  public qrdata: string
  public scale: number
  public title: string
  public width: number

  public qrCodeSrc!: SafeUrl

  public selected = new FormControl(0)

  // public marginList: ListType
  // public scaleList: ListType
  // public widthList: ListType

  public showA11y: boolean
  public showColors: boolean
  public showCss: boolean
  public showImage: boolean

  constructor(
    private modalController: ModalController
  ) {
    // this.marginList = [
    //   { title: "4 (Default)", val: 4 },
    //   { title: "0", val: 0 },
    //   { title: "10", val: 10 },
    //   { title: "25", val: 25 },
    // ]

    // this.scaleList = [
    //   { title: "128", val: 128 },
    //   { title: "64", val: 64 },
    //   { title: "32", val: 32 },
    //   { title: "8", val: 8 },
    //   { title: "4", val: 4 },
    //   { title: "1 (Default)", val: 1 },
    // ]

    // this.widthList = [
    //   { title: "400", val: 400 },
    //   { title: "300", val: 300 },
    //   { title: "200", val: 200 },
    //   { title: "100", val: 100 },
    //   { title: "50", val: 50 },
    //   { title: "10 (Default)", val: 10 },
    // ]
  }

  async ngOnInit(): Promise<void> {
    const querySnapshot = await getDocs(query(collection(db, "groups"), where("id", "==", this.site.group_id)))
    querySnapshot.forEach((doc) => {
      this.group = doc.data();
    });

    this.showA11y = true
    this.showColors = true
    this.showCss = true
    this.showImage = false

    this.allowEmptyString = this.data_model.allowEmptyString
    this.alt = this.site.name
    this.ariaLabel = this.data_model.ariaLabel
    this.colorDark = this.data_model.colorDark
    this.colorLight = this.data_model.colorLight
    this.cssClass = this.data_model.cssClass
    this.elementType = this.data_model.elementType
    this.errorCorrectionLevel = this.data_model.errorCorrectionLevel
    this.imageSrc = this.showImage ? this.data_model.imageSrc : undefined
    this.imageHeight = this.showImage ? this.data_model.imageHeight : undefined
    this.imageWidth = this.showImage ? this.data_model.imageWidth : undefined
    this.margin = this.data_model.margin
    this.qrdata = 'https://krungthon-air.web.app/booking/' + this.site.key;
    this.scale = this.data_model.scale
    this.title = this.site.name
    this.width = this.data_model.width
  }

  // Change value programatically
  changeMargin(newValue: number): void {
    this.margin = newValue
  }

  reset(): void {
    this.allowEmptyString = this.data_model.allowEmptyString
    this.alt = this.data_model.alt
    this.ariaLabel = this.data_model.ariaLabel
    this.colorDark = this.data_model.colorDark
    this.colorLight = this.data_model.colorLight
    this.cssClass = this.data_model.cssClass
    this.elementType = this.data_model.elementType
    this.errorCorrectionLevel = this.data_model.errorCorrectionLevel
    this.imageSrc = this.data_model.imageSrc
    this.imageHeight = this.data_model.imageHeight
    this.imageWidth = this.data_model.imageWidth
    this.margin = this.data_model.margin
    this.qrdata = this.data_model.qrdata
    this.scale = this.data_model.scale
    this.title = this.data_model.title
    this.width = this.data_model.width

    this.setA11yVisibility(true)
    this.setColorsVisibility(true)
    this.setCssVisibility(true)
    this.setImageVisibility(true)

    // this._snackBar.open("All values resetted", "close")
  }

  setTabIndex(idx: number): boolean {
    this.selected.setValue(idx)
    return false
  }

  setA11yVisibility(enable?: boolean): void {
    this.showA11y = enable ? enable : !this.showA11y
  }

  setColorsVisibility(enable?: boolean): void {
    this.showColors = enable ? enable : !this.showColors
  }

  setCssVisibility(enable?: boolean): void {
    this.showCss = enable ? enable : !this.showCss
  }

  setImageVisibility(enable?: boolean): void {
    this.showImage = enable !== undefined ? enable : !this.showImage
    this.imageSrc = this.showImage ? this.data_model.imageSrc : undefined

    if (this.showImage) {
      this.elementType = this.data_model.elementType
      this.imageHeight = this.data_model.imageHeight
      this.imageWidth = this.data_model.imageWidth
    }
  }

  // Re-enable, when a method to download images has been implemented
  onChangeURL(url: SafeUrl) {
    this.qrCodeSrc = url
  }

  saveAsImage(parent: FixMeLater) {
    let parentElement = null

    if (this.elementType === "canvas") {
      // fetches base 64 data from canvas
      parentElement = parent.qrcElement.nativeElement
        .querySelector("canvas")
        .toDataURL("image/png")
    } else if (this.elementType === "img" || this.elementType === "url") {
      // fetches base 64 data from image
      // parentElement contains the base64 encoded image src
      // you might use to store somewhere
      parentElement = parent.qrcElement.nativeElement.querySelector("img").src
    } else {
      alert("Set elementType to 'canvas', 'img' or 'url'.")
    }

    if (parentElement) {
      // converts base 64 encoded image to blobData
      let blobData = this.convertBase64ToBlob(parentElement)
      // saves as image
      const blob = new Blob([blobData], { type: "image/png" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      // name of the file
      link.download = this.site.name 
      // + " " + dayjs(new Date()).format("YYYY-MM-DD")
      link.click()
    }
  }

  private convertBase64ToBlob(Base64Image: string) {
    // split into two parts
    const parts = Base64Image.split(";base64,")
    // hold the content type
    const imageType = parts[0].split(":")[1]
    // decode base64 string
    const decodedData = window.atob(parts[1])
    // create unit8array of size same as row data length
    const uInt8Array = new Uint8Array(decodedData.length)
    // insert all character code into uint8array
    for (let i = 0; i < decodedData.length; ++i) {
      uInt8Array[i] = decodedData.charCodeAt(i)
    }
    // return blob image after conversion
    return new Blob([uInt8Array], { type: imageType })
  }

  closeModal() {
    this.modalController.dismiss();
  }

}
