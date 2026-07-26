import type { ListerReviewSummary } from "@/features/lister-review/api"

import type { ProfileListingSummaryCounts } from "../utils/profileListingSummary"
import { normalizeListingSummary } from "../utils/profileListingSummary"
import { PROFILE_STATS_WRAPPER_CLASS } from "../utils/profileLayoutStyles"
import { buildListerProfileStatItems } from "../utils/profileStatItems"
import { ProfileStatList } from "./ProfileOverviewPrimitives"

type PublicProfileStatsProps = {
  listingSummary?: Partial<ProfileListingSummaryCounts> | null
  reviewSummary?: ListerReviewSummary | null
  variant?: "default" | "centered"
}

export function PublicProfileStats({
  listingSummary,
  reviewSummary,
  variant = "centered",
}: PublicProfileStatsProps) {
  const normalizedListingSummary = normalizeListingSummary(listingSummary)

  return (
    <div className={PROFILE_STATS_WRAPPER_CLASS}>
      <ProfileStatList
        variant={variant}
        items={buildListerProfileStatItems({
          activeCount: normalizedListingSummary.activeCount,
          reviewSummary,
        })}
      />
    </div>
  )
}
