import type { ListerReviewSummary } from "@/features/lister-review/api"

import type { ProfileListingSummaryCounts } from "../utils/profileListingSummary"
import { buildOwnerProfileStatRows } from "../utils/profileStatItems"
import { PROFILE_STATS_WRAPPER_CLASS } from "../utils/profileLayoutStyles"
import { ProfileStatList } from "./ProfileOverviewPrimitives"

type MyProfileStatsProps = {
  listingSummary: ProfileListingSummaryCounts
  reviewSummary?: ListerReviewSummary | null
  variant?: "default" | "centered"
}

export function MyProfileStats({
  listingSummary,
  reviewSummary,
  variant = "default",
}: MyProfileStatsProps) {
  const { primary, secondary } = buildOwnerProfileStatRows({
    listingSummary,
    reviewSummary,
  })

  return (
    <div className={PROFILE_STATS_WRAPPER_CLASS}>
      <ProfileStatList variant={variant} items={primary} />
      <ProfileStatList variant={variant} items={secondary} />
    </div>
  )
}
