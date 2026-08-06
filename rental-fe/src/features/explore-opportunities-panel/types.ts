import type { DemandOpportunityArea } from "@/features/agent-demand-opportunity/api"
import type { ReadOnlyMapGeo } from "@/shared/google-maps/readonly-map"

/** Immutable payload captured when the agent opens explore from the map. */
export type ExploreOpportunitiesPanelSession = {
  demandArea: DemandOpportunityArea
  previewGeo: ReadOnlyMapGeo
  areaTitle: string
  areaDetail: string
}

export type ExploreOpportunitiesMatchTab = "unmatched" | "matched"

export type ExploreOpportunitiesMobilePage = "list" | "detail"
