/**
 * App chrome — the layout shell that wraps every authenticated route.
 *
 * Three standalone components, designed to be imported together by the
 * MainLayoutComponent (or any other authenticated wrapper):
 *   - <app-shell>      — orchestrates the responsive layout
 *   - <app-sidebar>    — desktop rail + mobile drawer
 *   - <app-bottom-nav> — mobile bottom tab bar
 *
 * All three consume the `NavItem` interface from this directory.
 *
 * Reproduces the prototype's AppLayout / ProtoSidebar / MobileBottomNav
 * (see redesign/extracted/assets/f9c5012a-…js).
 */
export * from './nav-item.interface';
export * from './sidebar.component';
export * from './bottom-nav.component';
export * from './shell.component';
