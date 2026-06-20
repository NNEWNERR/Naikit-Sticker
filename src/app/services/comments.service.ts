import { Injectable } from '@angular/core';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { FunctionsError, httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase-config';
import { JobComment } from '../core/models/job';

export class CommentError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class CommentsService {

  /** Subscribe to non-deleted comments for a job, newest first. Returns cleanup fn. */
  watchComments(jobId: string, onUpdate: (comments: JobComment[]) => void): () => void {
    return onSnapshot(
      query(
        collection(db, 'comments'),
        where('job_id', '==', jobId),
        where('is_deleted', '==', false),
        orderBy('created_at', 'desc'),
      ),
      (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as JobComment))),
    );
  }

  async addComment(jobId: string, text: string): Promise<{ commentId: string }> {
    return this._call('addComment', { job_id: jobId, text });
  }

  async deleteComment(commentId: string): Promise<void> {
    await this._call('deleteComment', { comment_id: commentId });
  }

  private async _call<Req, Res = { commentId: string }>(name: string, data: Req): Promise<Res> {
    const fn = httpsCallable<Req, Res>(functions, name);
    try {
      const res = await fn(data);
      return res.data;
    } catch (e: unknown) {
      throw this._mapError(e);
    }
  }

  private _mapError(e: unknown): CommentError {
    const fe = e as FunctionsError;
    const code = fe?.code ?? 'unknown';
    const msg = typeof fe?.message === 'string' ? fe.message : '';
    switch (code) {
      case 'functions/permission-denied': return new CommentError(code, msg || 'ไม่มีสิทธิ์ทำรายการนี้');
      case 'functions/not-found':        return new CommentError(code, msg || 'ไม่พบข้อมูล');
      case 'functions/unauthenticated':  return new CommentError(code, 'กรุณาเข้าสู่ระบบใหม่');
      default:                           return new CommentError(code, msg || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
    }
  }
}
