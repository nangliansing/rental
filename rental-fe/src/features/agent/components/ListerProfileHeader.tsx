import { useCallback, useMemo, useState } from "react"
import { Share2 } from "lucide-react"

import { ContactOptionsDialog } from "@/features/contacts/components/ContactOptionsDialog"
import { useContactActions } from "@/features/contacts/hooks/useContactActions"
import { toContactValues } from "@/features/contacts/utils/toContactValues"
import { MyProfileShareModal } from "@/features/profile/components/MyProfileShareModal"
import {
  ProfileAvatar,
  ProfileDetails,
  ProfileIdentity,
  ProfileStatList,
} from "@/features/profile/components/ProfileOverviewPrimitives"
import { normalizeListingSummary } from "@/features/profile/utils/profileListingSummary"
import { PROFILE_ICON_BUTTON_CLASS } from "@/features/profile/utils/profileLayoutStyles"
import { buildListerProfileStatItems } from "@/features/profile/utils/profileStatItems"

import { getListerProfileUrl } from "../utils/listerProfileUrl"

import type { ListerProfile } from "../api"

const PROFILE_ACTION_BUTTON_CLASSNAME =
  "inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"

export function ListerProfileHeader({ profile }: { profile: ListerProfile }) {
  const [isShareOpen, setIsShareOpen] = useState(false)
  const closeShareModal = useCallback(() => {
    setIsShareOpen(false)
  }, [])
  const profileUrl = useMemo(() => getListerProfileUrl(profile._id), [profile._id])

  return (
    <header className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 px-1 sm:max-w-xl">
      <ProfileAvatar
        displayName={profile.displayName}
        photo={profile.profilePhoto}
        isActive={profile.isOnline}
        statusLabel="Online lister"
        size="hero"
      />

      <ProfileIdentity
        displayName={profile.displayName}
        isVerified={profile.isVerified}
        align="center"
      />

      <ListerProfileStats profile={profile} />

      <div className="w-full max-w-md space-y-2 px-2 text-center">
        <ProfileDetails
          createdAt={profile.createdAt}
          description={profile.description}
          languages={profile.supportLanguages}
          emptyBioLabel={null}
          align="center"
        />
      </div>

      <ListerProfileActionBar
        profile={profile}
        profileUrl={profileUrl}
        isShareOpen={isShareOpen}
        onShareOpen={() => setIsShareOpen(true)}
      />

      {isShareOpen && (
        <MyProfileShareModal profile={profile} onClose={closeShareModal} />
      )}
    </header>
  )
}

function ListerProfileActionBar({
  profile,
  profileUrl,
  isShareOpen,
  onShareOpen,
}: {
  profile: ListerProfile
  profileUrl: string
  isShareOpen: boolean
  onShareOpen: () => void
}) {
  const {
    contactLinks,
    contactOwnerName,
    closeContactDialog,
    handleSelectContact,
    hasContactOptions,
    isContactDialogOpen,
    openContactDialog,
  } = useContactActions({
    contactOwnerName: profile.displayName,
    contacts: toContactValues(profile),
    context: {
      type: "profile",
      url: profileUrl,
      message: `Hi, I found your rental profile: ${profileUrl}`,
    },
  })

  if (!hasContactOptions) {
    return (
      <div className="flex w-full max-w-md justify-center px-2">
        <button
          type="button"
          className={PROFILE_ICON_BUTTON_CLASS}
          aria-label="Share profile"
          aria-expanded={isShareOpen}
          onClick={onShareOpen}
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-md items-center gap-2 px-2">
      <button
        type="button"
        className={`${PROFILE_ACTION_BUTTON_CLASSNAME} min-w-0 flex-1`}
        aria-haspopup="dialog"
        aria-expanded={isContactDialogOpen}
        onClick={openContactDialog}
      >
        Contact
      </button>
      <button
        type="button"
        className={PROFILE_ICON_BUTTON_CLASS}
        aria-label="Share profile"
        aria-expanded={isShareOpen}
        onClick={onShareOpen}
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
      </button>

      <ContactOptionsDialog
        contactLinks={contactLinks}
        contactOwnerName={contactOwnerName}
        isOpen={isContactDialogOpen}
        onClose={closeContactDialog}
        onSelectContact={handleSelectContact}
      />
    </div>
  )
}

function ListerProfileStats({ profile }: { profile: ListerProfile }) {
  const listingSummary = normalizeListingSummary(profile.listingSummary)

  return (
    <ProfileStatList
      variant="centered"
      items={buildListerProfileStatItems({
        activeCount: listingSummary.activeCount,
        reviewSummary: profile.reviewSummary,
      })}
    />
  )
}
