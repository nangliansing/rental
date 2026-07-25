import { ChevronRight, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DialogDescription,
  DialogShell,
  DialogTitle,
} from "@/shared/components/dialogs/DialogShell"

import type { ContactLink } from "../types"
import { getContactIconClassName } from "../utils/contactPresentation"

type ContactOptionsDialogProps = {
  contactLinks: ContactLink[]
  contactOwnerName: string
  isOpen: boolean
  onClose: () => void
  onSelectContact: (contact: ContactLink) => void | Promise<void>
}

function ContactOptionButton({
  contact,
  onClick,
}: {
  contact: ContactLink
  onClick: () => void
}) {
  const Icon = contact.icon

  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition-colors hover:bg-slate-50"
      onClick={onClick}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-100">
        <Icon
          aria-hidden="true"
          className={cn("h-5 w-5", getContactIconClassName(contact.type))}
        />
      </span>
      <span className="min-w-0 flex-1 text-sm font-semibold text-slate-950">
        {contact.label}
      </span>
      <ChevronRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-slate-400"
      />
    </button>
  )
}

export function ContactOptionsDialog({
  contactLinks,
  contactOwnerName,
  isOpen,
  onClose,
  onSelectContact,
}: ContactOptionsDialogProps) {
  if (contactLinks.length === 0) return null

  return (
    <DialogShell
      isOpen={isOpen}
      contentClassName="max-w-sm rounded-2xl"
      onDismiss={onClose}
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-semibold text-slate-950">
              Contact {contactOwnerName}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-slate-500">
              Choose how you would like to reach out.
            </DialogDescription>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full border-0 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            aria-label="Close contact options"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ul className="mt-4 space-y-2" aria-label="Contact options">
          {contactLinks.map((contact) => (
            <li key={contact.type}>
              <ContactOptionButton
                contact={contact}
                onClick={() => void onSelectContact(contact)}
              />
            </li>
          ))}
        </ul>
      </div>
    </DialogShell>
  )
}
