import { ServiceService } from 'src/app/services/service.service';
import { FirestoreService } from './../../services/firestore.service';
import { Component, Input, OnInit } from '@angular/core';
import { arrayUnion, collection, doc, Timestamp } from 'firebase/firestore';
import { STATUS_OPTION } from 'src/app/data/data';
import { Comment } from 'src/app/data/interfaces/firebase';
import { db } from 'src/app/services/firebase-config';

import { v4 as uuidv4 } from 'uuid';
@Component({
  selector: 'app-worksheet-info',
  templateUrl: './worksheet-info.component.html',
  styleUrls: ['./worksheet-info.component.scss'],
})
export class WorksheetInfoComponent implements OnInit {
  @Input() workSheet: any;
  statuses = STATUS_OPTION.slice(1);
  newComment = '';

  comments: Comment[] = [
    // {
    //   id: '',
    //   user: 'Admin',
    //   text: 'แก้ไขขนาดแล้ว',
    //   date: new Date(),
    //   likes: 2,
    //   replies: [
    //     {
    //       id: '',
    //       user: 'Admin',
    //       text: 'รับทราบครับ',
    //       date: new Date(),
    //       likes: 2
    //     },
    //   ]
    // },
  ];
  constructor(
    private firestoreService: FirestoreService,
    private serviceService: ServiceService
  ) { }

  async ngOnInit() {
    this.firestoreService.fetchCommentById(this.workSheet.id)
    this.firestoreService.commentsChange.subscribe(comments => {
      this.comments = comments
      this.sortComments(this.comments)
    })
  }

  ngDestroy() {
    this.firestoreService.unsubscribeSubscriptions()
  }

  sortComments(comments) {
    comments.sort((a, b) => {
      const dateA = new Date(a.date.seconds * 1000);
      const dateB = new Date(b.date.seconds * 1000);
      return dateB.getTime() - dateA.getTime();
    });
  }

  formatTime(timestamp: Timestamp) {
    const date = new Date(timestamp.seconds * 1000);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      // hour: '2-digit',
      // minute: '2-digit',
      // second: '2-digit'
    };
    const formattedDate = date.toLocaleDateString('th-TH', options);
    return formattedDate;
  }

  formatTimeFull(timestamp: Timestamp) {
    const date = new Date(timestamp.seconds * 1000);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      // second: '2-digit'
    };
    const formattedDate = date.toLocaleDateString('th-TH', options);
    return formattedDate;
  }

  selectClass(status) {
    let color = '';
    this.statuses.forEach((s) => {
      if (s.value === status) {
        color = s.class;
      }
    });
    return color;
  }

  openImage(image) {
    window.open(image, '_blank');
  }

  addComment() {
    this.serviceService.presentRemarkAlert('หมายเหตุ', (data) => {
      console.log(data);
      const collectionRef = collection(db, "comments");
      const comment: Comment = {
        id: uuidv4(),
        user: 'Admin',
        text: data,
        date: new Date(),
        likes: 0,
        worksheet_id: this.workSheet.id,
        is_deleted: false,
        deleted_at: null,
        replies: [],
      }
      this.firestoreService.addDatatoFirebase(collectionRef, comment).then(() => {
        console.log('Comment added successfully');
      })
    });
  }



  likeComment(comment: any) {
    const docRef = doc(db, "comments", comment.key);
    const data = {
      likes: comment.likes + 1
    }
    this.firestoreService.updateDatatoFirebase(docRef, data)
  }

  deleteComment(comment: any) {
    // this.comments = this.comments.filter(c => c !== comment);
    const docRef = doc(db, "comments", comment.key);
    const data = {
      is_deleted: true,
      deleted_at: new Date()
    }
    this.firestoreService.updateDatatoFirebase(docRef, data)
  }

  replyComment(comment: any) {
    const docRef = doc(db, "comments", comment.key);
    this.serviceService.presentRemarkAlert('ตอบกลับ', (data) => {
      console.log(data);
      const comment = {
        replies: arrayUnion({
          id: uuidv4(),
          user: 'Admin',
          text: data,
          date: new Date(),
          likes: 0,
          is_deleted: false,
          deleted_at: null,
        }),
      }
      this.firestoreService.updateDatatoFirebase(docRef, comment)
    });
  }

  formatDate(timestamp) {
    if (!timestamp) return '';
    const now = new Date();
    const date = new Date(timestamp.seconds * 1000);
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(months / 12);

    if (years > 0) {
      return `${years} ปีที่แล้ว`;
    } else if (months > 0) {
      return `${months} เดือนที่แล้ว`;
    } else if (days > 0) {
      return `${days} วันที่แล้ว`;
    } else if (hours > 0) {
      return `${hours} ชั่วโมงที่แล้ว`;
    } else if (minutes > 0) {
      return `${minutes} นาทีที่แล้ว`;
    } else {
      return `${seconds} วินาทีที่แล้ว`;
    }
  }
}
