import type { ListerReviewSummary } from "@/features/lister-review/api"
import { ProfileStatList } from "./ProfileOverviewPrimitives"

type MyProfileStatsProps = {
    activeCount?: number
    pendingCount?: number
    rejectedCount?: number
    reviewSummary?: ListerReviewSummary | null
}

export function MyProfileStats({
    activeCount = 0,
    pendingCount = 0,
    rejectedCount = 0,
    reviewSummary,
}: MyProfileStatsProps) {
    const reviewCount = reviewSummary?.reviewCount ?? 0
    const averageRating = reviewSummary?.averageRating ?? 0
    const hasReviews = reviewCount > 0

    return (
        <ProfileStatList
            items={[
                { id: "listings", value: activeCount, label: "Listings" },
                { id: "reviews", value: reviewCount, label: "Reviews" },
                {
                    id: "rating",
                    value: averageRating.toFixed(1),
                    label: "Rating",
                    hidden: !hasReviews,
                },
                { id: "pending", value: pendingCount, label: "Pending" },
                {
                    id: "rejected",
                    value: rejectedCount,
                    label: "Rejected",
                    hidden: rejectedCount <= 0,
                },
            ]}
        />
    )
}
