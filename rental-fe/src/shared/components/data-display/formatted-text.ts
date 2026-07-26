export function hasFormattedText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export function clampCollapsedLines(value: number) {
  if (!Number.isFinite(value)) return 2
  return Math.min(Math.max(Math.trunc(value), 1), 10)
}
