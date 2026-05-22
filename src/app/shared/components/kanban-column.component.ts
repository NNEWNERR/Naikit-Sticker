import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { KanbanCardComponent, KanbanCardData } from './kanban-card.component';

export interface KanbanStatusPalette {
  bg: string;
  fg: string;
  dot: string;
}

/**
 * <app-kanban-column status="กำลังออกแบบ" [items]="cards" (open)="…"></app-kanban-column>
 *
 * 240px wide column with a colored header (palette resolved by status name),
 * a count badge, and a scrollable card area. Reproduces ProtoKanbanColumn
 * (assets/100cc77b-…js, lines 28-45).
 *
 * The column's maxHeight = `calc(100vh - 285px)` matches the prototype.
 * Empty-state copy is "ไม่มีงาน".
 */
@Component({
  standalone: true,
  selector: 'app-kanban-column',
  imports: [CommonModule, KanbanCardComponent],
  template: `
    <div
      class="w-[240px] flex-shrink-0 bg-surface-2 rounded-lg border-2 border-ink flex flex-col"
      style="max-height: calc(100vh - 285px);"
    >
      <!-- Column header -->
      <div
        class="px-3 py-2.5 border-b-2 border-ink rounded-t-md flex items-center justify-between flex-shrink-0"
        [style.background]="palette.bg"
      >
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-2 h-2 rounded-full flex-shrink-0" [style.background]="palette.dot"></span>
          <span class="text-[13px] font-extrabold truncate" [style.color]="palette.fg">{{ status }}</span>
        </div>
        <span
          class="text-[12px] font-extrabold font-num bg-white rounded-full px-2 py-px border-[1.5px] flex-shrink-0"
          [style.color]="palette.fg"
          [style.borderColor]="palette.fg"
        >
          {{ items?.length || 0 }}
        </span>
      </div>

      <!-- Card area -->
      <div class="p-2.5 overflow-y-auto flex-1">
        <app-kanban-card
          *ngFor="let ws of items; trackBy: trackByKey"
          [ws]="ws"
          (open)="open.emit($event)"
        ></app-kanban-card>

        <div
          *ngIf="!items || items.length === 0"
          class="py-7 px-2.5 text-center text-body-sm text-ink-4 font-medium"
        >
          ไม่มีงาน
        </div>
      </div>
    </div>
  `,
})
export class KanbanColumnComponent {
  @Input() status = '';
  @Input() items: KanbanCardData[] | null = [];
  @Output() open = new EventEmitter<KanbanCardData | null>();

  // Status palette — verbatim from prototype STATUS_COLORS (assets/71f8a03f-…js)
  private static readonly PALETTES: Record<string, KanbanStatusPalette> = {
    'รอออกแบบ':      { bg: '#FFE9E9', fg: '#B91C1C', dot: '#DC2626' },
    'กำลังออกแบบ':    { bg: '#E0F2FE', fg: '#075985', dot: '#0284C7' },
    'รอคอนเฟิร์มแบบ': { bg: '#FFF7CC', fg: '#854D0E', dot: '#CA8A04' },
    'คอนเฟิร์มแล้ว':   { bg: '#DCFCE7', fg: '#166534', dot: '#16A34A' },
    'รอผลิต':         { bg: '#EDE9FE', fg: '#5B21B6', dot: '#7C3AED' },
    'กำลังผลิต':      { bg: '#E0E7FF', fg: '#3730A3', dot: '#4F46E5' },
    'รอส่งมอบ':       { bg: '#FFEDD5', fg: '#9A3412', dot: '#EA580C' },
    'ส่งมอบแล้ว':     { bg: '#CCFBF1', fg: '#115E59', dot: '#0D9488' },
  };

  get palette(): KanbanStatusPalette {
    return (
      KanbanColumnComponent.PALETTES[this.status] || {
        bg: 'var(--panel-2)',
        fg: 'var(--ink-2)',
        dot: 'var(--ink-3)',
      }
    );
  }

  trackByKey(_idx: number, ws: KanbanCardData & { key?: string }): string | number {
    return ws.key ?? ws.serial_number ?? _idx;
  }
}
