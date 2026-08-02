/** Matches backend `GEOCODE_CACHE_COORDINATE_DECIMALS`. */
export const REVERSE_GEOCODE_COORDINATE_DECIMALS = 5

/**
 * Client-side stale window. Backend persists geocode results for 30 days, but
 * TanStack Query timers must stay within Node's 32-bit limit (~24.8 days).
 */
export const REVERSE_GEOCODE_STALE_TIME_MS = 24 * 60 * 60 * 1000

/** Keep resolved addresses in memory for a week after the last subscriber unmounts. */
export const REVERSE_GEOCODE_GC_TIME_MS = 7 * 24 * 60 * 60 * 1000
