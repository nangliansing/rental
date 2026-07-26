import { ProfileHeaderDetailsBlock } from "@/features/profile/components/ProfileHeaderDetailsBlock"
import { PublicProfileStats } from "@/features/profile/components/PublicProfileStats"
import {
  ProfileAvatar,
  ProfileIdentity,
} from "@/features/profile/components/ProfileOverviewPrimitives"
import { buildProfileContactChips } from "@/features/profile/utils/buildProfileContactChips"
import {
  PROFILE_AVATAR_CELL_CLASS,
  PROFILE_DETAILS_CELL_CLASS,
} from "@/features/profile/utils/profileLayoutStyles"

import { ListerProfileActions } from "./ListerProfileActions"

import type { ListerProfile } from "../api"

export function ListerProfileHeader({ profile }: { profile: ListerProfile }) {
  const contactChips = buildProfileContactChips(profile)

  return (
    <>
      <div className={PROFILE_AVATAR_CELL_CLASS}>
        <ProfileAvatar
          displayName={profile.displayName}
          photo={profile.profilePhoto}
          isActive={profile.isOnline}
          statusLabel="Online lister"
          size="hero"
        />
      </div>

      <div className={PROFILE_DETAILS_CELL_CLASS}>
        <ProfileIdentity
          displayName={profile.displayName}
          isVerified={profile.isVerified}
          align="start"
        />

        <PublicProfileStats
          listingSummary={profile.listingSummary}
          reviewSummary={profile.reviewSummary}
        />

        <ProfileHeaderDetailsBlock
          contacts={contactChips}
          createdAt={profile.createdAt}
          description={profile.description}
          languages={profile.supportLanguages}
          emptyBioLabel={null}
        />

        <ListerProfileActions profile={profile} />
      </div>
    </>
  )
}
