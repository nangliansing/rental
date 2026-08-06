import { Bookmark } from "lucide-react"

import { Button } from "@/components/ui/button"

import { useCommittedSaveMapSearch } from "../../hooks/useSaveMapSearch"
import { MAP_SAVE_SEARCH_ACTION } from "../agent-actions/agentMapActionsCopy"
import { ConfirmCreateSavedSearchModal } from "../agent-actions/ConfirmCreateSavedSearchModal"

/** Primary empty-state CTA for eligible users to watch the current search. */
export function EmptyResultsSaveSearchCta() {
  const {
    canSaveSearch,
    openSaveSearch,
    closeSaveSearch,
    savedSearchSnapshot,
    submittedFilters,
    isSaveSearchOpen,
  } = useCommittedSaveMapSearch()

  if (!canSaveSearch) return null

  return (
    <>
      <div className="mt-4 flex w-full max-w-[260px] flex-col items-center">
        <Button
          type="button"
          className="h-10 w-full rounded-full px-4"
          onClick={openSaveSearch}
        >
          <Bookmark className="mr-2 h-4 w-4" aria-hidden="true" />
          {MAP_SAVE_SEARCH_ACTION.title}
        </Button>
        <p className="mt-2 text-xs leading-4 text-slate-500">
          {MAP_SAVE_SEARCH_ACTION.emptyStateDescription}
        </p>
      </div>

      <ConfirmCreateSavedSearchModal
        isOpen={isSaveSearchOpen}
        snapshot={savedSearchSnapshot}
        filters={submittedFilters}
        onClose={closeSaveSearch}
      />
    </>
  )
}
