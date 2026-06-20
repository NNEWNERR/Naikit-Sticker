import { Injectable } from '@angular/core';
import { addDoc, collection, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { Subject } from 'rxjs';
import { db } from './firebase-config';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  allJobs: any = []
  allJobsChange: Subject<any> = new Subject<any>();
  subscriptionAllJobs;
  subscriptions = [];

  constructor() { }

  async fetchDataAllJob(): Promise<any> {
    const q = query(collection(db, "jobs"),
      // where("status", "in", ["รอออกแบบ", "กำลังออกแบบ", "รอคอนเฟิร์มแบบ", "คอนเฟิร์มแล้ว"]),
    );
    return new Promise<any>((resolve) => {
      const subscription = onSnapshot(q, { includeMetadataChanges: true }, async (querySnapshot) => {
        const data: any = [];
        for (const docs of querySnapshot.docs) {
          data.push({ ...docs.data(), key: docs.id });
        }
        this.allJobs = data;
        this.allJobsChange.next(data);
        resolve(data);
      })
      this.subscriptions.push(subscription);
    });
  }

  unsubscribeSubscriptions() {
    this.subscriptions.forEach((subscription) => {
      subscription();
    });
    this.subscriptions = [];
  }

  async addDatatoFirebase(collectionRef: any, data: any) {
    return await addDoc(collectionRef, data);
  }

  async updateDatatoFirebase(collectionRef: any, data: any) {
    return await updateDoc(collectionRef, data);
  }

  safeAdd(collectionRef: any, data: any): void {
    this.addDatatoFirebase(collectionRef, data).catch((err) => {
      console.error('[firestore] add failed', err);
    });
  }

  safeUpdate(docOrCollectionRef: any, data: any): void {
    this.updateDatatoFirebase(docOrCollectionRef, data).catch((err) => {
      console.error('[firestore] update failed', err);
    });
  }

  changeDatetime(timestamp: any) {
    const date = new Date(timestamp.seconds * 1000);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      timeZoneName: 'short'
    };
    const formattedDate = date.toLocaleDateString('th-TH', options);
    return formattedDate;
  }

  summaryDiary = [];
  summaryDiaryChange = new Subject<any>();

  fetchWorkSheetSummaryDiary(date, design_by) {
    const querydate = new Date(date).setHours(0, 0, 0, 0);
    const dateCondition = new Date(querydate);
    const formatQueryDate = new Date(querydate);
    formatQueryDate.setDate(formatQueryDate.getDate() -10);
    const q = query(collection(db, "jobs"),
      where("created_at", ">=", formatQueryDate),
      where("design_by", "==", design_by),
    );
    return new Promise<any>((resolve) => {
      const subscription = onSnapshot(q, { includeMetadataChanges: true }, async (querySnapshot) => {
        const data: any = [];
        for (const docs of querySnapshot.docs) {
          data.push({ ...docs.data(), key: docs.id });
        }
        this.summaryDiary = data;
        this.summaryDiaryChange.next(data);
        console.log(data);
        resolve(data);
      })
      this.subscriptions.push(subscription);
    });
  }
}
