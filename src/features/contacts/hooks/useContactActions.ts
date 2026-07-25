import { useCallback, useMemo, useState } from "react"

import { useCopyFeedback } from "@/shared/hooks/useCopyFeedback"

import type { ContactContext, ContactLink, ContactValues } from "../types"
import { buildContactLinks } from "../utils/buildContactLinks"
import { normalizeContactOwnerName } from "../utils/contactNormalization"
import { openContactLink } from "../utils/openContactLink"
import { toContactValues } from "../utils/toContactValues"

type UseContactActionsOptions = {
  contactOwnerName: unknown
  contacts: ContactValues | null | undefined
  context?: ContactContext
}

export function useContactActions({
  contactOwnerName,
  contacts,
  context,
}: UseContactActionsOptions) {
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false)
  const { copy } = useCopyFeedback()

  const ownerName = useMemo(
    () => normalizeContactOwnerName(contactOwnerName),
    [contactOwnerName],
  )
  const normalizedContacts = useMemo(() => toContactValues(contacts), [contacts])
  const contactLinks = useMemo(
    () => buildContactLinks(normalizedContacts, context),
    [normalizedContacts, context],
  )
  const hasContactOptions = contactLinks.length > 0

  const openContactDialog = useCallback(() => {
    setIsContactDialogOpen(true)
  }, [])

  const closeContactDialog = useCallback(() => {
    setIsContactDialogOpen(false)
  }, [])

  const handleSelectContact = useCallback(
    async (contact: ContactLink) => {
      await openContactLink(contact, copy)
      setIsContactDialogOpen(false)
    },
    [copy],
  )

  return {
    contactLinks,
    contactOwnerName: ownerName,
    closeContactDialog,
    handleSelectContact,
    hasContactOptions,
    isContactDialogOpen,
    openContactDialog,
  }
}
