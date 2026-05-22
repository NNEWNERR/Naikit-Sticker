import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type NkBadgeTone =
  | 'neutral'
  | 'brand'
  | 'urgent'      // black bg + brand-yellow text — prototype's "⚡ ด่วน"
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  // 8 worksheet status colors — verbatim from prototype STATUS_COLORS
  | 'status-design'      // รอออกแบบ
  | 'status-designing'   // กำลังออกแบบ
  | 'status-await'       // รอคอนเฟิร์มแบบ
  | 'status-confirmed'   // คอนเฟิร์มแล้ว
  | 'status-printq'      // รอผลิต
  | 'status-printing'    // กำลังผลิต
  | 'status-deliverq'    // รอส่งมอบ
  | 'status-delivered';  // ส่งมอบแล้ว

/**
 * <app-badge tone="status-designing" [dot]="true">กำลังออกแบบ</app-badge>
 *
 * Pill badge with optional leading dot. Tones map to global tokens via the
 * `palette` getter. The 8 status-* tones reproduce the prototype's worksheet
 * status palette (assets/71f8a03f-…js STATUS_COLORS).
 *
 * The `urgent` tone is the prototype's high-contrast black-on-yellow "⚡ ด่วน"
 * marker — never use solid danger fill for that case.
 */
@Component({
  standalone: true,
  selector: 'app-badge',
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-body-sm font-bold whitespace-nowrap"
      [style.color]="palette.text"
      [style.background]="palette.bg"
    >
      <span *ngIf="dot" class="badge-dot" [style.background]="palette.dot"></span>
      <ng-content></ng-content>
    </span>
  `,
})
export class BadgeComponent {
  @Input() tone: NkBadgeTone = 'neutral';
  @Input() dot = true;

  get palette(): { text: string; bg: string; dot: string } {
    switch (this.tone) {
      case 'brand':
        return { text: 'var(--brand-ink)', bg: 'var(--brand-bg)', dot: 'var(--brand)' };
      case 'urgent':
        return { text: 'var(--brand)', bg: 'var(--ink)', dot: 'var(--brand)' };
      case 'success':
        return { text: 'var(--accent)', bg: 'var(--accent-bg)', dot: 'var(--accent)' };
      case 'warning':
        return { text: 'var(--warn)', bg: 'var(--warn-bg)', dot: 'var(--warn)' };
      case 'danger':
        return { text: 'var(--danger)', bg: 'var(--danger-bg)', dot: 'var(--danger)' };
      case 'info':
        return { text: 'var(--info)', bg: 'var(--info-bg)', dot: 'var(--info)' };

      // Status palette (prototype STATUS_COLORS)
      case 'status-design':     return { text: '#B91C1C', bg: '#FFE9E9', dot: '#DC2626' };
      case 'status-designing':  return { text: '#075985', bg: '#E0F2FE', dot: '#0284C7' };
      case 'status-await':      return { text: '#854D0E', bg: '#FFF7CC', dot: '#CA8A04' };
      case 'status-confirmed':  return { text: '#166534', bg: '#DCFCE7', dot: '#16A34A' };
      case 'status-printq':     return { text: '#5B21B6', bg: '#EDE9FE', dot: '#7C3AED' };
      case 'status-printing':   return { text: '#3730A3', bg: '#E0E7FF', dot: '#4F46E5' };
      case 'status-deliverq':   return { text: '#9A3412', bg: '#FFEDD5', dot: '#EA580C' };
      case 'status-delivered':  return { text: '#115E59', bg: '#CCFBF1', dot: '#0D9488' };

      default:
        return { text: 'var(--ink-2)', bg: 'var(--panel-2)', dot: 'var(--ink-3)' };
    }
  }
}
