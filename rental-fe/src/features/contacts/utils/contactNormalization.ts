const DEFAULT_CONTACT_OWNER_NAME = "Lister"

export function normalizeContactText(value: unknown): string | null {
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeContactOwnerName(value: unknown): string {
  return normalizeContactText(value) ?? DEFAULT_CONTACT_OWNER_NAME
}

export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "")
}

export function normalizeHttpUrl(value: string): string | null {
  const trimmed = value.trim()

  try {
    const url = new URL(trimmed)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null

    return url.toString()
  } catch {
    return null
  }
}

export function normalizeTelHref(phone: string): string | null {
  const trimmed = phone.trim()
  if (!trimmed) return null

  const dialable = trimmed.replace(/[^\d+]/g, "")
  if (!/\d/.test(dialable)) return null

  return `tel:${dialable}`
}

export function normalizeViberHref(phone: string): string | null {
  const digits = normalizePhoneDigits(phone)
  if (digits.length === 0) return null

  return `viber://chat?number=${encodeURIComponent(`+${digits}`)}`
}
