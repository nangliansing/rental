import { useState } from "react"

import type { AuthUser } from "@/features/auth/api"
import type {
  OwnerListingFilter,
  OwnerListingSort,
} from "@/features/listing/api"
import { ListerReviewsSection } from "@/features/lister-review/components"

import type { AgentProfile } from "../api"
import {
  MyProfileProvider,
  useMyProfile,
  type MyProfileContextValue,
} from "../context/MyProfileContext"
import {
  normalizeListingSummary,
  decrementListingSummaryCounts,
  shouldShowFirstListingPrompt,
} from "../utils/profileListingSummary"
import {
  PROFILE_PAGE_GRID_CLASS,
  PROFILE_TAB_CONTENT_TOP_CLASS,
  PROFILE_TABS_SECTION_CLASS,
} from "../utils/profileLayoutStyles"
import { MyProfileFirstListingPrompt } from "./MyProfileFirstListingPrompt"
import { MyProfileHeader } from "./MyProfileHeader"
import { MyProfileListingsPanel } from "./MyProfileListingsPanel"
import { MyProfilePendingPanel } from "./MyProfilePendingPanel"
import { MyProfileSavedPanel } from "./MyProfileSavedPanel"
import {
  MyProfileListingTabs,
  type MyProfileMainTab,
  type MyProfilePendingFilter,
} from "./MyProfileListingTabs"

type MyProfileContentProps = {
  user: AuthUser | null
  profile: AgentProfile
  onProfileChange: (profile: AgentProfile) => void
  logout: MyProfileContextValue["logout"]
}

export function MyProfileContent({
  user,
  profile,
  onProfileChange,
  logout,
}: MyProfileContentProps) {
  return (
    <MyProfileProvider
      value={{
        user,
        profile,
        onProfileChange,
        logout,
      }}
    >
      <div className={PROFILE_PAGE_GRID_CLASS}>
        <MyProfileOverviewSection />
        <MyProfileTabsSection />
      </div>
    </MyProfileProvider>
  )
}

function MyProfileOverviewSection() {
  const { user, profile } = useMyProfile()
  const listingSummary = normalizeListingSummary(profile.listingSummary)
  const showFirstListingPrompt = shouldShowFirstListingPrompt(listingSummary)

  return (
    <MyProfileHeader
      user={user}
      profile={profile}
      footer={
        showFirstListingPrompt ? (
          <div className="mt-2 w-full max-w-md px-2 md:max-w-xl md:px-0">
            <MyProfileFirstListingPrompt />
          </div>
        ) : null
      }
    />
  )
}

function MyProfileTabsSection() {
  const { profile, onProfileChange } = useMyProfile()
  const [activeTab, setActiveTab] = useState<MyProfileMainTab>("listings")
  const [activeListingFilter, setActiveListingFilter] =
    useState<OwnerListingFilter>("all")
  const [activeListingSort, setActiveListingSort] =
    useState<OwnerListingSort>("latest")
  const [activePendingFilter, setActivePendingFilter] =
    useState<MyProfilePendingFilter>("all")

  return (
    <section className={PROFILE_TABS_SECTION_CLASS}>
      <MyProfileListingTabs
        activeTab={activeTab}
        activeListingFilter={activeListingFilter}
        activeListingSort={activeListingSort}
        activePendingFilter={activePendingFilter}
        onTabChange={setActiveTab}
        onListingFilterChange={setActiveListingFilter}
        onListingSortChange={setActiveListingSort}
        onPendingFilterChange={setActivePendingFilter}
      />

      {activeTab === "pending" && (
        <MyProfilePendingPanel
          filter={activePendingFilter}
          onPendingPostDeleted={(post) => {
            const pendingDelta = post.status === "PENDING" ? 1 : 0
            const rejectedDelta = post.status === "REJECTED" ? 1 : 0

            if (pendingDelta === 0 && rejectedDelta === 0) return

            onProfileChange({
              ...profile,
              listingSummary: decrementListingSummaryCounts(
                profile.listingSummary,
                { pending: pendingDelta, rejected: rejectedDelta },
              ),
            })
          }}
        />
      )}

      {activeTab === "saved" && <MyProfileSavedPanel />}

      {activeTab === "reviews" && (
        <ListerReviewsSection
          className={`${PROFILE_TAB_CONTENT_TOP_CLASS} px-4 sm:px-0`}
          listerProfileId={profile._id}
          listerUserId={profile.userId}
          reviewSummary={profile.reviewSummary}
        />
      )}

      {activeTab === "listings" && (
        <MyProfileListingsPanel
          filter={activeListingFilter}
          sort={activeListingSort}
        />
      )}
    </section>
  )
}
