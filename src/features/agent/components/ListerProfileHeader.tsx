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

import { getListerProfileUrl } from "../utils/listerProfileUrl"

import type { ListerProfile } from "../api"

const PROFILE_ACTION_BUTTON_CLASSNAME =
  "inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-slate-100 px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"

const PROFILE_ICON_BUTTON_CLASSNAME =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-950 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"

export function ListerProfileHeader({ profile }: { profile: ListerProfile }) {
  const [isShareOpen, setIsShareOpen] = useState(false)
  const closeShareModal = useCallback(() => {
    setIsShareOpen(false)
  }, [])
  const profileUrl = useMemo(() => getListerProfileUrl(profile._id), [profile._id])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 md:flex-row md:items-start md:gap-6">
      <ProfileAvatar
        displayName={profile.displayName}
        photo={profile.profilePhoto}
        isActive={profile.isOnline}
        statusLabel="Online lister"
        size="compact"
      />

      <div className="flex w-full min-w-0 flex-1 flex-col items-center md:items-start">
        <ProfileIdentity
          displayName={profile.displayName}
          isVerified={profile.isVerified}
          align="center"
        />

        <div className="mt-3 w-full">
          <ListerProfileStats profile={profile} />
        </div>

        <ListerProfileActionBar
          profile={profile}
          profileUrl={profileUrl}
          isShareOpen={isShareOpen}
          onShareOpen={() => setIsShareOpen(true)}
        />

        <div className="mt-3 w-full max-w-xl">
          <ProfileDetails
            createdAt={profile.createdAt}
            description={profile.description}
            languages={profile.supportLanguages}
            emptyBioLabel={null}
            align="center"
          />
        </div>

        {isShareOpen && (
          <MyProfileShareModal profile={profile} onClose={closeShareModal} />
        )}
      </div>
    </div>
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
      <div className="mt-4 flex items-center justify-center md:justify-start">
        <button
          type="button"
          className={PROFILE_ICON_BUTTON_CLASSNAME}
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
    <>
      <div className="mt-4 flex items-center justify-center gap-2 md:justify-start">
        <button
          type="button"
          className={`${PROFILE_ACTION_BUTTON_CLASSNAME} min-w-[7.25rem] px-6`}
          aria-haspopup="dialog"
          aria-expanded={isContactDialogOpen}
          onClick={openContactDialog}
        >
          Contact
        </button>
        <button
          type="button"
          className={PROFILE_ICON_BUTTON_CLASSNAME}
          aria-label="Share profile"
          aria-expanded={isShareOpen}
          onClick={onShareOpen}
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <ContactOptionsDialog
        contactLinks={contactLinks}
        contactOwnerName={contactOwnerName}
        isOpen={isContactDialogOpen}
        onClose={closeContactDialog}
        onSelectContact={handleSelectContact}
      />
    </>
  )
}

function ListerProfileStats({ profile }: { profile: ListerProfile }) {
  const reviewSummary = profile.reviewSummary
  const reviewCount = reviewSummary?.reviewCount ?? 0
  const hasReviews = reviewCount > 0

  return (
    <ProfileStatList
      variant="inline"
      items={[
        {
          id: "listings",
          value: profile.listingSummary.activeCount,
          label: "Listings",
        },
        { id: "reviews", value: reviewCount, label: "Reviews" },
        {
          id: "rating",
          value: (reviewSummary?.averageRating ?? 0).toFixed(1),
          label: "Rating",
          hidden: !hasReviews,
        },
      ]}
    />
  )
}
