import { useState } from "react"

import {
  SwipeableActionCard,
} from "@/shared/components/data-display/SwipeableActionCard"
import { useInView } from "@/shared/hooks/useInView"

import type { ListingDetailListing } from "../../types"
import { formatReviewTitleMeta } from "../../utils/formatReviewTitleMeta"
import { ListerReviewsDialog } from "../ListerReviewsDialog"
import { ListingReviewsComingSoon } from "./ListingReviewsComingSoon"
import { ListerReviewTeasersPage } from "./ListerReviewTeasersPage"

type ListingDetailReviewsSectionProps = {
  listing: ListingDetailListing
}

export function ListingDetailReviewsSection({
  listing,
}: ListingDetailReviewsSectionProps) {
  const agent = listing.agentProfile
  const listerSummary = agent?.reviewSummary
  const listerMeta = formatReviewTitleMeta(
    listerSummary?.averageRating,
    listerSummary?.reviewCount,
  )
  const { ref, isInView } = useInView({
    threshold: 0.2,
    rootMargin: "120px 0px",
  })
  const [isReviewsDialogOpen, setIsReviewsDialogOpen] = useState(false)

  return (
    <section
      ref={ref}
      className="bg-white px-4 py-3 sm:px-6"
      aria-label="Reviews"
    >
      <SwipeableActionCard
        aria-label="Review highlights"
        onClick={
          agent
            ? () => {
                setIsReviewsDialogOpen(true)
              }
            : undefined
        }
      >
        <SwipeableActionCard.Page
          title="Lister reviews"
          meta={listerMeta ?? "No reviews yet"}
        >
          <ListerReviewTeasersPage
            listerProfileId={agent?._id}
            reviewCount={listerSummary?.reviewCount}
            tagCounts={listerSummary?.tagCounts}
            enabled={isInView}
          />
        </SwipeableActionCard.Page>
        <SwipeableActionCard.Page
          title="Listing reviews"
          meta="Coming soon"
          disabled
        >
          <ListingReviewsComingSoon />
        </SwipeableActionCard.Page>
      </SwipeableActionCard>

      {agent && (
        <ListerReviewsDialog
          agent={agent}
          isOpen={isReviewsDialogOpen}
          onClose={() => setIsReviewsDialogOpen(false)}
        />
      )}
    </section>
  )
}
