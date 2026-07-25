import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api-client"

import {
  ListerProfileHeader,
  ListerProfileListings,
  ListerProfileTabs,
  type ListerProfileMainTab,
} from "../components"
import { ListerReviewsSection } from "@/features/lister-review/components"
import { flattenUniqueInfiniteItems } from "@/shared/utils/infinitePages"
import {
  type SearchListingsByAgentSort,
  useListerProfileById,
  useSearchListingsByAgent,
} from "../api"

export function ListerProfilePage() {
  const { agentProfileId } = useParams()
  const [listingSort, setListingSort] =
    useState<SearchListingsByAgentSort>("latest")
  const [activeTab, setActiveTab] = useState<ListerProfileMainTab>("listings")
  const profileQuery = useListerProfileById({ agentProfileId })
  const profile = profileQuery.data
  const listingsQuery = useSearchListingsByAgent({
    agentProfileId,
    sort: listingSort,
    enabled: activeTab === "listings" && Boolean(profile),
  })

  const listings = useMemo(() => {
    return flattenUniqueInfiniteItems({
      data: listingsQuery.data,
      getItems: (page) => page.data.listings,
      getKey: (listing) => listing._id,
    })
  }, [listingsQuery.data])

  if (profileQuery.isLoading) {
    return <ListerPageLoading />
  }

  if (profileQuery.isError) {
    const isNotFound =
      profileQuery.error instanceof ApiError &&
      (profileQuery.error.status === 404 ||
        profileQuery.error.code === "AGENT_PROFILE_NOT_FOUND")

    if (isNotFound) {
      return <ListerPageNotFound />
    }

    return (
      <ListerPageError onRetry={() => void profileQuery.refetch()} />
    )
  }

  if (!profile) {
    return <ListerPageNotFound />
  }

  return (
    <main className="min-h-screen bg-white pb-10 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <section className="px-4 pt-5 md:pt-6">
          <ListerProfileHeader profile={profile} />
        </section>

        <section className="mt-2 px-4">
          <div className="mx-auto w-full max-w-4xl">
            <ListerProfileTabs
              activeTab={activeTab}
              activeSort={listingSort}
              onTabChange={setActiveTab}
              onSortChange={setListingSort}
            />

            {activeTab === "listings" ? (
              <ListerProfileListings
                listings={listings}
                isLoading={listingsQuery.isLoading}
                isError={listingsQuery.isError}
                hasNextPage={Boolean(listingsQuery.hasNextPage)}
                isFetchingNextPage={listingsQuery.isFetchingNextPage}
                isFetchNextPageError={listingsQuery.isFetchNextPageError}
                onRetry={() => void listingsQuery.refetch()}
                onFetchNextPage={() => {
                  void listingsQuery.fetchNextPage()
                }}
              />
            ) : (
              <ListerReviewsSection
                listerProfileId={profile._id}
                listerUserId={profile.userId}
                reviewSummary={profile.reviewSummary}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function ListerPageLoading() {
  return (
    <main className="min-h-screen bg-white px-4 pb-10 pt-6 text-slate-950">
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center gap-2 text-sm font-medium text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading lister...
      </div>
    </main>
  )
}

function ListerPageError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="min-h-screen bg-white px-4 pb-10 pt-6 text-slate-950">
      <div className="mx-auto max-w-xl">
        <div className="mt-16 text-center">
          <h1 className="text-xl font-semibold">Could not load lister</h1>
          <p className="mt-2 text-sm text-slate-500">
            Please check your connection and try again.
          </p>
          <Button
            className="mt-6 h-11 rounded-full"
            type="button"
            onClick={onRetry}
          >
            Try again
          </Button>
        </div>
      </div>
    </main>
  )
}

function ListerPageNotFound() {
  return (
    <main className="min-h-screen bg-white px-4 pb-10 pt-6 text-slate-950">
      <div className="mx-auto max-w-xl">
        <div className="mt-16 text-center">
          <h1 className="text-xl font-semibold">Lister not found</h1>
          <p className="mt-2 text-sm text-slate-500">
            This profile may no longer be available.
          </p>
        </div>
      </div>
    </main>
  )
}
