import { Phone } from "lucide-react"
import { FaLine, FaTelegram, FaViber, FaWhatsapp } from "react-icons/fa6"

import type { ContactContext, ContactLink, ContactValues } from "../types"
import {
  normalizeContactText,
  normalizeHttpUrl,
  normalizePhoneDigits,
  normalizeTelHref,
  normalizeViberHref,
} from "./contactNormalization"

const CONTACT_ORDER = [
  "line",
  "whatsapp",
  "telegram",
  "viber",
  "phone",
] as const

function buildContextMessage(context?: ContactContext) {
  if (!context) return undefined

  const message = normalizeContactText(context.message)
  if (message) return message

  const url = normalizeContactText(context.url)
  if (!url) return undefined

  if (context.type === "profile") {
    return `Hi, I found your rental profile: ${url}`
  }

  return `Hi, I'm interested in this room: ${url}`
}

function buildOpenAction(contextMessage?: string) {
  return contextMessage ? ("open-and-copy" as const) : ("open" as const)
}

export function buildContactLinks(
  contacts: ContactValues,
  context?: ContactContext,
): ContactLink[] {
  const contextMessage = buildContextMessage(context)
  const openAction = buildOpenAction(contextMessage)
  const links: ContactLink[] = []

  const lineUrl = normalizeContactText(contacts.lineUrl)
  const normalizedLineUrl = lineUrl ? normalizeHttpUrl(lineUrl) : null
  if (normalizedLineUrl) {
    links.push({
      type: "line",
      label: "Line",
      href: normalizedLineUrl,
      copyText: contextMessage,
      action: openAction,
      icon: FaLine,
    })
  }

  const whatsappPhone = normalizeContactText(contacts.whatsappPhone)
  if (whatsappPhone) {
    const normalizedPhone = normalizePhoneDigits(whatsappPhone)

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

  const telegramUrl = normalizeContactText(contacts.telegramUrl)
  const normalizedTelegramUrl = telegramUrl
    ? normalizeHttpUrl(telegramUrl)
    : null
  if (normalizedTelegramUrl) {
    links.push({
      type: "telegram",
      label: "Telegram",
      href: normalizedTelegramUrl,
      copyText: contextMessage,
      action: openAction,
      icon: FaTelegram,
    })
  }

  const viberPhone = normalizeContactText(contacts.viberPhone)
  if (viberPhone) {
    const viberHref = normalizeViberHref(viberPhone)
    if (viberHref) {
      links.push({
        type: "viber",
        label: "Viber",
        href: viberHref,
        copyText: contextMessage,
        action: openAction,
        icon: FaViber,
      })
    }
  }

  const phone = normalizeContactText(contacts.phone)
  if (phone) {
    const telHref = normalizeTelHref(phone)
    if (telHref) {
      links.push({
        type: "phone",
        label: "Phone",
        href: telHref,
        value: phone,
        action: "open",
        icon: Phone,
      })
    }
  }

  return links.sort(
    (first, second) =>
      CONTACT_ORDER.indexOf(first.type) - CONTACT_ORDER.indexOf(second.type),
  )
}
