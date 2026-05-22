/**
 * NavItem — the shape every chrome component (sidebar / bottom-nav / drawer)
 * consumes. Keep this minimal — chrome components must not reach into the
 * full route definition; pages own only what they render.
 *
 * `routerLink` is the absolute or relative path passed to `[routerLink]`.
 * `icon` is an emoji (matching the prototype) OR the name of an inline-SVG
 * registered in IconComponent — see icon.component.ts PATHS. Chrome will
 * render emoji as text and SVG names via <app-icon>.
 * `section` lets the sidebar group items under headers like WORKFLOW /
 * SYSTEM; bottom-nav ignores it.
 * `fab` flags the special centre FAB slot on the mobile bottom-nav.
 */
export interface NavItem {
  /** Stable key — useful for trackBy. */
  key: string;
  /** Thai label shown next to the icon. */
  label: string;
  /** Emoji glyph (e.g. "📋") OR icon name from IconComponent (e.g. "home"). */
  icon: string;
  /** Absolute route, e.g. "/naikit-sticker/home". */
  routerLink: string;
  /** Optional grouping header on the sidebar — "WORKFLOW" / "SYSTEM". */
  section?: string;
  /** Numeric badge (e.g. unread count). */
  badge?: number | string;
  /** If true, this item renders as the centre FAB on mobile bottom-nav. */
  fab?: boolean;
}

/** Heuristic — return true if the icon string looks like an emoji rather
 * than an SVG icon name registered in IconComponent. Emojis are 1-2 chars
 * outside ASCII; icon names are kebab-case lowercase ASCII. */
export function isEmojiIcon(icon: string): boolean {
  if (!icon) return false;
  // Any character with code > 0x7F → treat as emoji/symbol.
  return /[^\x00-\x7F]/.test(icon);
}
