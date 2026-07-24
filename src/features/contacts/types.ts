// src/features/contacts/types.ts
import type { ComponentType } from "react"

export type ContactType = "line" | "whatsapp" | "telegram" | "viber" | "phone"

export type ContactValues = {
  phone?: string | null
  lineUrl?: string | null
  whatsappPhone?: string | null
  telegramUrl?: string | null
  viberPhone?: string | null
}

export type ContactContext = {
  type: "listing" | "profile"
  url?: string
  message?: string
}

export type ContactLink = {
  type: ContactType
  label: string
  href?: string
  value?: string
  copyText?: string
  action: "open" | "copy" | "open-and-copy"
  icon: ComponentType<{ className?: string }>
}
