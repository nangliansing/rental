import { BadgeCheck } from "lucide-react"

import type { ListingAgentProfile } from "@/features/map-search/types"
import { normalizeReviewSummary } from "@/features/profile/utils/profileStatItems"
import { Avatar } from "@/shared/components/data-display/Avatar"

function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed || null
}

function formatReviewSummaryLine(
  reviewSummary: ListingAgentProfile["reviewSummary"],
): string | null {
  const { averageRating, hasReviews, reviewCount } =
    normalizeReviewSummary(reviewSummary)

  if (!hasReviews) return null

  return `${averageRating.toFixed(1)} (${reviewCount})`
}

export type ListingGridCardAgentAttributionProps = {
  agent: ListingAgentProfile | null | undefined
}

export function ListingGridCardAgentAttribution({
  agent,
}: ListingGridCardAgentAttributionProps) {
  if (!agent) return null

  const displayName = normalizeDisplayName(agent.displayName)
  if (!displayName) return null

  const reviewLine = formatReviewSummaryLine(agent.reviewSummary)
  const isVerified = agent.isVerified === true

  return (
    <div
      data-slot="listing-grid-card-agent"
      className="mt-1.5 flex min-w-0 items-center gap-1.5 border-t border-white/15 pt-1.5"
    >
      <Avatar
        displayName={displayName}
        photo={agent.profilePhoto}
        size="xs"
        loading="eager"
        className="ring-white/20"
      />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-0.5">
          <span className="truncate text-[11px] font-semibold leading-4 text-white">
            {displayName}
          </span>
          {isVerified && (
            <BadgeCheck
              className="h-3 w-3 shrink-0 text-sky-300"
              aria-label="Verified lister"
            />
          )}
        </div>
        {reviewLine && (
          <p className="truncate text-[10px] font-medium leading-4 text-white/70">
            {reviewLine}
          </p>
        )}
      </div>
    </div>
  )
}
