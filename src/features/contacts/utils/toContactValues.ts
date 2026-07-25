import type { ContactValues } from "../types"
import { normalizeContactText } from "./contactNormalization"

export function toContactValues(
  source: Partial<ContactValues> | null | undefined,
): ContactValues {
  return {
    phone: normalizeContactText(source?.phone),
    lineUrl: normalizeContactText(source?.lineUrl),
    whatsappPhone: normalizeContactText(source?.whatsappPhone),
    telegramUrl: normalizeContactText(source?.telegramUrl),
    viberPhone: normalizeContactText(source?.viberPhone),
  }
}
