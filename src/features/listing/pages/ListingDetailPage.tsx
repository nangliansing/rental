import type { ReactNode } from "react"
import { FileQuestion, Loader2 } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import { useAuth } from "@/features/auth/hooks/useAuth"
import { useMyAgentProfile } from "@/features/profile/api"
import { useNavigateBack } from "@/shared/hooks/useNavigateBack"

import { ListingDetailContent } from "../components/ListingDetailContent"
import { useListingDetailData } from "../hooks/useListingDetailData"

export function ListingDetailPage() {
  const { listingId } = useParams<{ listingId: string }>()
  const navigateBack = useNavigateBack("/")
  const { isAuthenticated } = useAuth()
  const agentProfileQuery = useMyAgentProfile({
    enabled: isAuthenticated,
  })
  const { listing, isLoading, viewerUserId } = useListingDetailData({
    listingId,
  })

  if (isLoading) {
    return (
      <ListingDetailShell>
        <div className="flex min-h-[55vh] items-center justify-center gap-2 text-sm font-medium text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading listing...
        </div>
      </ListingDetailShell>
    )
  }

  if (!listing) {
    return (
      <ListingDetailShell>
        <ListingNotFound />
      </ListingDetailShell>
    )
  }

  return (
    <ListingDetailShell>
      <ListingDetailContent
        listing={listing}
        currentUserId={viewerUserId}
        canCreateListing={agentProfileQuery.canCreateListing}
        onDeleted={navigateBack}
      />
    </ListingDetailShell>
  )
}

function ListingNotFound() {
  const navigate = useNavigate()
  const navigateBack = useNavigateBack("/")

  return (
    <div className="flex min-h-[58vh] flex-col items-center justify-center px-6 text-center">
      <FileQuestion className="h-14 w-14 text-slate-400" />

      <h1 className="mt-5 text-2xl font-semibold text-slate-950">
        Listing not found
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        This listing may be private, removed, or no longer available to view.
      </p>

      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className="inline-flex h-10 min-w-32 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
          onClick={() => navigate("/")}
        >
          Browse listings
        </button>
        <button
          type="button"
          className="inline-flex h-10 min-w-24 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-950"
          onClick={navigateBack}
        >
          Go back
        </button>
      </div>
    </div>
  )
}

function ListingDetailShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-white pb-10 text-slate-950">
      <div className="mx-auto max-w-2xl">{children}</div>
    </main>
  )
}
