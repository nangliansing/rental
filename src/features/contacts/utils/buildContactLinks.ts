import { Phone } from "lucide-react"
import { FaLine, FaTelegram, FaViber, FaWhatsapp } from "react-icons/fa6"

import type { ContactContext, ContactLink, ContactValues } from "../types"

const CONTACT_ORDER = [
  "line",
  "whatsapp",
  "telegram",
  "viber",
  "phone",
] as const

function normalizeContactText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null
}

function normalizePhone(phone: string) {
  return phone.replace(/[^0-9]/g, "")
}

function buildContextMessage(context?: ContactContext) {
  if (!context) return undefined

  if (context.message?.trim()) return context.message.trim()
  if (context.url?.trim()) {
    return `Hi, I’m interested in this room: ${context.url.trim()}`
  }

  return undefined
}

export function buildContactLinks(
  contacts: ContactValues,
  context?: ContactContext,
): ContactLink[] {
  const contextMessage = buildContextMessage(context)
  const links: ContactLink[] = []
  const lineUrl = normalizeContactText(contacts.lineUrl)
  const whatsappPhone = normalizeContactText(contacts.whatsappPhone)
  const telegramUrl = normalizeContactText(contacts.telegramUrl)
  const viberPhone = normalizeContactText(contacts.viberPhone)
  const phone = normalizeContactText(contacts.phone)

  if (lineUrl) {
    links.push({
      type: "line",
      label: "Line",
      href: lineUrl,
      copyText: contextMessage,
      action: contextMessage ? "open-and-copy" : "open",
      icon: FaLine,
    })
  }

  if (whatsappPhone) {
    const normalizedPhone = normalizePhone(whatsappPhone)

    if (normalizedPhone.length > 0) {
      const query = contextMessage
        ? `?text=${encodeURIComponent(contextMessage)}`
        : ""

      links.push({
        type: "whatsapp",
        label: "WhatsApp",
        href: `https://wa.me/${normalizedPhone}${query}`,
        action: "open",
        icon: FaWhatsapp,
      })
    }
  }

  if (telegramUrl) {
    links.push({
      type: "telegram",
      label: "Telegram",
      href: telegramUrl,
      copyText: contextMessage,
      action: contextMessage ? "open-and-copy" : "open",
      icon: FaTelegram,
    })
  }

  if (viberPhone) {
    links.push({
      type: "viber",
      label: "Viber",
      href: `viber://chat?number=${encodeURIComponent(viberPhone)}`,
      copyText: contextMessage,
      action: contextMessage ? "open-and-copy" : "open",
      icon: FaViber,
    })
  }

  if (phone) {
    links.push({
      type: "phone",
      label: "Phone",
      value: phone,
      copyText: phone,
      action: "copy",
      icon: Phone,
    })
  }

  return links.sort(
    (first, second) =>
      CONTACT_ORDER.indexOf(first.type) - CONTACT_ORDER.indexOf(second.type),
  )
}
