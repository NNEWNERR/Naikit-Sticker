import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { Timestamp, arrayUnion, doc, getDoc } from 'firebase/firestore';
import { Amphures } from 'src/app/common/constant/thai-data/thai_amphures';
import { Geographies } from 'src/app/common/constant/thai-data/thai_geographies';
import { Provinces } from 'src/app/common/constant/thai-data/thai_provinces';
import { Tambons } from 'src/app/common/constant/thai-data/thai_tambons';
import { CreateWorkSheetComponent } from 'src/app/pages/create-work-sheet/create-work-sheet.component';
import { db } from 'src/app/services/firebase-config';
import { FirestoreService } from 'src/app/services/firestore.service';
import { ServiceService } from 'src/app/services/service.service';
import { EditWorkSheetComponent } from '../edit-work-sheet/edit-work-sheet.component';
import { SelectGraphicComponent } from '../graphic/graphic.component';
import { DragAndDropFileComponent } from '../drag-and-drop-file/drag-and-drop-file.component';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from 'src/app/services/storage.service';
import { SEGMENT_OPTION, STATUS_OPTION, SELLER_OPTION, DESIGNER_OPTION } from 'src/app/data/data';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  public segment_option = SEGMENT_OPTION;
  public segment = 'seller';

  constructor() { }

  ngOnInit() {

  }

  segmentChanged(event) {
    this.segment = event.detail.value;
  } 
}
