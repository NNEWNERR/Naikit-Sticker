/**
 * Naikit Sticker — shared UI primitives (redesign foundation)
 *
 * Standalone components, scaffolded to align structurally with
 * krungthon-air/src/app/shared/components. NOT yet wired into pages.
 *
 * Each component is `standalone: true` and can be imported by NgModule
 * pages via `imports: [ButtonComponent, ...]` without disrupting the
 * existing module structure.
 *
 * Pattern: @Input() decorators (Angular 17.0.x — signal inputs require 17.1+).
 */
export * from './button.component';
export * from './card.component';
export * from './page-header.component';
export * from './field.component';
export * from './icon.component';
export * from './badge.component';
export * from './kanban-card.component';
export * from './kanban-column.component';
export * from './stat-card.component';
export * from './segmented.component';
export * from './step-progress.component';
export * from './timeline.component';
export * from './search.component';
export * from './empty-state.component';
export * from './skeleton.component';
