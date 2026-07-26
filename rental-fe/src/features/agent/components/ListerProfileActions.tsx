import { useCallback, useMemo, useState } from "react"
import { Share2 } from "lucide-react"

import { ContactOptionsDialog } from "@/features/contacts/components/ContactOptionsDialog"
import { useContactActions } from "@/features/contacts/hooks/useContactActions"
import { toContactValues } from "@/features/contacts/utils/toContactValues"
import { MyProfileShareModal } from "@/features/profile/components/MyProfileShareModal"
import {
  buildProfileShareMessage,
  normalizeProfileDisplayName,
  normalizeProfileId,
} from "@/features/profile/utils/profileDisplayUtils"
import {
  PROFILE_ACTIONS_ROW_CLASS,
  PROFILE_ICON_BUTTON_CLASS,
  PROFILE_PRIMARY_ACTION_CLASS,
} from "@/features/profile/utils/profileLayoutStyles"

import { getListerProfileUrl } from "../utils/listerProfileUrl"

import type { ListerProfile } from "../api"

type ListerProfileActionsProps = {
  profile: ListerProfile
}

export function ListerProfileActions({ profile }: ListerProfileActionsProps) {
  const [isShareOpen, setIsShareOpen] = useState(false)
  const closeShareModal = useCallback(() => {
    setIsShareOpen(false)
  }, [])

  const profileId = normalizeProfileId(profile._id)
  const profileUrl = useMemo(
    () => (profileId ? getListerProfileUrl(profileId) : ""),
    [profileId],
  )
  const displayName = normalizeProfileDisplayName(profile.displayName, "Lister")
  const {
    contactLinks,
    contactOwnerName,
    closeContactDialog,
    handleSelectContact,
    hasContactOptions,
    isContactDialogOpen,
    openContactDialog,
  } = useContactActions({
    contactOwnerName: displayName,
    contacts: toContactValues(profile),
    context: {
      type: "profile",
      url: profileUrl,
      message: buildProfileShareMessage(profileUrl),
    },
  })

  return (
    <>
      <div className={PROFILE_ACTIONS_ROW_CLASS}>
        {hasContactOptions ? (
          <button
            type="button"
            className={PROFILE_PRIMARY_ACTION_CLASS}
            aria-haspopup="dialog"
            aria-expanded={isContactDialogOpen}
            onClick={openContactDialog}
          >
            Contact
          </button>
        ) : null}

        <button
          type="button"
          className={PROFILE_ICON_BUTTON_CLASS}
          aria-label="Share profile"
          aria-expanded={isShareOpen}
          onClick={() => setIsShareOpen(true)}
        >
          <Share2 className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {hasContactOptions ? (
        <ContactOptionsDialog
          contactLinks={contactLinks}
          contactOwnerName={contactOwnerName}
          isOpen={isContactDialogOpen}
          onClose={closeContactDialog}
          onSelectContact={handleSelectContact}
        />
      ) : null}

      {isShareOpen ? (
        <MyProfileShareModal profile={profile} onClose={closeShareModal} />
      ) : null}
    </>
  )
}
