import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BadgeComponent } from './badge.component';

export interface KanbanCardItem {
  type?: string;
  qty?: number;
}

export interface KanbanCardData {
  serial_number?: string;
  customer_name?: string;
  is_urgent?: boolean;
  seller_name?: string;
  total?: number;
  items?: KanbanCardItem[];
}

/**
 * <app-kanban-card [ws]="worksheet" (open)="openInfo($event)"></app-kanban-card>
 *
 * Compact worksheet card for the home kanban + mobile list. Reproduces
 * ProtoKanbanCard (assets/100cc77b-…js, lines 3-26). All numeric values use
 * JetBrains Mono via .font-num. Hover lifts the card +1px and bumps the
 * shadow from 2px → 3px.
 *
 * Click anywhere on the card emits `open`; consumers wire this to the
 * worksheet-info route or modal.
 */
@Component({
  standalone: true,
  selector: 'app-kanban-card',
  imports: [CommonModule, BadgeComponent],
  template: `
    <div
      role="button"
      tabindex="0"
      (click)="open.emit(ws)"
      (keydown.enter)="open.emit(ws)"
      (keydown.space)="$event.preventDefault(); open.emit(ws)"
      class="bg-white border-2 border-ink rounded-md shadow-brutal-sm p-3 mb-2.5 cursor-pointer transition-all
             hover:shadow-brutal hover:-translate-x-px hover:-translate-y-px
             focus:outline-none focus-visible:shadow-[3px_3px_0_var(--ink),0_0_0_3px_rgba(255,212,0,0.6)]"
    >
      <div class="flex items-center justify-between mb-1.5">
        <span class="font-num text-[11px] font-extrabold text-ink-3">{{ ws?.serial_number }}</span>
        <app-badge *ngIf="ws?.is_urgent" tone="urgent" [dot]="false">⚡ ด่วน</app-badge>
      </div>

      <div class="text-[14px] font-bold leading-tight mb-1.5 line-clamp-2">{{ ws?.customer_name }}</div>

      <div *ngIf="firstItem as it" class="text-body-sm text-ink-2 mb-2.5">
        {{ it.type || '—' }}
        <ng-container *ngIf="it.qty != null">
          · <span class="font-num">{{ it.qty | number }}</span> ชิ้น
        </ng-container>
        <span *ngIf="extraItems > 0" class="text-ink-4"> +{{ extraItems }}</span>
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-dashed border-line-2">
        <div class="flex items-center gap-1.5 min-w-0">
          <div
            class="w-[22px] h-[22px] rounded-full bg-brand border-[1.5px] border-ink
                   flex items-center justify-center text-[10px] font-extrabold flex-shrink-0"
          >
            {{ sellerInitial }}
          </div>
          <span class="text-[11px] font-semibold text-ink-2 truncate">{{ ws?.seller_name || '—' }}</span>
        </div>
        <span class="text-[11px] font-bold font-num flex-shrink-0 ml-2">
          ฿<ng-container *ngIf="ws?.total != null; else dash">{{ ws!.total! | number }}</ng-container>
          <ng-template #dash>—</ng-template>
        </span>
      </div>
    </div>
  `,
})
export class KanbanCardComponent {
  @Input() ws: KanbanCardData | null = null;
  @Output() open = new EventEmitter<KanbanCardData | null>();

  get firstItem(): KanbanCardItem | null {
    return this.ws?.items?.[0] ?? null;
  }

  get extraItems(): number {
    const len = this.ws?.items?.length ?? 0;
    return len > 1 ? len - 1 : 0;
  }

  get sellerInitial(): string {
    const name = this.ws?.seller_name?.trim();
    return name ? name.charAt(0).toUpperCase() : '?';
  }
}
