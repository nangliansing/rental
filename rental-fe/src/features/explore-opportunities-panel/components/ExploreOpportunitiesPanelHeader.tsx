import { ChevronLeft, X } from "lucide-react"

import { useMediaQuery } from "@/hooks/useMediaQuery"
import { ModalDismissHeader } from "@/shared/components/navigation/ModalDismissHeader"
import {
  MODAL_DISMISS_BACK_BUTTON_CLASS,
  MODAL_DISMISS_CLOSE_BUTTON_CLASS,
  MODAL_DISMISS_INLINE_DESCRIPTION_CLASS,
  MODAL_DISMISS_INLINE_HEADER_CLASS,
  MODAL_DISMISS_INLINE_TITLE_CLASS,
} from "@/shared/components/navigation/modalDismissHeaderLayout"
import { cn } from "@/lib/utils"

import { EXPLORE_OPPORTUNITIES_PANEL_COPY } from "../copy"
import { useExploreOpportunitiesSelection } from "../context/ExploreOpportunitiesSelectionContext"
import { useExploreOpportunitiesSession } from "../context/ExploreOpportunitiesSessionContext"

export function ExploreOpportunitiesPanelHeader() {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const { closePanel } = useExploreOpportunitiesSession()
  const { mobilePage, showListPage, selectedOpportunityId } =
    useExploreOpportunitiesSelection()

  const showMobileDetailChrome =
    !isDesktop && mobilePage === "detail" && Boolean(selectedOpportunityId)

  if (showMobileDetailChrome) {
    return (
      <div
        className={cn(
          MODAL_DISMISS_INLINE_HEADER_CLASS,
          "shrink-0 border-b border-slate-100",
        )}
      >
        <button
          type="button"
          className={MODAL_DISMISS_BACK_BUTTON_CLASS}
          aria-label={EXPLORE_OPPORTUNITIES_PANEL_COPY.backToListAriaLabel}
          onClick={showListPage}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
        </button>

        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className={MODAL_DISMISS_INLINE_TITLE_CLASS}>
            {EXPLORE_OPPORTUNITIES_PANEL_COPY.title}
          </h2>
          <p className={MODAL_DISMISS_INLINE_DESCRIPTION_CLASS}>
            {EXPLORE_OPPORTUNITIES_PANEL_COPY.detailMobileSubtitle}
          </p>
        </div>

        <button
          type="button"
          className={MODAL_DISMISS_CLOSE_BUTTON_CLASS}
          aria-label={EXPLORE_OPPORTUNITIES_PANEL_COPY.closeAriaLabel}
          onClick={closePanel}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    )
  }

  return (
    <ModalDismissHeader
      className="shrink-0 border-b border-slate-100"
      title={EXPLORE_OPPORTUNITIES_PANEL_COPY.title}
      description={EXPLORE_OPPORTUNITIES_PANEL_COPY.description}
      closeLabel={EXPLORE_OPPORTUNITIES_PANEL_COPY.closeAriaLabel}
      onClose={closePanel}
    />
  )
}
