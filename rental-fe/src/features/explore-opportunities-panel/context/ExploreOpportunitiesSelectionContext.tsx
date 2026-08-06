import { createContext, useContext } from "react"

import type {
  ExploreOpportunitiesMatchTab,
  ExploreOpportunitiesMobilePage,
} from "../types"

export type ExploreOpportunitiesSelectionContextValue = {
  matchTab: ExploreOpportunitiesMatchTab
  selectedOpportunityId: string | null
  mobilePage: ExploreOpportunitiesMobilePage
  setMatchTab: (tab: ExploreOpportunitiesMatchTab) => void
  selectOpportunity: (opportunityId: string) => void
  clearSelection: () => void
  showListPage: () => void
}

export const ExploreOpportunitiesSelectionContext =
  createContext<ExploreOpportunitiesSelectionContextValue | null>(null)

export function useExploreOpportunitiesSelection() {
  const context = useContext(ExploreOpportunitiesSelectionContext)
  if (!context) {
    throw new Error(
      "useExploreOpportunitiesSelection must be used within ExploreOpportunitiesPanelProvider",
    )
  }
  return context
}
