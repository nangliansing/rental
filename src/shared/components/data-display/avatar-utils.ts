export function getAvatarInitial(displayName: unknown) {
  const normalizedName = normalizeAvatarText(displayName)

  if (!normalizedName) return ""

  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })
    const segments = segmenter.segment(normalizedName)
    const firstSegment = segments[Symbol.iterator]().next().value

    return typeof firstSegment?.segment === "string"
      ? firstSegment.segment.toLocaleUpperCase()
      : ""
  }

  return Array.from(normalizedName)[0]?.toLocaleUpperCase() ?? ""
}

export function normalizeAvatarText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}
