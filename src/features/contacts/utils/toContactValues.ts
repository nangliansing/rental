import type { ContactValues } from "../types"

export function toContactValues(
  source: Partial<ContactValues> | null | undefined,
): ContactValues {
  return {
    phone: source?.phone ?? null,
    lineUrl: source?.lineUrl ?? null,
    whatsappPhone: source?.whatsappPhone ?? null,
    telegramUrl: source?.telegramUrl ?? null,
    viberPhone: source?.viberPhone ?? null,
  }
}
