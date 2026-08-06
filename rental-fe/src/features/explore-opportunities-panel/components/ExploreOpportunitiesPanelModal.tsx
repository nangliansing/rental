import { ResponsiveScreenModal } from "@/shared/components/modals/ResponsiveScreenModal"

import { ExploreOpportunitiesPanelProvider } from "../context/ExploreOpportunitiesPanelProvider"
import { EXPLORE_OPPORTUNITIES_PANEL_COPY } from "../copy"
import type { ExploreOpportunitiesPanelSession } from "../types"
import { ExploreOpportunitiesPanelBody } from "./ExploreOpportunitiesPanelBody"
import { ExploreOpportunitiesPanelHeader } from "./ExploreOpportunitiesPanelHeader"

type ExploreOpportunitiesPanelModalProps = {
  isOpen: boolean
  session: ExploreOpportunitiesPanelSession | null
  onClose: () => void
}

function ExploreOpportunitiesPanelShell() {
  return (
    <>
      <ExploreOpportunitiesPanelHeader />
      <ExploreOpportunitiesPanelBody />
    </>
  )
}

export function ExploreOpportunitiesPanelModal({
  isOpen,
  session,
  onClose,
}: ExploreOpportunitiesPanelModalProps) {
  if (!isOpen || !session) return null

  return (
    <ResponsiveScreenModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={EXPLORE_OPPORTUNITIES_PANEL_COPY.modalAriaLabel}
      size="wide"
      panelClassName="md:h-[min(860px,calc(100dvh-2rem))] md:max-w-5xl"
    >
      {({ requestClose }) => (
        <ExploreOpportunitiesPanelProvider
          session={session}
          onClose={requestClose}
        >
          <ExploreOpportunitiesPanelShell />
        </ExploreOpportunitiesPanelProvider>
      )}
    </ResponsiveScreenModal>
  )
}
