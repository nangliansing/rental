import { useCallback, useMemo, useState, type ReactNode } from "react"

import {
  ExploreOpportunitiesSelectionContext,
  type ExploreOpportunitiesSelectionContextValue,
} from "./ExploreOpportunitiesSelectionContext"
import {
  ExploreOpportunitiesSessionContext,
  type ExploreOpportunitiesSessionContextValue,
} from "./ExploreOpportunitiesSessionContext"
import type {
  ExploreOpportunitiesMatchTab,
  ExploreOpportunitiesMobilePage,
  ExploreOpportunitiesPanelSession,
} from "../types"

type ExploreOpportunitiesPanelProviderProps = {
  session: ExploreOpportunitiesPanelSession
  onClose: () => void
  children: ReactNode
}

export function ExploreOpportunitiesPanelProvider({
  session,
  onClose,
  children,
}: ExploreOpportunitiesPanelProviderProps) {
  const [matchTab, setMatchTabState] =
    useState<ExploreOpportunitiesMatchTab>("unmatched")
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<
    string | null
  >(null)
  const [mobilePage, setMobilePage] =
    useState<ExploreOpportunitiesMobilePage>("list")

  const setMatchTab = useCallback((tab: ExploreOpportunitiesMatchTab) => {
    setMatchTabState(tab)
    setSelectedOpportunityId(null)
    setMobilePage("list")
  }, [])

  const selectOpportunity = useCallback((opportunityId: string) => {
    const normalized = opportunityId.trim()
    if (!normalized) return
    setSelectedOpportunityId(normalized)
    setMobilePage("detail")
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedOpportunityId(null)
    setMobilePage("list")
  }, [])

  const showListPage = useCallback(() => {
    setMobilePage("list")
  }, [])

  const sessionValue = useMemo<ExploreOpportunitiesSessionContextValue>(
    () => ({
      session,
      closePanel: onClose,
    }),
    [session, onClose],
  )

  const selectionValue = useMemo<ExploreOpportunitiesSelectionContextValue>(
    () => ({
      matchTab,
      selectedOpportunityId,
      mobilePage,
      setMatchTab,
      selectOpportunity,
      clearSelection,
      showListPage,
    }),
    [
      matchTab,
      selectedOpportunityId,
      mobilePage,
      setMatchTab,
      selectOpportunity,
      clearSelection,
      showListPage,
    ],
  )

  return (
    <ExploreOpportunitiesSessionContext.Provider value={sessionValue}>
      <ExploreOpportunitiesSelectionContext.Provider value={selectionValue}>
        {children}
      </ExploreOpportunitiesSelectionContext.Provider>
    </ExploreOpportunitiesSessionContext.Provider>
  )
}
