import { useState } from "react"

import type { AuthUser } from "@/features/auth/api"
import { ListerReviewsSection } from "@/features/lister-review/components"

import type { AgentProfile } from "../api"
import {
  MyProfileProvider,
  useMyProfile,
  type MyProfileContextValue,
} from "../context/MyProfileContext"
import { MyProfileActions } from "./MyProfileActions"
import { MyProfileFirstListingPrompt } from "./MyProfileFirstListingPrompt"
import { MyProfileHeader } from "./MyProfileHeader"
import { MyProfileListingsPanel } from "./MyProfileListingsPanel"
import { MyProfilePendingPanel } from "./MyProfilePendingPanel"
import { MyProfileSavedPanel } from "./MyProfileSavedPanel"
import {
  MyProfileListingTabs,
  type MyProfileListingFilter,
  type MyProfileListingSort,
  type MyProfileMainTab,
  type MyProfilePendingFilter,
} from "./MyProfileListingTabs"
import { MyProfileStats } from "./MyProfileStats"

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
      <div className="mx-auto max-w-6xl">
        <MyProfileOverviewSection />
        <MyProfileTabsSection />
      </div>
    </MyProfileProvider>
  )
}

function MyProfileOverviewSection() {
  const { user, profile } = useMyProfile()
  const listingSummary = profile.listingSummary ?? {
    activeCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
  }
  const showFirstListingPrompt =
    listingSummary.activeCount === 0 && listingSummary.pendingCount === 0

  return (
    <section className="pt-4 md:pt-8">
      <MyProfileHeader user={user} profile={profile} />

      <div className="mx-auto max-w-4xl md:mx-0 md:pl-[calc(9rem+2.5rem)] lg:pl-[calc(10rem+2.5rem)]">
        <MyProfileStats
          activeCount={listingSummary.activeCount}
          pendingCount={listingSummary.pendingCount}
          rejectedCount={listingSummary.rejectedCount}
          reviewSummary={profile.reviewSummary}
        />

        {showFirstListingPrompt && <MyProfileFirstListingPrompt />}

        <MyProfileActions />
      </div>
    </section>
  )
}

function MyProfileTabsSection() {
  const { profile, onProfileChange } = useMyProfile()
  const [activeTab, setActiveTab] = useState<MyProfileMainTab>("listings")
  const [activeListingFilter, setActiveListingFilter] =
    useState<MyProfileListingFilter>("all")
  const [activeListingSort, setActiveListingSort] =
    useState<MyProfileListingSort>("latest")
  const [activePendingFilter, setActivePendingFilter] =
    useState<MyProfilePendingFilter>("all")

  return (
    <section className="-mx-4 mt-10 sm:mx-0">
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
            if (!profile.listingSummary) return

            const pendingDelta = post.status === "PENDING" ? 1 : 0
            const rejectedDelta = post.status === "REJECTED" ? 1 : 0

            if (pendingDelta === 0 && rejectedDelta === 0) return

            onProfileChange({
              ...profile,
              listingSummary: {
                ...profile.listingSummary,
                pendingCount: Math.max(
                  0,
                  profile.listingSummary.pendingCount - pendingDelta,
                ),
                rejectedCount: Math.max(
                  0,
                  profile.listingSummary.rejectedCount - rejectedDelta,
                ),
              },
            })
          }}
        />
      )}

      {activeTab === "saved" && <MyProfileSavedPanel />}

      {activeTab === "reviews" && (
        <ListerReviewsSection
          className="px-4 sm:px-0"
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
