import { useMemo, useState } from "react"
import { Navigation } from "lucide-react"

import { cn } from "@/lib/utils"
import { useCopyFeedback } from "@/shared/hooks/useCopyFeedback"

import type { ContactContext, ContactLink, ContactValues } from "../types"
import { buildContactLinks } from "../utils/buildContactLinks"
import {
  buildGoogleMapsDirectionsUrl,
  type DirectionsDestination,
} from "../utils/buildGoogleMapsDirectionsUrl"
import { getContactIconClassName } from "../utils/contactPresentation"
import { ContactConfirmDialog } from "./ContactConfirmDialog"
import { ExternalActionConfirmDialog } from "./ExternalActionConfirmDialog"

type ContactActionsProps = {
  contactOwnerName: string
  contacts: ContactValues
  context?: ContactContext
  directions?: DirectionsDestination | null
  className?: string
  leadingAction?: React.ReactNode
}

function openContact(contact: ContactLink) {
  if (!contact.href) return

  window.open(contact.href, "_blank", "noopener,noreferrer")
}

export function ContactActions({
  contactOwnerName,
  contacts,
  context,
  directions,
  className,
  leadingAction,
}: ContactActionsProps) {
  const [selectedContact, setSelectedContact] = useState<ContactLink | null>(
    null,
  )
  const [isDirectionsDialogOpen, setIsDirectionsDialogOpen] = useState(false)
  const { copy, isCopied } = useCopyFeedback()

  const contactLinks = useMemo(
    () => buildContactLinks(contacts, context),
    [contacts, context],
  )
  const directionsUrl = useMemo(
    () => buildGoogleMapsDirectionsUrl(directions),
    [directions],
  )
  const destinationName =
    typeof directions?.name === "string" && directions.name.trim()
      ? directions.name.trim()
      : "this building"

  if (contactLinks.length === 0 && !directionsUrl && !leadingAction) return null

  const handleSelectContact = async (contact: ContactLink) => {
    const shouldCopy = Boolean(contact.copyText)

    try {
      if (contact.copyText) {
        await copy(contact.type, contact.copyText)
      }

      if (contact.action === "copy") {
        return
      }

      openContact(contact)
    } catch {
      if (contact.action !== "copy") {
        openContact(contact)
      } else if (shouldCopy && contact.copyText) {
        await copy(contact.type, contact.copyText)
      }
    }
  }

  const handleConfirmContact = async () => {
    if (!selectedContact) return

    await handleSelectContact(selectedContact)
    setSelectedContact(null)
  }

  return (
    <>
      <footer
        className={cn(
          "flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          className,
        )}
      >
        <span className="sr-only">Contact {contactOwnerName}</span>
        {leadingAction}
        {contactLinks.map((contact) => {
          const Icon = contact.icon
          const copied = isCopied(contact.type)

          return (
            <button
              key={contact.type}
              type="button"
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 hover:bg-slate-50"
              onClick={() => setSelectedContact(contact)}
            >
              {copied ? (
                <span className="text-emerald-600">Copied</span>
              ) : (
                <>
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      getContactIconClassName(contact.type),
                    )}
                  />
                  {contact.label}
                </>
              )}
            </button>
          )
        })}

        {directionsUrl && (
          <button
            type="button"
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 hover:bg-slate-50"
            aria-label={`Directions to ${destinationName}`}
            onClick={() => setIsDirectionsDialogOpen(true)}
          >
            <Navigation className="h-4 w-4 text-blue-600" />
            Directions
          </button>
        )}
      </footer>

      <ContactConfirmDialog
        contact={selectedContact}
        contactOwnerName={contactOwnerName}
        iconClassName={
          selectedContact
            ? getContactIconClassName(selectedContact.type)
            : undefined
        }
        onCancel={() => setSelectedContact(null)}
        onConfirm={handleConfirmContact}
      />

      <ExternalActionConfirmDialog
        isOpen={isDirectionsDialogOpen && Boolean(directionsUrl)}
        title="Open directions?"
        description={`Google Maps will open directions to ${destinationName}.`}
        confirmLabel="Open Maps"
        icon={Navigation}
        iconClassName="text-blue-600"
        onCancel={() => setIsDirectionsDialogOpen(false)}
        onConfirm={() => {
          if (directionsUrl) {
            window.open(directionsUrl, "_blank", "noopener,noreferrer")
          }
          setIsDirectionsDialogOpen(false)
        }}
      />
    </>
  )
}
