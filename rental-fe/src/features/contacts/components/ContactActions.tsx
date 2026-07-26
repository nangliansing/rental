import { useMemo } from "react"
import { cn } from "@/lib/utils"

import { useContactActions } from "../hooks/useContactActions"
import type { ContactContext, ContactValues } from "../types"
import type { DirectionsDestination } from "../utils/buildGoogleMapsDirectionsUrl"
import { resolveDirectionsAction } from "../utils/directionsDisplay"
import { ContactOptionsDialog } from "./ContactOptionsDialog"
import { ContactTriggerButton } from "./ContactTriggerButton"
import { DirectionsAction } from "./DirectionsAction"

type ContactActionsProps = {
  contactOwnerName: unknown
  contacts: ContactValues | null | undefined
  context?: ContactContext
  directionsDestination?: DirectionsDestination | null
  className?: string
  leadingAction?: React.ReactNode
  trailingAction?: React.ReactNode
}

export function ContactActions({
  contactOwnerName,
  contacts,
  context,
  directionsDestination,
  className,
  leadingAction,
  trailingAction,
}: ContactActionsProps) {
  const {
    contactLinks,
    contactOwnerName: ownerName,
    closeContactDialog,
    handleSelectContact,
    hasContactOptions,
    isContactDialogOpen,
    openContactDialog,
  } = useContactActions({ contactOwnerName, contacts, context })

  const { hasDirections, normalizedDestination } = useMemo(
    () => resolveDirectionsAction(directionsDestination),
    [directionsDestination],
  )
  const hasFooterActions =
    hasContactOptions ||
    hasDirections ||
    Boolean(leadingAction) ||
    Boolean(trailingAction)

  if (!hasFooterActions) return null

  return (
    <>
      <footer
        className={cn(
          "flex items-center gap-1",
          trailingAction && "justify-between",
          className,
        )}
      >
        <div className="flex items-center gap-1">
          {leadingAction}
          {hasContactOptions && (
            <ContactTriggerButton
              contactOwnerName={ownerName}
              isOpen={isContactDialogOpen}
              onClick={openContactDialog}
            />
          )}
          {hasDirections && normalizedDestination && (
            <DirectionsAction destination={normalizedDestination} />
          )}
        </div>
        {trailingAction}
      </footer>

      {hasContactOptions && (
        <ContactOptionsDialog
          contactLinks={contactLinks}
          contactOwnerName={ownerName}
          isOpen={isContactDialogOpen}
          onClose={closeContactDialog}
          onSelectContact={handleSelectContact}
        />
      )}
    </>
  )
}
