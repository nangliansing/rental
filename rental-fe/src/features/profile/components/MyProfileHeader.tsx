import type { ReactNode } from "react"

import type { AuthUser } from "@/features/auth/api"

import type { AgentProfile } from "../api"
import { buildProfileContactChips } from "../utils/buildProfileContactChips"
import {
  normalizeListingSummary,
} from "../utils/profileListingSummary"
import {
  PROFILE_AVATAR_CELL_CLASS,
  PROFILE_DETAILS_CELL_CLASS,
  PROFILE_EDIT_PATH,
} from "../utils/profileLayoutStyles"
import { MyProfileActions } from "./MyProfileActions"
import { ProfileContactChips } from "./ProfileContactChips"
import { MyProfileStats } from "./MyProfileStats"
import {
  ProfileAvatar,
  ProfileDetails,
  ProfileIdentity,
} from "./ProfileOverviewPrimitives"

type MyProfileHeaderProps = {
  user: AuthUser | null
  profile: AgentProfile
  footer?: ReactNode
}

export function MyProfileHeader({ user, profile, footer }: MyProfileHeaderProps) {
  const contactChips = buildProfileContactChips(profile)
  const listingSummary = normalizeListingSummary(profile.listingSummary)

  return (
    <>
      <div className={PROFILE_AVATAR_CELL_CLASS}>
        <ProfileAvatar
          displayName={profile.displayName}
          photo={profile.profilePhoto}
          isActive={profile.isOnline}
          size="hero"
          statusLabel="Online lister"
          editHref={PROFILE_EDIT_PATH}
        />
      </div>

      <div className={PROFILE_DETAILS_CELL_CLASS}>
        <ProfileIdentity
          displayName={profile.displayName}
          isVerified={profile.isVerified}
          secondaryText={user?.email ?? "Contact profile"}
          align="start"
        />

        <MyProfileStats
          variant="centered"
          listingSummary={listingSummary}
          reviewSummary={profile.reviewSummary}
        />

        <div className="w-full max-w-md space-y-2 px-2 md:max-w-none md:px-0">
          <ProfileDetails
            createdAt={profile.createdAt}
            description={profile.description}
            languages={profile.supportLanguages}
            align="start"
          />
          <ProfileContactChips contacts={contactChips} />
        </div>

        <MyProfileActions />

        {footer}
      </div>
    </>
  )
}
