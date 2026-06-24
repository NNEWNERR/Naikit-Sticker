import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BadgeComponent } from './badge.component';

export interface KanbanCardItem {
  type?: string;
  qty?: number;
}

export interface KanbanCardData {
  /** Firestore doc ID (v2 schema uses `id`; v1 used `key`). */
  id?: string;
  key?: string;
  serial_number?: string;
  customer_name?: string;
  is_urgent?: boolean;
  /** v1 schema field — v2 uses seller_uid. */
  seller_name?: string;
  seller_uid?: string;
  /** denormalized avatar ของ seller (snapshot) — โชว์แทน initials ถ้ามี */
  seller_avatar_url?: string | null;
  /** กราฟิกที่รับงาน (denormalized) — โชว์แถวที่สองถ้ามี */
  design_uid?: string | null;
  design_name?: string;
  design_avatar_url?: string | null;
  /** v1 schema total flat field — v2 nests it under payment.total. */
  total?: number;
  payment?: { total?: number };
  /** v1 items array. */
  items?: KanbanCardItem[];
  /** v2 work_items array. */
  work_items?: Array<{ type?: string; quantity?: number; qty?: number }>;
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

      <div class="pt-2 border-t border-dashed border-line-2 flex flex-col gap-1">
        <!-- แถว 1: ฝ่ายขาย + ราคา -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 min-w-0">
            <img *ngIf="ws?.seller_avatar_url; else sellerInitialTpl"
              [src]="ws!.seller_avatar_url" alt=""
              class="w-[22px] h-[22px] rounded-full border-[1.5px] border-ink object-cover flex-shrink-0" />
            <ng-template #sellerInitialTpl>
              <div
                class="w-[22px] h-[22px] rounded-full bg-brand border-[1.5px] border-ink
                       flex items-center justify-center text-[10px] font-extrabold flex-shrink-0"
              >
                {{ sellerInitial }}
              </div>
            </ng-template>
            <span class="text-[11px] font-semibold text-ink-2 truncate">💼 {{ sellerDisplay }}</span>
          </div>
          <span class="text-[11px] font-bold font-num flex-shrink-0 ml-2">
            ฿<ng-container *ngIf="displayTotal != null; else dash">{{ displayTotal | number }}</ng-container>
            <ng-template #dash>—</ng-template>
          </span>
        </div>
        <!-- แถว 2: กราฟิกที่รับงาน (เฉพาะเมื่อรับแล้ว) -->
        <div *ngIf="ws?.design_uid || ws?.design_name" class="flex items-center gap-1.5 min-w-0">
          <img *ngIf="ws?.design_avatar_url; else designInitialTpl"
            [src]="ws!.design_avatar_url" alt=""
            class="w-[22px] h-[22px] rounded-full border-[1.5px] border-ink object-cover flex-shrink-0" />
          <ng-template #designInitialTpl>
            <div
              class="w-[22px] h-[22px] rounded-full bg-status-designing-bg border-[1.5px] border-ink
                     flex items-center justify-center text-[10px] font-extrabold flex-shrink-0"
            >
              {{ designInitial }}
            </div>
          </ng-template>
          <span class="text-[11px] font-semibold text-ink-2 truncate">🎨 {{ designDisplay }}</span>
        </div>
      </div>
    </div>
  `,
})
export class KanbanCardComponent {
  @Input() ws: KanbanCardData | null = null;
  @Output() open = new EventEmitter<KanbanCardData | null>();

  get displayTotal(): number | null {
    const v2 = this.ws?.payment?.total;
    const v1 = this.ws?.total;
    return v2 != null ? v2 : (v1 != null ? v1 : null);
  }

  get firstItem(): KanbanCardItem | null {
    const v2 = this.ws?.work_items?.[0];
    if (v2) return { type: v2.type, qty: v2.quantity ?? v2.qty };
    return this.ws?.items?.[0] ?? null;
  }

  get extraItems(): number {
    const len = (this.ws?.work_items ?? this.ws?.items)?.length ?? 0;
    return len > 1 ? len - 1 : 0;
  }

  get sellerDisplay(): string {
    return this.ws?.seller_name ?? this.ws?.seller_uid?.substring(0, 6) ?? '—';
  }

  get sellerInitial(): string {
    return this.sellerDisplay.charAt(0).toUpperCase();
  }

  get designDisplay(): string {
    return this.ws?.design_name || this.ws?.design_uid?.substring(0, 6) || '—';
  }
  get designInitial(): string {
    return this.designDisplay.charAt(0).toUpperCase();
  }
}
