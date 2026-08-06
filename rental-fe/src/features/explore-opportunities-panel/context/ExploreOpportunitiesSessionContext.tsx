import { createContext, useContext } from "react"

import type { ExploreOpportunitiesPanelSession } from "../types"

export type ExploreOpportunitiesSessionContextValue = {
  session: ExploreOpportunitiesPanelSession
  closePanel: () => void
}

export const ExploreOpportunitiesSessionContext =
  createContext<ExploreOpportunitiesSessionContextValue | null>(null)

export function useExploreOpportunitiesSession() {
  const context = useContext(ExploreOpportunitiesSessionContext)
  if (!context) {
    throw new Error(
      "useExploreOpportunitiesSession must be used within ExploreOpportunitiesPanelProvider",
    )
  }
  return context
}
