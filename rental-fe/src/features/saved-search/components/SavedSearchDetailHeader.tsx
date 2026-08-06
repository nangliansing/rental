import type { SavedSearch } from "@/features/saved-search/api"

import { SavedSearchDetailActionsMenu } from "./SavedSearchDetailActionsMenu"
import { SavedSearchStatusBadge } from "./SavedSearchStatusBadge"

type SavedSearchDetailHeaderProps = {
  savedSearch: SavedSearch
  actionsDisabled?: boolean
  onEditRequest: () => void
  onCloseRequest: () => void
  onDeleteRequest: () => void
}

export function SavedSearchDetailHeader({
  savedSearch,
  actionsDisabled = false,
  onEditRequest,
  onCloseRequest,
  onDeleteRequest,
}: SavedSearchDetailHeaderProps) {
  return (
    <header className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 text-lg font-semibold text-slate-950">
            {savedSearch.name}
          </h2>
          <SavedSearchStatusBadge status={savedSearch.status} />
        </div>
        {savedSearch.description?.trim() ? (
          <p className="mt-1.5 text-sm leading-6 text-slate-600">
            {savedSearch.description.trim()}
          </p>
        ) : null}
      </div>

      <SavedSearchDetailActionsMenu
        status={savedSearch.status}
        disabled={actionsDisabled}
        onEditRequest={onEditRequest}
        onCloseRequest={onCloseRequest}
        onDeleteRequest={onDeleteRequest}
      />
    </header>
  )
}
