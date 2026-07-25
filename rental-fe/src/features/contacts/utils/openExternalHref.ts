import { normalizeContactText } from "./contactNormalization"

export function openExternalHref(href: string) {
  const normalizedHref = normalizeContactText(href)
  if (!normalizedHref) return

  if (normalizedHref.startsWith("tel:")) {
    const dialable = normalizedHref.slice(4).replace(/[^\d+]/g, "")
    if (!/\d/.test(dialable)) return

    window.location.href = `tel:${dialable}`
    return
  }

  if (normalizedHref.startsWith("viber://")) {
    window.location.href = normalizedHref
    return
  }

  try {
    const url = new URL(normalizedHref)
    if (url.protocol !== "http:" && url.protocol !== "https:") return

    window.open(normalizedHref, "_blank", "noopener,noreferrer")
  } catch {
    // Ignore malformed external links.
  }
}
