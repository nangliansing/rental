export function normalizeProgressiveImageSource(source: unknown): string {
  if (typeof source !== "string") return ""
  return source.trim()
}

export function isUsableProgressiveImageSource(source: unknown): source is string {
  return normalizeProgressiveImageSource(source).length > 0
}
