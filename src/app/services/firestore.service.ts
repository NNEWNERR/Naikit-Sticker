import { Injectable } from '@angular/core';
import { addDoc, collection, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { Subject } from 'rxjs';
import { NoUserData } from '../common/constant/alert-messages';
import { db } from './firebase-config';
import { ServiceService } from './service.service';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  data: any = {
    sites: [],
    groups: [],
    jobs: []
  };
  user: any = []
  jobs: any = []
  groups: any = []
  sites: any = []
  allUsers: any = []
  allJobs: any = []
  allJobsChange: Subject<any> = new Subject<any>();
  allUsersChange: Subject<any> = new Subject<any>();
  sitesChange: Subject<any> = new Subject<any>();
  userChange: Subject<any> = new Subject<any>();
  jobsChange: Subject<any> = new Subject<any>();
  groupsChange: Subject<any> = new Subject<any>();
  jobPendingChange: Subject<any> = new Subject<any>();
  jobBookedChange: Subject<any> = new Subject<any>();
  jobCompletedChange: Subject<any> = new Subject<any>();
  jobRejectedCanceledChange: Subject<any> = new Subject<any>();
  jobDashboardChange: Subject<any> = new Subject<any>();
  schedulesChange: Subject<any> = new Subject<any>();
  jobOnSiteChange: Subject<any> = new Subject<any>();
  subscriptionAllUsers;
  subscriptionSites;
  subscriptionGroups;
  subscriptionJobs;
  subscriptionAllJobs;
  subscriptionDashboard;
  subscriptionSchedules;
  subscriptionOnSite;
  subscriptions = [];



  constructor(
    private service: ServiceService,
  ) { }

  async fetchDataUser(phone: any): Promise<any> {
    const q = query(collection(db, "users"), where("phone", "==", phone),);
    return await new Promise<any>((resolve) => {
      onSnapshot(q, { includeMetadataChanges: true }, async (querySnapshot) => {
        const data: any = [];
        for (const docs of querySnapshot.docs) {
          data.push({ ...docs.data(), key: docs.id });
        }
        // console.log(data);
        this.user = data;
        this.userChange.next(this.user);
        resolve(this.user);
      });
    });
  }

  async fetchDataAllUser(project_id: any): Promise<any> {
    const q = query(collection(db, "users"), where("project_id", "==", project_id),);
    if (this.subscriptionAllUsers) {
      this.subscriptionAllUsers();
    }
    return await new Promise<any>((resolve) => {
      this.subscriptionAllUsers = onSnapshot(q, { includeMetadataChanges: true }, async (querySnapshot) => {
        const data: any = [];
        for (const docs of querySnapshot.docs) {
          data.push({ ...docs.data(), key: docs.id });
        }
        this.allUsers = data;
        this.allUsersChange.next(this.allUsers);
        resolve(this.user);
      });
    });
  }

  async fetchDataSite(project_id): Promise<any> {
    const q = query(collection(db, "sites"), where("project_id", "==", project_id));
    if (this.subscriptionSites) {
      this.subscriptionSites();
    }
    return await new Promise<any>((resolve) => {
      this.subscriptionSites = onSnapshot(q, { includeMetadataChanges: true }, async (querySnapshot) => {
        const data: any = [];
        for (const docs of querySnapshot.docs) {
          data.push({
            ...docs.data(),
            key: docs.id
          });
        }
        this.sites = data;
        this.sitesChange.next(this.sites);
        resolve(data);
      });
    });
  }

  fetchDataSiteNoGroup(): Promise<any> {
    const q = query(collection(db, "sites"),
      where("project_id", "==", this.user[0].project_id),
      where("group_id", "==", ''),);
    return new Promise<any>((resolve) => {
      const snapshot = getDocs(q);
      snapshot.then((querySnapshot) => {
        const data: any = [];
        for (const docs of querySnapshot.docs) {
          data.push({ ...docs.data(), key: docs.id });
        }
        resolve(data);
      });
    });
  }

  async fetchDataGroup(project_id): Promise<any> {
    const q = query(collection(db, "groups"), where("project_id", "==", project_id));
    if (this.subscriptionGroups) {
      this.subscriptionGroups();
    }
    return await new Promise<any>((resolve) => {
      this.subscriptionGroups = onSnapshot(q, { includeMetadataChanges: true }, async (querySnapshot) => {
        const data: any = [];
        for (const docs of querySnapshot.docs) {
          data.push({ ...docs.data(), key: docs.id });
        }
        this.groups = data;
        this.groupsChange.next(this.groups);
        resolve(data);
      });
    });
  }

  fetchDataJob(date) {
    let nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const q = query(collection(db, "jobs"),
      where("book.date", ">", date),
      where("book.date", "<", nextDay),
      where("status", "in", ["PENDING", "BOOKED", "COMPLETED"]),
      where("project_id", "==", this.user[0].project_id));
    if (this.subscriptionJobs) {
      this.subscriptionJobs();
    }
    return new Promise<any>((resolve) => {
      this.subscriptionJobs = onSnapshot(q, { includeMetadataChanges: true }, async (querySnapshot) => {
        const data: any = [];
        for (const docs of querySnapshot.docs) {
          data.push({
            ...docs.data(),
            key: docs.id,
          });
        }
        this.jobs = data;
        this.jobsChange.next(this.jobs);
        resolve(data);
      });
      // const snapshot = getDocs(q);
      // snapshot.then((querySnapshot) => {
      //   const data: any = [];
      //   for (const docs of querySnapshot.docs) {
      //     data.push({
      //       ...docs.data(),
      //       key: docs.id,
      //       time: docs.data().book.time[0],
      //     });
      //   }
      //   this.jobs = data;
      //   this.jobsChange.next(this.jobs);
      //   resolve(data);
      // });
    });
  }

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


  customerFetchDataJob(date, site) {
    let nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const q = query(collection(db, "jobs"),
      where("book.date", ">", date),
      where("book.date", "<", nextDay),
      where("status", "in", ["BOOKED", "PENDING"]),
      where("project_id", "==", site.project_id),
      where("group_id", "==", site.group_id)
    );
    return new Promise<any>((resolve) => {
      const snapshot = getDocs(q);
      snapshot.then((querySnapshot) => {
        const data: any = [];
        for (const docs of querySnapshot.docs) {
          data.push({
            ...docs.data(), key: docs.id
          });
        }
        resolve(data);
      });
    });
  }

  fetchDataJobOnSite(site) {
    const querydate = new Date().setHours(0, 0, 0, 0);
    const formatQueryDate = new Date(querydate);
    formatQueryDate.setDate(formatQueryDate.getDate() + 1);
    const q = query(collection(db, "jobs"),
      where("site_id", "==", site.site_id),
      where("book.date", "<", formatQueryDate),
    );
    if (this.subscriptionOnSite) {
      this.subscriptionOnSite();
    }
    return new Promise<any>((resolve) => {
      this.subscriptionOnSite = onSnapshot(q, { includeMetadataChanges: true }, async (querySnapshot) => {
        const data: any = [];
        for (const docs of querySnapshot.docs) {
          data.push({ ...docs.data(), key: docs.id });
        }
        this.jobOnSiteChange.next(data);
        resolve(data);
      });
    });
  }

  signInWithUsernameAndPassword(username: string, password: string) {
    const q = query(collection(db, "users"), where("username", "==", username), where("password", "==", password));
    return new Promise<any>((resolve) => {
      const snapshot = getDocs(q);
      snapshot.then((querySnapshot) => {
        if (querySnapshot.empty) {
          const { header, message } = NoUserData();
          this.service.showAlert(header, message, () => { })
          resolve([]);
        } else {
          const data: any = [];
          for (const docs of querySnapshot.docs) {
            data.push(docs.data());
          };
          resolve(data);
        }
      });
    });
  }

  async CheckUserOnSite(phone: any) {
    const q = query(collection(db, "users"), where("phone", "==", phone));
    // const q = query(collection(db, "users"), where("user_phone", "==", phone), where("user_is_enabled", "==", true), where("user_is_deleted", "==", false));
    let site: any = [];
    const user = await new Promise<any>((resolve) => {
      const snapshot = getDocs(q);
      snapshot.then((querySnapshot) => {
        if (querySnapshot.empty) {
          const { header, message } = NoUserData();
          this.service.showAlert(header, message, () => { })
          resolve([]);
        } else {
          const data: any = [];
          for (const docs of querySnapshot.docs) {
            data.push(docs.data());
          };
          resolve(data);
        }
      });
    });
    return user;
  }

  async addDatatoFirebase(collectionRef: any, data: any) {
    // const querySnapshot = await getDocs(q);
    // if (querySnapshot.empty) {
    return new Promise<any>(async (resolve) => {
      await addDoc(collectionRef, data).then((res) => {
        resolve(res);
      }).catch((error) => {
        console.error(error);
      });
    });
    // } else {
    //   this.service.showAlert('ไม่สามารถเพิ่มงานได้', 'มีงานเวลานี้อยู่แล้ว', () => { }, { confirmOnly: true })
    // }
  }

  async updateDatatoFirebase(collectionRef: any, data: any) {
    return new Promise<any>(async (resolve) => {
      await updateDoc(collectionRef, data).then((res) => {
        resolve(res);
      }).catch((error) => {
        console.error(error);
      });
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

  getSites() {
    if (this.groups.length > 0 && this.sites.length > 0) {
      const updatedSites = this.sites.map(site => {
        const siteGroup = this.groups.filter(group => group.id === site.group_id);
        return {
          ...site,
          group: siteGroup.length > 0 ? {
            id: siteGroup[0].id,
            name: siteGroup[0].name,
            color: siteGroup[0].color
          } : null
        };
      })
      this.data = { ...this.data, sites: updatedSites };
      return updatedSites;
    } else {
      return [];
    }
  }

  getGroups() {
    if (this.groups.length > 0 && this.sites.length > 0) {
      const updatedGroups = this.groups.map(group => {
        const groupSites = this.sites.filter(site => group.site_groups.site_id.includes(site.site_id));
        return { ...group, site_groups: { ...group.site_groups, site: groupSites } };
      });
      this.data = { ...this.data, groups: updatedGroups };
      return updatedGroups;
    }
  }
  workSheetChange = new Subject<any>();
  fetchWorkSheet() {
    const querydate = new Date().setHours(0, 0, 0, 0);
    const formatQueryDate = new Date(querydate);
    formatQueryDate.setDate(formatQueryDate.getDate());
    const q = query(collection(db, "jobs"),
      where("status", "in", ["กำลังออกแบบ", "รอออกแบบ", "รอคอนเฟิร์มแบบ", "คอนเฟิร์มแล้ว", "รอผลิต", "กำลังผลิต", "รอส่งมอบ", "ส่งมอบแล้ว"]),
      // where("book.date", ">=", formatQueryDate)
    );
    return new Promise<any>((resolve) => {
      const subscription = onSnapshot(q, { includeMetadataChanges: true }, async (querySnapshot) => {
        const data: any = [];
        for (const docs of querySnapshot.docs) {
          data.push({ ...docs.data(), key: docs.id });
        }
        this.workSheetChange.next(data);
        resolve(data);
      })
      this.subscriptions.push(subscription);
    });
  }

  createWorkSheet() {

  }

  workSheetForAdminChange = new Subject<any>();
  workSheetForSellerChange = new Subject<any>();
  workSheetForGraphicChange = new Subject<any>();
  workSheetForProductionChange = new Subject<any>();
  workSheetForSeller = [];
  workSheetForGraphic = [];
  workSheetForProduction = [];
  fetchWorkSheetForAdmin() {
    const q = query(collection(db, "jobs"),
      where("status", "in", ["กำลังออกแบบ", "รอออกแบบ", "รอคอนเฟิร์มแบบ", "คอนเฟิร์มแล้ว", "รอผลิต", "กำลังผลิต", "รอส่งมอบ", "ส่งมอบแล้ว"]),
    );
    return new Promise<any>((resolve) => {
      const subscription = onSnapshot(q, { includeMetadataChanges: true }, async (querySnapshot) => {
        const data: any = [];
        for (const docs of querySnapshot.docs) {
          data.push({ ...docs.data(), key: docs.id });
        }
        this.workSheetForAdminChange.next(data);
        resolve(data);
      })
      this.subscriptions.push(subscription);
    });
  }

  fetchWorkSheetForSeller() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); // First day of the month
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // Last day of the month
    console.log(startOfMonth, endOfMonth);

    const q = query(collection(db, "jobs"),
      where("status", "in", ["กำลังออกแบบ", "รอออกแบบ", "รอคอนเฟิร์มแบบ", "คอนเฟิร์มแล้ว", "รอผลิต", "กำลังผลิต", "รอส่งมอบ"]),
      where("created_at", ">=", startOfMonth),
      // where("created_at", "<=", endOfMonth)
    );
    return new Promise<any>((resolve) => {
      const subscription = onSnapshot(q, { includeMetadataChanges: true }, async (querySnapshot) => {
        const data: any = [];
        for (const docs of querySnapshot.docs) {
          data.push({ ...docs.data(), key: docs.id });
        }
        this.workSheetForSeller = data;
        this.workSheetForSellerChange.next(data);
        resolve(data);
      })
      this.subscriptions.push(subscription);
    });
  }


  fetchWorkSheetForGraphic() {
    // console.log('fetchWorkSheetForGraphic');
    const q = query(collection(db, "jobs"),
      where("status", "in", ["รอออกแบบ", "กำลังออกแบบ", "รอคอนเฟิร์มแบบ", "คอนเฟิร์มแล้ว"]),
    );
    return new Promise<any>((resolve) => {
      const subscription = onSnapshot(q, { includeMetadataChanges: true }, async (querySnapshot) => {
        const data: any = [];
        for (const docs of querySnapshot.docs) {
          data.push({ ...docs.data(), key: docs.id });
        }
        this.workSheetForGraphic = data;
        this.workSheetForGraphicChange.next(data);
        resolve(data);
      })
      this.subscriptions.push(subscription);
    });
  }

  fetchWorkSheetForProduction() {
    const q = query(collection(db, "jobs"),
      where("status", "in", ["รอผลิต", "กำลังผลิต"]),
    );
    return new Promise<any>((resolve) => {
      const subscription = onSnapshot(q, { includeMetadataChanges: true }, async (querySnapshot) => {
        const data: any = [];
        for (const docs of querySnapshot.docs) {
          data.push({ ...docs.data(), key: docs.id });
        }
        this.workSheetForProduction = data;
        this.workSheetForProductionChange.next(data);
        resolve(data);
      })
      this.subscriptions.push(subscription);
    });
  }

  summaryDiary = [];
  summaryDiaryChange = new Subject<any>();

  fetchWorkSheetSummaryDiary(date, design_by) {
    const querydate = new Date(date).setHours(0, 0, 0, 0);
    const dateCondition = new Date(querydate);
    const formatQueryDate = new Date(querydate);
    formatQueryDate.setDate(formatQueryDate.getDate() + 1);
    // console.log(dateCondition, formatQueryDate, design_by);
    const q = query(collection(db, "jobs"),
      where("confirm_date", ">", dateCondition),
      where("confirm_date", "<", formatQueryDate),
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
  comments = [];
  commentsChange = new Subject<any>();
  fetchCommentById(id) {
    const q = query(collection(db, "comments"),
      where("worksheet_id", "==", id),
      where("is_deleted", "==", false)
    );
    return new Promise<any>((resolve) => {
      const subscription = onSnapshot(q, { includeMetadataChanges: true }, async (querySnapshot) => {
        const data: any = [];
        for (const docs of querySnapshot.docs) {
          data.push({ ...docs.data(), key: docs.id });
        }
        this.comments = data;
        this.commentsChange.next(data);
        resolve(data);
      })
      this.subscriptions.push(subscription);
    });
    // const q = query(collection(db, "comments"), where("worksheet_id", "==", id));
    // return new Promise<any>((resolve) => {
    //   const snapshot = getDocs(q);
    //   snapshot.then((querySnapshot) => {
    //     const data: any = [];
    //     for (const docs of querySnapshot.docs) {
    //       data.push({ ...docs.data(), key: docs.id });
    //     }
    //     resolve(data);
    //   });
    // });
  }
}
