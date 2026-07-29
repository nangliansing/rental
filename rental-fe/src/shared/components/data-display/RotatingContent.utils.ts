export const DEFAULT_ROTATING_CONTENT_DURATION_MS = 4000

export function normalizeRotatingContentDurationMs(value: unknown): number {
  if (value === undefined) return DEFAULT_ROTATING_CONTENT_DURATION_MS
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_ROTATING_CONTENT_DURATION_MS
  }
  return Math.max(0, Math.trunc(value))
}
