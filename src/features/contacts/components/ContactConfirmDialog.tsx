// src/features/contacts/components/ContactConfirmDialog.tsx
import type { ContactLink } from "../types"
import { ExternalActionConfirmDialog } from "./ExternalActionConfirmDialog"

type ContactConfirmDialogProps = {
  contact: ContactLink | null
  contactOwnerName: string
  iconClassName?: string
  onCancel: () => void
  onConfirm: () => void
}

function getActionLabel(contact: ContactLink) {
  if (contact.action === "copy") return `Copy ${contact.label}`

  return `Open ${contact.label}`
}

function getDescription(contact: ContactLink) {
  if (contact.action === "copy") {
    return "We will copy the phone number so you can call when you are ready."
  }

  if (contact.action === "open-and-copy") {
    return "We will copy a short listing message first, then open the app."
  }

  return `We will open ${contact.label} so you can contact this agent.`
}

export function ContactConfirmDialog({
  contact,
  contactOwnerName,
  iconClassName,
  onCancel,
  onConfirm,
}: ContactConfirmDialogProps) {
  if (!contact) return null

  return (
    <ExternalActionConfirmDialog
      isOpen
      title={`Contact ${contactOwnerName}`}
      description={getDescription(contact)}
      confirmLabel={getActionLabel(contact)}
      icon={contact.icon}
      iconClassName={iconClassName}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
