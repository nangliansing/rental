import { ModalPortal } from "@/shared/components/ModalPortal"
import { useAccessibleModal } from "@/shared/hooks/useAccessibleModal"

import { NeighbourhoodExploreProvider } from "../NeighbourhoodExploreProvider"
import { useNeighbourhoodExplore } from "../NeighbourhoodExploreContext"
import { NeighbourhoodExploreAttribution } from "./NeighbourhoodExploreAttribution"
import { NeighbourhoodExploreBody } from "./NeighbourhoodExploreBody"
import { NeighbourhoodExploreHeader } from "./NeighbourhoodExploreHeader"

type BuildingNeighbourhoodExploreModalProps = {
  buildingId: string | null
  isOpen: boolean
  onClose: () => void
  trackBrowserHistory?: boolean
}

function NeighbourhoodExploreModalShell({
  onClose,
}: {
  onClose: () => void
}) {
  const { neighbourhood, showMap } = useNeighbourhoodExplore()

  return (
    <>
      <NeighbourhoodExploreHeader onClose={onClose} />
      <NeighbourhoodExploreBody />
      {neighbourhood && !showMap && (
        <NeighbourhoodExploreAttribution variant="footer" />
      )}
    </>
  )
}

export function BuildingNeighbourhoodExploreModal({
  buildingId,
  isOpen,
  onClose,
  trackBrowserHistory = false,
}: BuildingNeighbourhoodExploreModalProps) {
  const { containerRef, onBackdropClick, requestClose } =
    useAccessibleModal<HTMLElement>({
      isOpen,
      onClose,
      trackBrowserHistory,
    })

  if (!isOpen || !buildingId) return null

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-label="Explore neighbourhood"
        onClick={onBackdropClick}
      >
        <section
          ref={containerRef}
          tabIndex={-1}
          className="flex h-[min(720px,calc(100dvh-2rem))] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-slate-950 shadow-2xl"
        >
          <NeighbourhoodExploreProvider
            buildingId={buildingId}
            enabled={isOpen}
          >
            <NeighbourhoodExploreModalShell onClose={requestClose} />
          </NeighbourhoodExploreProvider>
        </section>
      </div>
    </ModalPortal>
  )
}
