import { Inbox } from "lucide-react"

import { ListingCollectionMessage } from "@/shared/components/collections/ListingCollectionState"

import { EXPLORE_OPPORTUNITIES_PANEL_COPY } from "../../copy"

export function ExploreOpportunitiesDetailEmpty() {
  return (
    <ListingCollectionMessage
      className="min-h-full"
      icon={Inbox}
      title={EXPLORE_OPPORTUNITIES_PANEL_COPY.detailEmptyTitle}
      description={EXPLORE_OPPORTUNITIES_PANEL_COPY.detailEmptyDescription}
    />
  )
}
