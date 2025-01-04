import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Timestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from 'src/app/services/firebase-config';

@Component({
  selector: 'app-check-job',
  templateUrl: './check-job.component.html',
  styleUrls: ['./check-job.component.scss'],
})
export class CheckJobComponent implements OnInit {
  form: FormGroup
  jobByPhone: any = []
  constructor(
    private formBuilder: FormBuilder
  ) { }

  ngOnInit() {
    this.form = this.formBuilder.group({
      phone: ['', Validators.required],
    })
  }

  onSubmit() {
    this.getJobByPhone(this.form.value.phone)
  }

  getJobByPhone(phone) {
    const q = query(collection(db, "jobs"),
      where("phone", "==", phone),
      // where("status", "in", ["PENDING", "BOOKED", "COMPLETED", "REJECTED", "CANCELED"]),
    );
    getDocs(query(collection(db, "jobs"), where("phone", "==", phone))).then(querySnapshot => {
      this.jobByPhone = querySnapshot.docs.map(doc => doc.data())
      this.sortJobs(this.jobByPhone)
    })
  }

  sortJobs(jobs) {
    jobs.sort((a, b) => {
      if (a.created_at.seconds > b.created_at.seconds) {
        return -1
      } else {
        return 1
      }
    })
  }

  formatTime(timestamp: Timestamp) {
    const date = new Date(timestamp.seconds * 1000);
    const options: Intl.DateTimeFormatOptions = {
      // year: 'numeric',
      // month: 'long',
      // day: 'numeric',
      // hour: 'numeric',
      // minute: 'numeric',
      // second: 'numeric',
      // timeZoneName: 'short'
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    const formattedDate = date.toLocaleDateString('th-TH', options);
    return formattedDate;
  }
}
