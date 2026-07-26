import { MessageCircle, Phone, Send, type LucideIcon } from "lucide-react"

import { AGENT_CONTACT_DISPLAY_FIELDS } from "./contactFieldDefinitions"

export type ProfileContactChip = {
  id: string
  label: string
  value: string
  icon: LucideIcon
}

const CONTACT_ICONS = {
  line: Send,
  whatsapp: MessageCircle,
  telegram: Send,
  viber: MessageCircle,
  phone: Phone,
} as const satisfies Record<string, LucideIcon>

function normalizeContactValue(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export function buildProfileContactChips(
  profile: Partial<Record<string, unknown>>,
): ProfileContactChip[] {
  return AGENT_CONTACT_DISPLAY_FIELDS.flatMap((contact) => {
    const value = normalizeContactValue(profile[contact.key])

    if (!value) return []

    const icon =
      CONTACT_ICONS[contact.id as keyof typeof CONTACT_ICONS] ?? Phone

    return [{ id: contact.id, label: contact.label, value, icon }]
  })
}
