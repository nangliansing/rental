/**
 * Layout tokens for the fixed `AppNavigation` mobile tab bar (`h-16`).
 * Desktop (md+) has no bottom nav.
 */

/** Mobile tab bar height in px — matches `AppNavigation` `h-16`. */
export const MOBILE_NAV_BAR_HEIGHT_PX = 64

/**
 * Bottom padding so scrollable content can clear the fixed mobile nav.
 * `pb-20` (5rem) covers the `h-16` bar plus a little room for the last row / sentinel.
 */
export const MOBILE_NAV_SCROLL_PADDING_CLASS = "pb-20 md:pb-0"

/** Same clearance when the container is already mobile-only. */
export const MOBILE_NAV_SCROLL_PADDING_MOBILE_CLASS = "pb-20"
