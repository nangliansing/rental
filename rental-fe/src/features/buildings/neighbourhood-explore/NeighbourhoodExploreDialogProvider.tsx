import {
  createContext,
  useContext,
  type ReactNode,
} from "react"

import { BuildingNeighbourhoodExploreModal } from "./components/BuildingNeighbourhoodExploreModal"
import { useNeighbourhoodExploreDialog } from "./hooks/useNeighbourhoodExploreDialog"

export type NeighbourhoodExploreDialogControl = ReturnType<
  typeof useNeighbourhoodExploreDialog
>

const NeighbourhoodExploreDialogContext =
  createContext<NeighbourhoodExploreDialogControl | null>(null)

type NeighbourhoodExploreDialogProviderProps = {
  buildingId: string | null | undefined
  children: ReactNode
  trackBrowserHistory?: boolean
}

export function NeighbourhoodExploreDialogProvider({
  buildingId,
  children,
  trackBrowserHistory = false,
}: NeighbourhoodExploreDialogProviderProps) {
  const exploreNeighbourhood = useNeighbourhoodExploreDialog()

  return (
    <NeighbourhoodExploreDialogContext.Provider value={exploreNeighbourhood}>
      {children}

      <BuildingNeighbourhoodExploreModal
        buildingId={buildingId ?? null}
        isOpen={exploreNeighbourhood.isOpen}
        onClose={exploreNeighbourhood.close}
        trackBrowserHistory={trackBrowserHistory}
      />
    </NeighbourhoodExploreDialogContext.Provider>
  )
}

export function useNeighbourhoodExploreDialogContext() {
  return useContext(NeighbourhoodExploreDialogContext)
}
