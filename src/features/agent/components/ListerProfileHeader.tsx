import { useCallback, useMemo, useState } from "react"
import { Share2 } from "lucide-react"

import { ContactActions } from "@/features/contacts/components/ContactActions"
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

export function ListerProfileHeader({ profile }: { profile: ListerProfile }) {
  const [isShareOpen, setIsShareOpen] = useState(false)
  const closeShareModal = useCallback(() => {
    setIsShareOpen(false)
  }, [])
  const profileUrl = useMemo(() => getListerProfileUrl(profile._id), [profile._id])

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 md:mx-0 md:flex-row md:items-start md:gap-8">
      <ProfileAvatar
        displayName={profile.displayName}
        photo={profile.profilePhoto}
        isActive={profile.isOnline}
        statusLabel="Online lister"
        size="medium"
      />

      <div className="min-w-0 flex-1 text-center md:text-left">
        <ProfileIdentity
          displayName={profile.displayName}
          isVerified={profile.isVerified}
        />

        <div className="mx-auto mt-2 max-w-xl space-y-2 md:mx-0">
          <ProfileDetails
            createdAt={profile.createdAt}
            description={profile.description}
            languages={profile.supportLanguages}
          />
        </div>

        <div className="mt-4 flex min-w-0 flex-wrap items-center justify-center gap-2 md:justify-start">
          <ContactActions
            contactOwnerName={profile.displayName}
            contacts={toContactValues(profile)}
            context={{
              type: "profile",
              url: profileUrl,
              message: `Hi, I found your rental profile: ${profileUrl}`,
            }}
            className="max-w-full justify-center md:justify-start"
          />
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 hover:bg-slate-50"
            aria-label="Share profile"
            aria-expanded={isShareOpen}
            onClick={() => setIsShareOpen(true)}
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        <ListerProfileStats profile={profile} />

        {isShareOpen && (
          <MyProfileShareModal profile={profile} onClose={closeShareModal} />
        )}
      </div>
    </div>
  )
}

function ListerProfileStats({ profile }: { profile: ListerProfile }) {
  const reviewSummary = profile.reviewSummary
  const reviewCount = reviewSummary?.reviewCount ?? 0
  const hasReviews = reviewCount > 0

  return (
    <ProfileStatList
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
